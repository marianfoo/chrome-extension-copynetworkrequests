// panel.js - Network Copier with multi-select, resizable columns, batch preview, 3-state sorting
"use strict";

// ============================================================
// DOM References
// ============================================================

const filterInput = document.getElementById("filter-input");
const methodFilter = document.getElementById("method-filter");
const showHttpCheckbox = document.getElementById("show-http");
const showWsCheckbox = document.getElementById("show-ws");
const prettyJsonCheckbox = document.getElementById("pretty-json");
const clearLogButton = document.getElementById("clear-log");
const clearSelectionButton = document.getElementById("clear-selection");
const copySelectedButton = document.getElementById("copy-selected");
const copyAllButton = document.getElementById("copy-all");
const tableBody = document.querySelector("#request-table tbody");
const tableHead = document.querySelector("#request-table thead");
const requestTable = document.getElementById("request-table");
const emptyState = document.getElementById("empty-state");
const summaryEl = document.getElementById("summary");
const statusEl = document.getElementById("status");
const clipboardFallback = document.getElementById("clipboard-fallback");

const panelLeft = document.getElementById("panel-left");
const panelRight = document.getElementById("panel-right");
const resizerH = document.getElementById("resizer-h");
const resizerV = document.getElementById("resizer-v");
const detailPayload = document.getElementById("detail-payload");
const detailResponse = document.getElementById("detail-response");
const payloadContent = document.getElementById("payload-content");
const responseContent = document.getElementById("response-content");
const copyPayloadBtn = document.getElementById("copy-payload");
const copyResponseBtn = document.getElementById("copy-response");

// ============================================================
// State
// ============================================================

let entries = [];
let selectedIndices = new Set();
let activeIndex = null;
let selectionAnchorIndex = null;
let sortColumn = null;
let sortDirection = null; // null = default, 'asc', 'desc'
const payloadCache = new WeakMap();
const batchOpsCache = new WeakMap();

// Performance: Limit max entries to prevent memory issues and slow rendering
const MAX_ENTRIES = 500;

// Performance: Throttle rendering to prevent CPU spikes during high-frequency requests
let renderPending = false;
let renderTimeout = null;
const RENDER_THROTTLE_MS = 100;

// Column widths and order - load from localStorage or use defaults
const STORAGE_KEY_COLUMNS = 'networkCopier_columnWidths';
const STORAGE_KEY_PANELS = 'networkCopier_panelSizes';
const STORAGE_KEY_COLUMN_ORDER = 'networkCopier_columnOrder';

// All available column keys (defines the "natural" order for inserting new columns)
const ALL_COLUMN_KEYS = ['icon', 'method', 'status', 'resourceType', 'name', 'url', 'size', 'time', 'payload'];
const DEFAULT_COLUMN_ORDER = ['icon', 'method', 'status', 'name', 'url', 'payload'];
const COLUMN_LABELS = {
  icon: 'Type Icon',
  method: 'Method',
  status: 'Status',
  name: 'Name',
  url: 'URL',
  payload: 'Payload Preview',
  resourceType: 'Resource Type',
  size: 'Size',
  time: 'Time'
};

let columnWidths = loadColumnWidths();
let panelSizes = loadPanelSizes();
let columnOrder = loadColumnOrder();

function loadColumnWidths() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_COLUMNS);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return { name: 120, url: 180, payload: 250 };
}

function saveColumnWidths() {
  try {
    localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(columnWidths));
  } catch (e) {}
}

function loadPanelSizes() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PANELS);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return { leftWidth: 55, payloadHeight: 50 }; // percentages
}

function savePanelSizes() {
  try {
    localStorage.setItem(STORAGE_KEY_PANELS, JSON.stringify(panelSizes));
  } catch (e) {}
}

function loadColumnOrder() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_COLUMN_ORDER);
    if (saved) {
      // Filter out any unknown column keys (from future/past versions)
      const parsed = JSON.parse(saved);
      const valid = parsed.filter(k => ALL_COLUMN_KEYS.includes(k));
      if (valid.length > 0) return valid;
    }
  } catch (e) {}
  // Default column order (only the original 6 columns visible by default)
  return [...DEFAULT_COLUMN_ORDER];
}

function saveColumnOrder() {
  try {
    localStorage.setItem(STORAGE_KEY_COLUMN_ORDER, JSON.stringify(columnOrder));
  } catch (e) {}
}

function applyPanelSizes() {
  panelLeft.style.width = panelSizes.leftWidth + '%';
  detailPayload.style.flex = `0 0 ${panelSizes.payloadHeight}%`;
  detailResponse.style.flex = '1';
}

// ============================================================
// Helpers
// ============================================================

function setStatus(msg, type = "ok") {
  statusEl.textContent = msg || "";
  statusEl.className = "status " + (msg ? type : "");
  if (msg) setTimeout(() => { if (statusEl.textContent === msg) statusEl.textContent = ""; }, 3000);
}

function updateSummary() {
  const filtered = getFilteredEntries();
  const httpCount = entries.filter(e => e.type === 'http').length;
  const wsCount = entries.filter(e => e.type === 'ws').length;
  const selectedCount = selectedIndices.size;
  summaryEl.textContent = `${httpCount} HTTP, ${wsCount} WS • ${filtered.length} shown${selectedCount ? ` • ${selectedCount} selected` : ''}`;
  clearSelectionButton.disabled = selectedCount === 0;
  copySelectedButton.disabled = selectedCount === 0;
  copyAllButton.disabled = filtered.length === 0;
}

function isBatchRequest(harEntry) {
  const url = harEntry.request?.url || '';
  const ct = getHeaderValue(harEntry.request?.headers, 'content-type') || '';
  return url.includes('$batch') || ct.includes('multipart/mixed');
}

function getHeaderValue(headers, name) {
  if (!headers) return null;
  const h = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : null;
}

/**
 * Decode a base64-encoded response body to a UTF-8 string.
 * Chrome's HAR API (harEntry.getContent) already decompresses gzip/br/deflate,
 * but returns the result as base64 when the content contains non-ASCII bytes.
 * We convert base64 → raw bytes → UTF-8 text via TextDecoder.
 */
function decodeBase64Body(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < bytes.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

function extractPayload(harEntry) {
  if (payloadCache.has(harEntry)) return payloadCache.get(harEntry);
  const req = harEntry.request;
  if (!req?.postData) { payloadCache.set(harEntry, ''); return ''; }
  let payload = req.postData.text || '';
  if (!payload && req.postData.params) {
    payload = req.postData.params.map(p => `${p.name}=${p.value}`).join('&');
  }
  payloadCache.set(harEntry, payload);
  return payload;
}

/**
 * Extract batch operations from payload (e.g., "GET ZZHandlingUnitType")
 */
function extractBatchOperations(harEntry) {
  if (batchOpsCache.has(harEntry)) return batchOpsCache.get(harEntry);
  
  const payload = extractPayload(harEntry);
  if (!payload) { batchOpsCache.set(harEntry, []); return []; }
  
  const operations = [];
  const regex = /(GET|POST|PUT|PATCH|DELETE|MERGE)\s+([^\s]+)\s+HTTP/gi;
  let match;
  
  while ((match = regex.exec(payload)) !== null) {
    operations.push({ method: match[1].toUpperCase(), url: match[2] });
  }
  
  batchOpsCache.set(harEntry, operations);
  return operations;
}

/**
 * Get the response body from a HAR entry.
 * harEntry.getContent(cb) calls cb(body, encoding) where encoding is "" for
 * plain text or "base64" when Chrome base64-encoded the (already decompressed)
 * response bytes. We decode base64 content back to a readable string.
 */
function getContent(harEntry) {
  return new Promise(resolve => {
    try {
      harEntry.getContent((body, encoding) => {
        if (!body) { resolve(""); return; }
        if (encoding === 'base64') {
          try { resolve(decodeBase64Body(body)); }
          catch { resolve(body); }
          return;
        }
        resolve(body);
      });
    }
    catch { resolve(""); }
  });
}

function formatJson(str) {
  if (!str || !prettyJsonCheckbox.checked) return str;
  // Try JSON formatting first
  try { return JSON.stringify(JSON.parse(str), null, 2); }
  catch {}
  // Try XML formatting as fallback
  const trimmed = str.trim();
  if (trimmed.startsWith('<')) {
    const formatted = formatXml(trimmed);
    if (formatted) return formatted;
  }
  return str;
}

/**
 * Pretty-print XML string with proper indentation.
 * Splits tags onto separate lines and applies hierarchical indentation.
 * Returns formatted XML string, or null if the input doesn't look like valid XML.
 */
function formatXml(str) {
  if (!str) return null;

  try {
    let formatted = '';
    let indent = 0;
    const INDENT = '  ';

    // Insert newlines between adjacent tags: >< → >\n<
    const xml = str.replace(/>\s*</g, '>\n<');
    const lines = xml.split('\n');

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Closing tag → decrease indent before writing
      if (line.startsWith('</')) {
        indent = Math.max(0, indent - 1);
      }

      formatted += INDENT.repeat(indent) + line + '\n';

      // Opening tag that is NOT self-closing, NOT closing,
      // NOT a processing instruction (<?…?>), NOT a comment/doctype (<!…>)
      if (line.startsWith('<') &&
          !line.startsWith('</') &&
          !line.startsWith('<?') &&
          !line.startsWith('<!') &&
          !line.endsWith('/>')) {
        // Handle inline content like <tag>text</tag> — no indent change
        const tagName = line.match(/^<([^\s/>]+)/);
        if (tagName) {
          const closingTag = `</${tagName[1]}>`;
          if (!line.includes(closingTag)) {
            indent++;
          }
        }
      }
    }

    return formatted.trimEnd() || null;
  } catch {
    return null;
  }
}

// ============================================================
// Syntax Highlighting
// ============================================================

/**
 * Syntax-highlight a formatted JSON string.
 * Returns an HTML string with span elements for different token types.
 */
function highlightJson(str) {
  return str.replace(
    /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false)\b|\b(null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    function(match, quoted, colon, bool, nul, num) {
      if (quoted) {
        const escaped = escapeHtml(quoted);
        return colon
          ? `<span class="hl-key">${escaped}</span>${colon}`
          : `<span class="hl-string">${escaped}</span>`;
      }
      if (bool) return `<span class="hl-boolean">${bool}</span>`;
      if (nul) return `<span class="hl-null">null</span>`;
      if (num !== undefined) return `<span class="hl-number">${num}</span>`;
      return match;
    }
  );
}

/**
 * Syntax-highlight a formatted XML string.
 * Walks through the string, identifies tags vs text content,
 * and wraps each token type in a colored span.
 */
function highlightXml(str) {
  let result = '';
  let i = 0;
  const len = str.length;

  while (i < len) {
    if (str[i] === '<') {
      // Find end of tag, respecting quoted attribute values
      let end = -1;
      let inQuote = false, qc = '';
      for (let j = i + 1; j < len; j++) {
        if (inQuote) { if (str[j] === qc) inQuote = false; }
        else if (str[j] === '"' || str[j] === "'") { inQuote = true; qc = str[j]; }
        else if (str[j] === '>') { end = j; break; }
      }
      if (end === -1) { result += escapeHtml(str.substring(i)); break; }
      result += colorizeTag(str.substring(i, end + 1));
      i = end + 1;
    } else {
      // Text content between tags
      const next = str.indexOf('<', i);
      result += escapeHtml(next === -1 ? str.substring(i) : str.substring(i, next));
      i = next === -1 ? len : next;
    }
  }

  return result;
}

/**
 * Colorize a single XML tag string (e.g. '<tag attr="val">').
 * Returns HTML with spans for bracket, tag name, attributes, and values.
 */
function colorizeTag(tag) {
  // Processing instruction: <?xml ...?>
  if (tag.startsWith('<?')) return `<span class="hl-xml-pi">${escapeHtml(tag)}</span>`;
  // Comment: <!--...-->
  if (tag.startsWith('<!--')) return `<span class="hl-xml-comment">${escapeHtml(tag)}</span>`;
  // DOCTYPE / CDATA
  if (tag.startsWith('<!')) return `<span class="hl-xml-pi">${escapeHtml(tag)}</span>`;

  // Regular opening/closing/self-closing tag
  const m = tag.match(/^(<\/?)([^\s/>]+)([\s\S]*?)(\/?>)$/);
  if (!m) return escapeHtml(tag);

  let html = `<span class="hl-xml-bracket">${escapeHtml(m[1])}</span>`;
  html += `<span class="hl-xml-tag">${escapeHtml(m[2])}</span>`;
  if (m[3]) {
    // Highlight attribute name="value" pairs; preserve surrounding whitespace
    html += m[3].replace(/([\w:.-]+)\s*=\s*("[^"]*"|'[^']*')/g, (_, n, v) =>
      `<span class="hl-xml-attr">${escapeHtml(n)}</span>=<span class="hl-xml-value">${escapeHtml(v)}</span>`
    );
  }
  html += `<span class="hl-xml-bracket">${escapeHtml(m[4])}</span>`;
  return html;
}

/**
 * Format and syntax-highlight content for the detail panel.
 * Tries JSON first, then XML, falls back to escaped plain text.
 * Returns an HTML string safe for innerHTML.
 */
function highlightContent(str) {
  if (!str) return '';
  if (!prettyJsonCheckbox.checked) return escapeHtml(str);

  // Try JSON
  try {
    const formatted = JSON.stringify(JSON.parse(str), null, 2);
    return highlightJson(formatted);
  } catch {}

  // Try XML
  const trimmed = str.trim();
  if (trimmed.startsWith('<')) {
    const formatted = formatXml(trimmed);
    if (formatted) return highlightXml(formatted);
  }

  return escapeHtml(str);
}

/**
 * Highlight pre-formatted text that may contain JSON blocks mixed with
 * separator lines (used for batch payload/response display).
 * Splits on ──── separator lines, highlights JSON blocks between them.
 */
function highlightPreformatted(str) {
  if (!str || !prettyJsonCheckbox.checked) return escapeHtml(str || '');

  // Split on separator lines (──── ... ────), keeping separators in result
  const parts = str.split(/(────[^\n]*────)/);

  return parts.map(part => {
    // Separator line — escape as plain text
    if (part.startsWith('────')) return escapeHtml(part);

    const trimmed = part.trim();
    if (!trimmed) return escapeHtml(part);

    // Try highlighting as JSON
    try {
      JSON.parse(trimmed);
      const leading = part.match(/^(\s*)/)[1];
      const trailing = part.match(/(\s*)$/)[1];
      return leading + highlightJson(trimmed) + trailing;
    } catch {}

    return escapeHtml(part);
  }).join('');
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '…' : str;
}

/**
 * Escape HTML entities to prevent XSS when using innerHTML
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Decode URL-encoded strings safely
 */
function urlDecode(str) {
  if (!str) return str;
  try {
    return decodeURIComponent(str.replace(/\+/g, ' '));
  } catch (e) {
    return str;
  }
}

function getMethodClass(method) {
  const m = (method || '').toLowerCase();
  return 'method-' + (['get','post','put','patch','delete','ws'].includes(m) ? m : 'other');
}

function getStatusClass(status) {
  if (status >= 200 && status < 300) return 'status-2xx';
  if (status >= 300 && status < 400) return 'status-3xx';
  if (status >= 400 && status < 500) return 'status-4xx';
  if (status >= 500) return 'status-5xx';
  return '';
}

function getEntryName(entry) {
  if (entry.type === 'ws') return 'WebSocket';
  const url = entry.data.request.url;
  const name = url.split('/').pop().split('?')[0];
  return name || 'request';
}

function getEntryUrl(entry) {
  if (entry.type === 'ws') return entry.data.url || '';
  return entry.data.request.url.replace(/^https?:\/\/[^/]+/, '');
}

/**
 * Get payload preview - for batch requests, show operations like "GET ZZHandlingUnitType"
 * URLs are decoded for readability
 */
function getPayloadPreview(entry) {
  if (entry.type === 'ws') return entry.data.data || '';
  
  const harEntry = entry.data;
  
  if (isBatchRequest(harEntry)) {
    const ops = extractBatchOperations(harEntry);
    if (ops.length > 0) {
      // Format: "GET Entity1 | POST Entity2" etc. - with decoded URLs
      return ops.map(op => `${op.method} ${urlDecode(op.url)}`).join(' | ');
    }
  }
  
  // Regular request - show JSON payload
  return extractPayload(harEntry);
}

// ============================================================
// Size & Time Formatting
// ============================================================

/**
 * Format a byte size for display (e.g. "1.2 kB", "3.4 MB").
 * Shows "(cache)" when transferSize is 0 (served from disk/memory cache).
 */
function formatSize(contentSize, transferSize) {
  if (transferSize === 0) return '(cache)';
  const size = (transferSize != null && transferSize > 0) ? transferSize
             : (contentSize != null && contentSize >= 0) ? contentSize : -1;
  if (size < 0) return '';
  if (size === 0) return '0 B';
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' kB';
  return (size / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Format a duration in milliseconds for display (e.g. "43 ms", "1.20 s").
 */
function formatTime(timeMs) {
  if (timeMs == null || timeMs < 0) return '';
  if (timeMs < 1) return '< 1 ms';
  if (timeMs < 1000) return Math.round(timeMs) + ' ms';
  return (timeMs / 1000).toFixed(2) + ' s';
}

/**
 * Get the numeric size value from an entry (for sorting).
 */
function getEntrySize(entry) {
  if (entry.type === 'ws') return entry.data.data ? entry.data.data.length : 0;
  const har = entry.data;
  const transfer = har.response._transferSize;
  if (transfer != null && transfer >= 0) return transfer;
  const content = har.response.content ? har.response.content.size : -1;
  return content >= 0 ? content : 0;
}

// ============================================================
// Filtering
// ============================================================

function matchesFilter(entry) {
  if (entry.type === 'http' && !showHttpCheckbox.checked) return false;
  if (entry.type === 'ws' && !showWsCheckbox.checked) return false;
  
  // Method filter (only applies to HTTP requests)
  const selectedMethod = methodFilter.value;
  if (selectedMethod && entry.type === 'http') {
    const entryMethod = entry.data.request.method.toUpperCase();
    if (entryMethod !== selectedMethod) return false;
  }
  
  // WebSocket always shows if checkbox is on (not filtered by text or method)
  if (entry.type === 'ws') return true;
  
  const filter = filterInput.value.trim().toLowerCase();
  if (!filter) return true;
  
  const harEntry = entry.data;
  const payloadPreview = getPayloadPreview(entry);
  const searchText = [
    harEntry.request.url,
    harEntry.request.method,
    String(harEntry.response.status),
    getEntryName(entry),
    payloadPreview,
    extractPayload(harEntry)
  ].join(' ').toLowerCase();
  
  return searchText.includes(filter);
}

function getFilteredEntries() {
  let filtered = entries.filter(matchesFilter);
  
  // Apply sorting only if sortColumn and sortDirection are set
  if (sortColumn && sortDirection) {
    filtered.sort((a, b) => {
      let valA, valB;
      
      switch (sortColumn) {
        case 'method':
          valA = a.type === 'http' ? a.data.request.method : 'WS';
          valB = b.type === 'http' ? b.data.request.method : 'WS';
          break;
        case 'status':
          valA = a.type === 'http' ? a.data.response.status : 0;
          valB = b.type === 'http' ? b.data.response.status : 0;
          break;
        case 'name':
          valA = getEntryName(a);
          valB = getEntryName(b);
          break;
        case 'url':
          valA = getEntryUrl(a);
          valB = getEntryUrl(b);
          break;
        case 'resourceType':
          valA = a.type === 'http' ? (a.data._resourceType || '') : 'websocket';
          valB = b.type === 'http' ? (b.data._resourceType || '') : 'websocket';
          break;
        case 'size':
          valA = getEntrySize(a);
          valB = getEntrySize(b);
          break;
        case 'time':
          valA = a.type === 'http' ? (a.data.time || 0) : 0;
          valB = b.type === 'http' ? (b.data.time || 0) : 0;
          break;
        default:
          return 0;
      }
      
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }
  
  return filtered;
}

function getVisibleIndices() {
  return getFilteredEntries().map(entry => entries.indexOf(entry));
}

function getRangeIndices(anchorIndex, targetIndex) {
  const visibleIndices = getVisibleIndices();
  const anchorPos = visibleIndices.indexOf(anchorIndex);
  const targetPos = visibleIndices.indexOf(targetIndex);
  
  if (anchorPos === -1 || targetPos === -1) return [targetIndex];
  
  const start = Math.min(anchorPos, targetPos);
  const end = Math.max(anchorPos, targetPos);
  return visibleIndices.slice(start, end + 1);
}

function getFirstSelectedIndex() {
  const selected = Array.from(selectedIndices).sort((a, b) => a - b);
  return selected.length > 0 ? selected[0] : null;
}

// ============================================================
// Sorting (3-state: asc → desc → default)
// ============================================================

function handleSort(column) {
  if (sortColumn === column) {
    // Cycle through: asc → desc → null (default)
    if (sortDirection === 'asc') {
      sortDirection = 'desc';
    } else if (sortDirection === 'desc') {
      sortColumn = null;
      sortDirection = null;
    }
  } else {
    sortColumn = column;
    sortDirection = 'asc';
  }
  
  updateSortIndicators();
  renderTable();
}

function updateSortIndicators() {
  tableHead.querySelectorAll('th').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === sortColumn && sortDirection) {
      th.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

// ============================================================
// Table Rendering
// ============================================================

/**
 * Schedule a throttled render to prevent CPU spikes during high-frequency updates.
 * Multiple calls within RENDER_THROTTLE_MS will be coalesced into one render.
 */
function scheduleRender() {
  if (renderPending) return;
  
  renderPending = true;
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => {
    renderPending = false;
    renderTable();
  }, RENDER_THROTTLE_MS);
}

function renderTable() {
  tableBody.innerHTML = "";
  const filtered = getFilteredEntries();
  
  // Apply column widths
  applyColumnWidths();
  
  filtered.forEach((entry) => {
    const originalIndex = entries.indexOf(entry);
    const tr = document.createElement("tr");
    tr.dataset.index = originalIndex;
    if (selectedIndices.has(originalIndex)) tr.classList.add("selected");
    
    if (entry.type === 'http') {
      renderHttpRow(tr, entry.data, entry);
    } else {
      renderWsRow(tr, entry.data);
    }
    
    tr.onclick = (event) => selectEntry(originalIndex, event);
    tableBody.appendChild(tr);
  });
  
  emptyState.classList.toggle("visible", filtered.length === 0);
  copyAllButton.disabled = filtered.length === 0;
  updateSummary();
}

/**
 * Build row HTML from a column-data map, respecting the current column order.
 */
function buildRowHtml(columnData) {
  let html = '';
  for (const key of columnOrder) {
    if (columnData[key]) html += columnData[key];
  }
  return html;
}

function renderHttpRow(tr, harEntry, entry) {
  const url = harEntry.request.url;
  const shortUrl = url.replace(/^https?:\/\/[^/]+/, '');
  const name = url.split('/').pop().split('?')[0] || 'request';
  const isBatch = isBatchRequest(harEntry);
  const payloadPreview = getPayloadPreview(entry);
  
  // Escape all user-provided data to prevent XSS
  const escapedMethod = escapeHtml(harEntry.request.method);
  const escapedName = escapeHtml(name);
  const escapedUrl = escapeHtml(url);
  const escapedShortUrl = escapeHtml(shortUrl);
  const escapedPayload = escapeHtml(payloadPreview);
  const escapedPayloadTitle = escapeHtml(payloadPreview.substring(0, 300));

  // Extra column data: resource type, size, time
  const resType = harEntry._resourceType || '';
  const contentSize = harEntry.response.content ? harEntry.response.content.size : -1;
  const transferSize = harEntry.response._transferSize;
  const sizeDisplay = formatSize(contentSize, transferSize);
  const timeDisplay = formatTime(harEntry.time);

  tr.innerHTML = buildRowHtml({
    icon: `<td class="type-icon">${isBatch ? '📦' : '🌐'}</td>`,
    method: `<td><span class="method-badge ${getMethodClass(harEntry.request.method)}">${escapedMethod}</span></td>`,
    status: `<td class="${getStatusClass(harEntry.response.status)}">${harEntry.response.status || '-'}</td>`,
    name: `<td class="col-name-data" title="${escapedName}">${escapedName}</td>`,
    url: `<td class="col-url-data" title="${escapedUrl}">${escapedShortUrl}</td>`,
    payload: `<td class="col-payload-data payload-preview" title="${escapedPayloadTitle}">${escapedPayload}</td>`,
    resourceType: `<td class="col-resource-type-data">${escapeHtml(resType)}</td>`,
    size: `<td class="col-size-data">${escapeHtml(sizeDisplay)}</td>`,
    time: `<td class="col-time-data">${escapeHtml(timeDisplay)}</td>`
  });
}

function renderWsRow(tr, wsData) {
  const dir = wsData.direction === 'send' ? '⬆️' : '⬇️';
  const statusClass = wsData.direction === 'send' ? 'ws-send' : 'ws-recv';
  const statusText = wsData.direction === 'send' ? 'SEND' : 'RECV';
  const data = wsData.data || '';
  
  // Escape all user-provided data to prevent XSS
  const escapedUrl = escapeHtml(wsData.url || '');
  const escapedData = escapeHtml(data);
  const escapedDataTitle = escapeHtml(data.substring(0, 300));

  // Extra column data for WebSocket rows
  const wsSize = wsData.data ? wsData.data.length : 0;
  const wsSizeDisplay = wsSize > 0 ? formatSize(wsSize, null) : '';

  tr.innerHTML = buildRowHtml({
    icon: `<td class="type-icon">${dir}</td>`,
    method: `<td><span class="method-badge method-ws">WS</span></td>`,
    status: `<td class="${statusClass}">${statusText}</td>`,
    name: `<td class="col-name-data">WebSocket</td>`,
    url: `<td class="col-url-data" title="${escapedUrl}">${escapedUrl}</td>`,
    payload: `<td class="col-payload-data payload-preview" title="${escapedDataTitle}">${escapedData}</td>`,
    resourceType: `<td class="col-resource-type-data">websocket</td>`,
    size: `<td class="col-size-data">${escapeHtml(wsSizeDisplay)}</td>`,
    time: `<td class="col-time-data">-</td>`
  });
}

function applyColumnWidths() {
  // Fixed-width columns and their pixel sizes
  const fixedWidths = { icon: 32, method: 55, status: 50, resourceType: 70, size: 75, time: 70 };

  // Sum up fixed widths for visible columns only
  let fixedTotal = 0;
  columnOrder.forEach(col => { if (fixedWidths[col]) fixedTotal += fixedWidths[col]; });

  // Resizable columns — apply inline width to <th> elements
  const resizableCols = { name: '.col-name', url: '.col-url', payload: '.col-payload' };
  let resizableTotal = 0;
  for (const [key, selector] of Object.entries(resizableCols)) {
    const th = tableHead.querySelector(selector);
    if (th) {
      th.style.width = columnWidths[key] + 'px';
      resizableTotal += columnWidths[key];
    }
  }

  // Set total table width so resizing one column doesn't affect others
  const totalWidth = fixedTotal + resizableTotal + 30;
  requestTable.style.width = totalWidth + 'px';
}

// ============================================================
// Column Resizing
// ============================================================

// Global state for column resizing
const colResizeState = {
  active: false,
  startX: 0,
  columnKey: null,
  thElement: null,
  startWidth: 0
};

// Named handlers so we can add them once (idempotent setup)
function _colResizeMousedown(e) {
  const resizer = e.target.closest('.col-resizer');
  if (!resizer) return;

  e.preventDefault();
  e.stopPropagation();

  const th = resizer.parentElement;
  colResizeState.thElement = th;
  colResizeState.columnKey = th.classList.contains('col-name') ? 'name' :
                             th.classList.contains('col-url') ? 'url' : 'payload';

  colResizeState.active = true;
  colResizeState.startX = e.clientX;
  // Get actual current width of the th element
  colResizeState.startWidth = th.offsetWidth;

  resizer.classList.add('active');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
}

function _colResizeMousemove(e) {
  if (!colResizeState.active || !colResizeState.thElement) return;

  const diff = e.clientX - colResizeState.startX;
  const newWidth = Math.max(60, colResizeState.startWidth + diff);

  // Update column width and recalculate table width
  columnWidths[colResizeState.columnKey] = newWidth;
  applyColumnWidths();
}

function _colResizeMouseup() {
  if (!colResizeState.active) return;

  // Remove active class from resizer
  const activeResizer = tableHead.querySelector('.col-resizer.active');
  if (activeResizer) activeResizer.classList.remove('active');

  colResizeState.active = false;
  colResizeState.thElement = null;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';

  // Save column widths to localStorage
  saveColumnWidths();
}

/**
 * Set up column resize listeners. Safe to call multiple times —
 * uses named functions so duplicate addEventListener calls are no-ops.
 */
function setupColumnResizers() {
  // Event delegation on the table head (named fn = idempotent)
  tableHead.addEventListener('mousedown', _colResizeMousedown);
  // Global mousemove / mouseup for column resize
  document.addEventListener('mousemove', _colResizeMousemove);
  document.addEventListener('mouseup', _colResizeMouseup);
}

// ============================================================
// Column Drag & Drop Reordering
// ============================================================

const dragState = {
  draggedColumn: null,
  draggedIndex: -1
};

function setupColumnDragAndDrop() {
  const headers = tableHead.querySelectorAll('th');

  headers.forEach((th, index) => {
    // Make headers draggable
    th.setAttribute('draggable', 'true');

    // Drag start
    th.addEventListener('dragstart', (e) => {
      // Don't interfere with column resizing
      if (e.target.classList.contains('col-resizer')) {
        e.preventDefault();
        return;
      }

      dragState.draggedColumn = th;
      dragState.draggedIndex = Array.from(headers).indexOf(th);

      th.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', th.innerHTML);
    });

    // Drag over
    th.addEventListener('dragover', (e) => {
      if (!dragState.draggedColumn) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const targetIndex = Array.from(headers).indexOf(th);
      if (targetIndex !== dragState.draggedIndex) {
        th.classList.add('drop-target');
      }
    });

    // Drag leave
    th.addEventListener('dragleave', () => {
      th.classList.remove('drop-target');
    });

    // Drop
    th.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!dragState.draggedColumn) return;

      const targetIndex = Array.from(headers).indexOf(th);

      if (dragState.draggedIndex !== targetIndex) {
        // Reorder columns
        reorderColumns(dragState.draggedIndex, targetIndex);
      }

      th.classList.remove('drop-target');
    });

    // Drag end
    th.addEventListener('dragend', () => {
      headers.forEach(h => {
        h.classList.remove('dragging', 'drop-target');
      });
      dragState.draggedColumn = null;
      dragState.draggedIndex = -1;
    });
  });
}

function reorderColumns(fromIndex, toIndex) {
  // Update column order array
  const movedColumn = columnOrder[fromIndex];
  columnOrder.splice(fromIndex, 1);
  columnOrder.splice(toIndex, 0, movedColumn);

  // Save to localStorage
  saveColumnOrder();

  // Re-render the table to reflect new order
  rebuildTableHeaders();
  renderTable();
}

function rebuildTableHeaders() {
  const headerRow = tableHead.querySelector('tr');

  // Build HTML string for all headers in order
  let headersHtml = '';
  const columnDefs = {
    icon: '<th class="col-icon">Type</th>',
    method: '<th class="col-method sortable" data-sort="method">Method<span class="sort-icon"></span></th>',
    status: '<th class="col-status sortable" data-sort="status">Status<span class="sort-icon"></span></th>',
    name: '<th class="col-name sortable resizable" data-sort="name">Name<span class="sort-icon"></span><div class="col-resizer"></div></th>',
    url: '<th class="col-url sortable resizable" data-sort="url">URL<span class="sort-icon"></span><div class="col-resizer"></div></th>',
    payload: '<th class="col-payload resizable">Payload Preview<div class="col-resizer"></div></th>',
    resourceType: '<th class="col-resource-type sortable" data-sort="resourceType">Resource<span class="sort-icon"></span></th>',
    size: '<th class="col-size sortable" data-sort="size">Size<span class="sort-icon"></span></th>',
    time: '<th class="col-time sortable" data-sort="time">Time<span class="sort-icon"></span></th>'
  };

  // Build headers in the stored order
  columnOrder.forEach(colKey => {
    if (columnDefs[colKey]) {
      headersHtml += columnDefs[colKey];
    }
  });

  // Set all headers at once
  headerRow.innerHTML = headersHtml;

  // Re-apply sort indicators if there's an active sort
  updateSortIndicators();

  // Re-setup event listeners
  setupColumnResizers();
  setupColumnDragAndDrop();
}

// ============================================================
// Column Visibility Context Menu
// ============================================================

/**
 * Right-click on the table header to toggle column visibility.
 * Shows a custom context menu with checkboxes for each available column.
 */
function createColumnContextMenu(x, y) {
  removeColumnContextMenu();

  const menu = document.createElement('div');
  menu.className = 'column-context-menu';
  menu.id = 'column-context-menu';

  const title = document.createElement('div');
  title.className = 'context-menu-title';
  title.textContent = 'Toggle Columns';
  menu.appendChild(title);

  ALL_COLUMN_KEYS.forEach(key => {
    const item = document.createElement('label');
    item.className = 'context-menu-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = columnOrder.includes(key);
    checkbox.dataset.column = key;

    checkbox.addEventListener('change', () => {
      toggleColumnVisibility(key, checkbox.checked);
    });

    const labelText = document.createTextNode(' ' + (COLUMN_LABELS[key] || key));
    item.appendChild(checkbox);
    item.appendChild(labelText);
    menu.appendChild(item);
  });

  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  document.body.appendChild(menu);

  // Adjust position if menu overflows the viewport
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    menu.style.left = (window.innerWidth - rect.width - 5) + 'px';
  }
  if (rect.bottom > window.innerHeight) {
    menu.style.top = (window.innerHeight - rect.height - 5) + 'px';
  }

  // Close menu on click outside (delayed to avoid immediate close)
  setTimeout(() => {
    document.addEventListener('click', _closeContextMenu);
    document.addEventListener('contextmenu', _closeContextMenu);
  }, 0);
}

function _closeContextMenu(e) {
  const menu = document.getElementById('column-context-menu');
  if (menu && !menu.contains(e.target)) {
    removeColumnContextMenu();
  }
}

function removeColumnContextMenu() {
  const existing = document.getElementById('column-context-menu');
  if (existing) existing.remove();
  document.removeEventListener('click', _closeContextMenu);
  document.removeEventListener('contextmenu', _closeContextMenu);
}

/**
 * Add or remove a column from the visible column order.
 * When adding, the column is inserted at its "natural" position based on ALL_COLUMN_KEYS.
 */
function toggleColumnVisibility(key, visible) {
  if (visible && !columnOrder.includes(key)) {
    // Insert at the natural position relative to existing visible columns
    const idealIndex = ALL_COLUMN_KEYS.indexOf(key);
    let insertAt = columnOrder.length;
    for (let i = 0; i < columnOrder.length; i++) {
      if (ALL_COLUMN_KEYS.indexOf(columnOrder[i]) > idealIndex) {
        insertAt = i;
        break;
      }
    }
    columnOrder.splice(insertAt, 0, key);
  } else if (!visible && columnOrder.includes(key)) {
    // Don't allow removing all columns
    if (columnOrder.length <= 1) return;
    columnOrder = columnOrder.filter(k => k !== key);
  }

  saveColumnOrder();
  rebuildTableHeaders();
  renderTable();

  // Update checkbox states in the still-open context menu
  const menu = document.getElementById('column-context-menu');
  if (menu) {
    menu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = columnOrder.includes(cb.dataset.column);
    });
  }
}

// Right-click on table header shows the column toggle menu
tableHead.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  createColumnContextMenu(e.clientX, e.clientY);
});

// ============================================================
// Selection & Detail View
// ============================================================

function isToggleSelectEvent(event) {
  return !!event && (event.metaKey || event.ctrlKey);
}

function clearDetailView() {
  payloadContent.textContent = 'Select a request to view payload';
  responseContent.textContent = 'Select a request to view response';
}

function resolveActiveIndex(referenceIndex = null) {
  if (selectedIndices.size === 0) return null;
  if (referenceIndex != null && selectedIndices.has(referenceIndex)) return referenceIndex;
  
  const visibleSelected = getVisibleIndices().filter(i => selectedIndices.has(i));
  if (visibleSelected.length > 0) return visibleSelected[0];
  
  return getFirstSelectedIndex();
}

async function renderActiveDetails() {
  if (activeIndex == null) return;
  
  const entry = entries[activeIndex];
  if (!entry) return;
  
  copySelectedButton.disabled = false;
  
  if (entry.type === 'http') {
    await showHttpDetails(entry.data);
  } else {
    showWsDetails(entry.data);
  }
}

async function selectEntry(index, event = null) {
  const entry = entries[index];
  if (!entry) return;
  
  const toggleSelection = isToggleSelectEvent(event);
  const rangeSelection = !!(event && event.shiftKey);
  
  if (rangeSelection) {
    const anchor = selectionAnchorIndex != null ? selectionAnchorIndex : (activeIndex != null ? activeIndex : index);
    const rangeIndices = getRangeIndices(anchor, index);
    
    if (toggleSelection) {
      rangeIndices.forEach(i => selectedIndices.add(i));
    } else {
      selectedIndices = new Set(rangeIndices);
    }
    
    if (selectionAnchorIndex == null) selectionAnchorIndex = anchor;
  } else if (toggleSelection) {
    if (selectedIndices.has(index)) {
      selectedIndices.delete(index);
    } else {
      selectedIndices.add(index);
    }
    selectionAnchorIndex = index;
  } else {
    selectedIndices = new Set([index]);
    selectionAnchorIndex = index;
  }
  
  activeIndex = selectedIndices.has(index) ? index : resolveActiveIndex(index);
  
  if (selectedIndices.size === 0 || activeIndex == null) {
    deselectEntry();
    return;
  }
  
  renderTable();
  await renderActiveDetails();
}

function deselectEntry() {
  selectedIndices = new Set();
  activeIndex = null;
  selectionAnchorIndex = null;
  clearDetailView();
  renderTable();
}

async function showHttpDetails(harEntry) {
  const payload = extractPayload(harEntry);
  const url = harEntry.request.url;
  const method = harEntry.request.method;
  
  if (isBatchRequest(harEntry)) {
    payloadContent.innerHTML = highlightPreformatted(formatBatchPayload(payload));
  } else {
    // For regular requests, show method + decoded URL, then highlighted body
    const decodedUrl = urlDecode(url);
    const shortUrl = decodedUrl.replace(/^https?:\/\/[^/]+/, '');
    const headerLine = `──── ${method} ${shortUrl} ────\n`;
    payloadContent.innerHTML = escapeHtml(headerLine) + (payload ? highlightContent(payload) : escapeHtml('(no body)'));
  }
  
  responseContent.textContent = 'Loading...';
  const responseBody = await getContent(harEntry);
  
  if (isBatchRequest(harEntry)) {
    // Panel display: show only bodies without status headers (status is in the table)
    const bodies = extractBatchResponseBodies(responseBody);
    if (bodies.length === 0) {
      responseContent.innerHTML = responseBody ? escapeHtml(responseBody) : escapeHtml('(empty)');
    } else {
      const separator = `\n<span style="color:#404040">${escapeHtml('─'.repeat(50))}</span>\n\n`;
      responseContent.innerHTML = bodies
        .map(b => b ? highlightContent(b) : escapeHtml('(no body)'))
        .join(bodies.length > 1 ? separator : '');
    }
  } else {
    responseContent.innerHTML = responseBody ? highlightContent(responseBody) : escapeHtml('(empty)');
  }
}

function showWsDetails(wsData) {
  payloadContent.innerHTML = wsData.direction === 'send' 
    ? (wsData.data ? highlightContent(wsData.data) : escapeHtml('(empty)'))
    : escapeHtml('(WebSocket received - see response)');
  
  responseContent.innerHTML = wsData.direction === 'receive'
    ? (wsData.data ? highlightContent(wsData.data) : escapeHtml('(empty)'))
    : escapeHtml('(WebSocket sent - see payload)');
}

// ============================================================
// Batch Formatting
// ============================================================

function formatBatchPayload(payload) {
  if (!payload) return '(empty)';
  
  const lines = [];
  const regex = /(GET|POST|PUT|PATCH|DELETE|MERGE)\s+([^\s]+)\s+HTTP/gi;
  let match;
  const positions = [];
  
  while ((match = regex.exec(payload)) !== null) {
    positions.push({ index: match.index, method: match[1], url: match[2], full: match[0] });
  }
  
  if (positions.length === 0) return payload;
  
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const endIdx = i < positions.length - 1 ? positions[i + 1].index : payload.length;
    const section = payload.substring(pos.index + pos.full.length, endIdx);
    const jsonMatch = section.match(/\{[\s\S]*\}/);
    const body = jsonMatch ? jsonMatch[0] : '';
    
    // Decode URL for readability
    const decodedUrl = urlDecode(pos.url);
    lines.push(`──── ${pos.method} ${decodedUrl} ────`);
    lines.push(body ? formatJson(body) : '(no body)');
    lines.push('');
  }
  
  return lines.join('\n');
}

function formatBatchResponse(response) {
  if (!response) return '(empty)';
  
  const lines = [];
  const regex = /HTTP\/[\d.]+\s+(\d+)\s*([^\r\n]*)/gi;
  let match;
  const positions = [];
  
  while ((match = regex.exec(response)) !== null) {
    positions.push({ index: match.index, status: match[1], text: match[2], full: match[0] });
  }
  
  if (positions.length === 0) return response;
  
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const endIdx = i < positions.length - 1 ? positions[i + 1].index : response.length;
    const section = response.substring(pos.index + pos.full.length, endIdx);
    const jsonMatch = section.match(/\{[\s\S]*?\}(?=\s*(?:--|$|\r?\n--))/);
    const body = jsonMatch ? jsonMatch[0] : '';
    
    lines.push(`──── Response ${pos.status} ${pos.text} ────`);
    lines.push(body ? formatJson(body) : '(no body)');
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Extract raw body strings from a batch response (no status headers).
 * Used for panel display where status is already visible in the table.
 * Returns an array of raw body strings.
 */
function extractBatchResponseBodies(response) {
  if (!response) return [];

  const regex = /HTTP\/[\d.]+\s+(\d+)\s*([^\r\n]*)/gi;
  let match;
  const positions = [];

  while ((match = regex.exec(response)) !== null) {
    positions.push({ index: match.index, full: match[0] });
  }

  if (positions.length === 0) return [];

  const bodies = [];
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const endIdx = i < positions.length - 1 ? positions[i + 1].index : response.length;
    const section = response.substring(pos.index + pos.full.length, endIdx);
    const jsonMatch = section.match(/\{[\s\S]*?\}(?=\s*(?:--|$|\r?\n--))/);
    bodies.push(jsonMatch ? jsonMatch[0] : '');
  }

  return bodies;
}

// ============================================================
// Clipboard
// ============================================================

async function copyToClipboard(text) {
  // Method 1: Copy via inspected page (most reliable in DevTools panels,
  // where navigator.clipboard is blocked by Permissions-Policy)
  try {
    const jsonText = JSON.stringify(text);
    const result = await new Promise((resolve) => {
      chrome.devtools.inspectedWindow.eval(
        `(function() {
          try {
            const text = ${jsonText};
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
          } catch(e) { return false; }
        })()`,
        (result, err) => resolve(!err && result)
      );
    });
    if (result) return true;
  } catch (e) {
    console.log('Inspected page copy failed:', e);
  }
  
  // Method 2: Fallback using textarea in panel
  try {
    clipboardFallback.value = text;
    clipboardFallback.style.position = 'fixed';
    clipboardFallback.style.left = '0';
    clipboardFallback.style.top = '0';
    clipboardFallback.focus();
    clipboardFallback.select();
    const ok = document.execCommand('copy');
    clipboardFallback.style.left = '-9999px';
    if (ok) return true;
  } catch (e) {
    console.log('Panel copy failed:', e);
  }
  
  // Method 3: Clipboard API (usually blocked in DevTools panels by
  // Permissions-Policy, but kept as a last attempt before giving up)
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    // Silently ignore — Clipboard API is expected to fail in DevTools panels
  }
  
  // Last resort: log to console
  console.log('=== COPY FAILED - Text logged below ===');
  console.log(text);
  return false;
}

async function formatEntryForCopy(entry) {
  let text = '';
  
  if (entry.type === 'http') {
    const harEntry = entry.data;
    const payload = extractPayload(harEntry);
    const response = await getContent(harEntry);
    
    text = `═══════════════════════════════════════════════════════════════\n`;
    text += `REQUEST: ${harEntry.request.method} ${harEntry.request.url}\n`;
    text += `═══════════════════════════════════════════════════════════════\n\n`;
    
    if (isBatchRequest(harEntry)) {
      text += formatBatchPayload(payload);
    } else {
      text += `Payload:\n${formatJson(payload) || '(empty)'}\n`;
    }
    
    text += `\n───────────────────────────────────────────────────────────────\n`;
    text += `RESPONSE: ${harEntry.response.status} ${harEntry.response.statusText || ''}\n`;
    text += `───────────────────────────────────────────────────────────────\n\n`;
    
    if (isBatchRequest(harEntry)) {
      text += formatBatchResponse(response);
    } else {
      text += formatJson(response) || '(empty)';
    }
  } else {
    text = `═══════════════════════════════════════════════════════════════\n`;
    text += `WEBSOCKET ${entry.data.direction.toUpperCase()}\n`;
    text += `═══════════════════════════════════════════════════════════════\n\n`;
    text += formatJson(entry.data.data) || '(empty)';
  }
  
  return text;
}

function getSelectedEntriesForCopy() {
  const visibleIndices = getVisibleIndices();
  const visibleSelected = visibleIndices.filter(index => selectedIndices.has(index));
  const hiddenSelected = Array.from(selectedIndices)
    .filter(index => !visibleIndices.includes(index))
    .sort((a, b) => a - b);
  
  return [...visibleSelected, ...hiddenSelected]
    .map(index => entries[index])
    .filter(Boolean);
}

async function copySelected() {
  const selectedEntries = getSelectedEntriesForCopy();
  if (selectedEntries.length === 0) return;
  
  const count = selectedEntries.length;
  setStatus(count === 1 ? "Copying..." : `Copying ${count}...`, "ok");
  
  const parts = [];
  for (const entry of selectedEntries) {
    parts.push(await formatEntryForCopy(entry));
  }
  const text = parts.join('\n\n\n');
  
  if (await copyToClipboard(text)) {
    setStatus(count === 1 ? "✓ Copied!" : `✓ ${count} copied!`, "ok");
  } else {
    setStatus("✗ Copy failed", "error");
    console.log("Copy text:", text);
  }
}

async function copyAllFiltered() {
  const filtered = getFilteredEntries();
  if (filtered.length === 0) return;
  
  setStatus(`Copying ${filtered.length}...`, "ok");
  
  const parts = [];
  for (const entry of filtered) {
    parts.push(await formatEntryForCopy(entry));
  }
  
  const text = parts.join('\n\n\n');
  
  if (await copyToClipboard(text)) {
    setStatus(`✓ ${filtered.length} copied!`, "ok");
  } else {
    setStatus("✗ Copy failed", "error");
    console.log("Copy text:", text);
  }
}

// ============================================================
// Panel Resizers
// ============================================================

function setupPanelResizers() {
  let isResizing = false;
  let currentResizer = null;
  
  resizerH.onmousedown = (e) => {
    isResizing = true;
    currentResizer = 'h';
    resizerH.classList.add('active');
    document.body.classList.add('resizing');
    e.preventDefault();
  };
  
  resizerV.onmousedown = (e) => {
    isResizing = true;
    currentResizer = 'v';
    resizerV.classList.add('active');
    document.body.classList.add('resizing-v');
    e.preventDefault();
  };
  
  document.onmousemove = (e) => {
    if (!isResizing) return;
    
    if (currentResizer === 'h') {
      const rect = panelLeft.parentElement.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      if (pct > 20 && pct < 80) {
        panelLeft.style.width = pct + '%';
        panelSizes.leftWidth = pct;
      }
    } else {
      const rect = panelRight.getBoundingClientRect();
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      if (pct > 15 && pct < 85) {
        detailPayload.style.flex = `0 0 ${pct}%`;
        detailResponse.style.flex = '1';
        panelSizes.payloadHeight = pct;
      }
    }
  };
  
  document.onmouseup = () => {
    if (isResizing) {
      isResizing = false;
      resizerH.classList.remove('active');
      resizerV.classList.remove('active');
      document.body.classList.remove('resizing', 'resizing-v');
      // Save panel sizes to localStorage
      savePanelSizes();
    }
  };
}

// ============================================================
// Events
// ============================================================

let filterTimeout = null;
filterInput.oninput = () => {
  clearTimeout(filterTimeout);
  filterTimeout = setTimeout(renderTable, 150);
};

methodFilter.onchange = renderTable;
showHttpCheckbox.onchange = renderTable;
showWsCheckbox.onchange = renderTable;
prettyJsonCheckbox.onchange = () => {
  if (activeIndex != null) renderActiveDetails();
};

clearLogButton.onclick = () => {
  entries = [];
  selectedIndices = new Set();
  activeIndex = null;
  selectionAnchorIndex = null;
  sortColumn = null;
  sortDirection = null;
  updateSortIndicators();
  clearDetailView();
  renderTable();
  setStatus("Cleared", "ok");
};

clearSelectionButton.onclick = () => {
  if (selectedIndices.size === 0) return;
  deselectEntry();
  setStatus("Selection cleared", "ok");
};

copySelectedButton.onclick = copySelected;
copyAllButton.onclick = copyAllFiltered;
copyPayloadBtn.onclick = async () => {
  if (await copyToClipboard(payloadContent.textContent)) setStatus("✓ Payload copied!", "ok");
};
copyResponseBtn.onclick = async () => {
  if (await copyToClipboard(responseContent.textContent)) setStatus("✓ Response copied!", "ok");
};

// Sort header clicks (but not on resizer)
tableHead.onclick = (e) => {
  if (e.target.classList.contains('col-resizer')) return;
  const th = e.target.closest('th.sortable');
  if (th && th.dataset.sort) {
    handleSort(th.dataset.sort);
  }
};

// Keyboard
document.onkeydown = (e) => {
  if (e.target.tagName === 'INPUT') return;
  
  if (e.key === 'Escape') {
    e.preventDefault();
    // Close column context menu if open, otherwise deselect
    const ctxMenu = document.getElementById('column-context-menu');
    if (ctxMenu) {
      removeColumnContextMenu();
      return;
    }
    deselectEntry();
  }
  
  if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedIndices.size > 0) {
    e.preventDefault();
    copySelected();
  }
  
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const filtered = getFilteredEntries();
    const indices = filtered.map(entry => entries.indexOf(entry));
    if (indices.length === 0) return;
    
    if (activeIndex == null) {
      selectEntry(indices[0]);
    } else {
      const pos = indices.indexOf(activeIndex);
      const currentPos = pos === -1 ? 0 : pos;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      const targetPos = Math.max(0, Math.min(currentPos + step, indices.length - 1));
      selectEntry(indices[targetPos]);
    }
    const activeRow = tableBody.querySelector(`tr[data-index="${activeIndex}"]`) || tableBody.querySelector('.selected');
    activeRow?.scrollIntoView({ block: 'nearest' });
  }
};

// ============================================================
// Network Listener
// ============================================================

/**
 * Add an entry and enforce the max entries limit.
 * When limit is exceeded, oldest entries are removed.
 */
function addEntry(entry) {
  entries.push(entry);
  
  // Enforce max entries limit to prevent memory issues
  if (entries.length > MAX_ENTRIES) {
    const removeCount = entries.length - MAX_ENTRIES;
    entries.splice(0, removeCount);
    
    const shiftedSelection = new Set();
    selectedIndices.forEach(index => {
      const shifted = index - removeCount;
      if (shifted >= 0) shiftedSelection.add(shifted);
    });
    selectedIndices = shiftedSelection;
    
    if (activeIndex != null) {
      activeIndex -= removeCount;
      if (activeIndex < 0) activeIndex = null;
    }
    
    if (selectionAnchorIndex != null) {
      selectionAnchorIndex -= removeCount;
      if (selectionAnchorIndex < 0) selectionAnchorIndex = null;
    }
    
    if (activeIndex == null) activeIndex = resolveActiveIndex();
    if (selectedIndices.size === 0) {
      activeIndex = null;
      selectionAnchorIndex = null;
      clearDetailView();
    }
  }
}

chrome.devtools.network.onRequestFinished.addListener((harEntry) => {
  addEntry({ type: 'http', data: harEntry });
  scheduleRender();
});

// ============================================================
// WebSocket Capture
// ============================================================

function setupWebSocketCapture() {
  const script = `
    (function() {
      if (window.__netCopyWS) return 'exists';
      window.__netCopyWS = [];
      const OrigWS = window.WebSocket;
      window.WebSocket = function(url, protocols) {
        const ws = protocols ? new OrigWS(url, protocols) : new OrigWS(url);
        ws.addEventListener('message', function(e) {
          try { window.__netCopyWS.push({ direction: 'receive', url: url, data: typeof e.data === 'string' ? e.data : '[Binary]', time: Date.now() }); } catch {}
        });
        const origSend = ws.send.bind(ws);
        ws.send = function(data) {
          try { window.__netCopyWS.push({ direction: 'send', url: url, data: typeof data === 'string' ? data : '[Binary]', time: Date.now() }); } catch {}
          return origSend(data);
        };
        return ws;
      };
      Object.assign(window.WebSocket, OrigWS);
      window.WebSocket.prototype = OrigWS.prototype;
      return 'ok';
    })();
  `;
  
  chrome.devtools.inspectedWindow.eval(script, (result, error) => {
    if (!error) pollWebSocket();
  });
}

function pollWebSocket() {
  setInterval(() => {
    chrome.devtools.inspectedWindow.eval(
      '(function(){ var m = window.__netCopyWS || []; window.__netCopyWS = []; return m; })()',
      (messages, error) => {
        if (!error && messages?.length > 0) {
          messages.forEach(msg => addEntry({ type: 'ws', data: msg }));
          scheduleRender();
        }
      }
    );
  }, 300);
}

// ============================================================
// Init
// ============================================================

rebuildTableHeaders(); // Apply saved column order (also sets up resizers + drag-and-drop)
applyColumnWidths();
applyPanelSizes();
setupPanelResizers();
setupWebSocketCapture();
renderTable();

// Display extension version from manifest in footer
try {
  const manifest = chrome.runtime.getManifest();
  const versionLabel = document.getElementById('version-label');
  if (versionLabel && manifest.version) {
    versionLabel.textContent = `v${manifest.version}`;
  }
} catch (e) {}

console.log('[NetworkCopier] Ready');
