# Network Request & Response Copier

A Chrome DevTools extension that lets you easily copy network request URLs, headers, payloads, and response bodies. Features OData $batch parsing, WebSocket support, and a split-panel UI.

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/mphiaidjajmllkfkjlkfgmfkccpnomgc?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/network-request-response/mphiaidjajmllkfkjlkfgmfkccpnomgc)
[![Edge Add-ons](https://img.shields.io/badge/Edge%20Add--ons-available-blue)](https://microsoftedge.microsoft.com/addons/detail/network-request-respons/mmfhobojdlgibnffjhkidhdcjfbfhgpo)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)](https://developer.chrome.com/docs/extensions/mv3/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Install

**From Chrome Web Store:**

[**Install from Chrome Web Store**](https://chromewebstore.google.com/detail/network-request-response/mphiaidjajmllkfkjlkfgmfkccpnomgc)

**From Microsoft Edge Add-ons:**

[**Install from Edge Add-ons**](https://microsoftedge.microsoft.com/addons/detail/network-request-respons/mmfhobojdlgibnffjhkidhdcjfbfhgpo)

**From source (developer mode):**

1. Clone this repository
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `network-request-response-copier` folder

## Features

### Core Features

- **Copy full request details** - URL, method, headers, payload, and response body
- **OData $batch support** - Parses batch requests and shows individual operations with payloads
- **WebSocket messages** - Captures and displays WebSocket sent/received messages
- **Advanced filtering** - Filter by URL, method, status, or payload content
- **Pretty-print JSON** - Automatically format JSON responses
- **Dark theme** - Matches Chrome DevTools aesthetic

### UI Features

- **Split-panel layout** - Request list on left, details on right (like Chrome Network tab)
- **Resizable columns** - Drag column headers to resize Name, URL, and Payload columns
- **Resizable panels** - Adjust the split between list and details, payload and response
- **Persistent layout** - Panel sizes and column widths are saved across sessions
- **URL decoding** - Encoded URLs are displayed decoded for readability
- **Sortable columns** - Click headers to sort by Method, Status, Name, URL, or Payload
- **Multi-select rows** - Select multiple requests with Ctrl/Cmd-click and range selection

### Copy Options

- **Copy Selected** - Copy all currently selected requests (single or multi-select)
- **Clear Selection** - Remove current selection with one click
- **Copy All Filtered** - Copy all visible/filtered requests at once
- **Copy Payload** - Copy just the request payload
- **Copy Response** - Copy just the response body

## Usage

### Opening the Panel

1. Open any webpage
2. Open **Chrome DevTools** (`F12` or `Ctrl+Shift+I` / `Cmd+Opt+I`)
3. Find the **"Network Copier"** tab in DevTools
4. Click to open

> **Tip:** You may need to scroll right in DevTools tabs or click `>>` to find it.

### Capturing Requests

- Requests are automatically captured when DevTools is open
- Interact with the page to see requests appear in the list

### Selecting Requests

- **Click** - Select a single request
- **Ctrl/Cmd + Click** - Add or remove individual requests from selection
- **Shift + Click** - Select a contiguous range from the anchor row
- **Ctrl/Cmd + Shift + Click** - Add a contiguous range to the existing selection
- **Clear Selection button** - Clear all selected rows instantly

### Filtering

| Filter | Description |
|--------|-------------|
| **Text filter** | Search by URL, method, status code, or payload content |
| **Method filter** | Filter by HTTP method (GET, POST, etc.) |
| **Show HTTP** | Toggle HTTP requests visibility |
| **Show WS** | Toggle WebSocket messages visibility |

### Sorting

Click column headers to sort:

- **1st click** - Sort ascending
- **2nd click** - Sort descending
- **3rd click** - Reset to default order

### Keyboard & Mouse Shortcuts

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate requests |
| `Ctrl/Cmd + C` | Copy selected |
| `Ctrl/Cmd + Click` | Toggle row selection |
| `Shift + Click` | Select range |
| `Ctrl/Cmd + Shift + Click` | Add range to selection |
| `Escape` | Deselect |

## Output Format

When you copy a request:

```
═══════════════════════════════════════════════════════════════
REQUEST: POST https://api.example.com/data
═══════════════════════════════════════════════════════════════

Payload:
{
  "userId": 123,
  "action": "update"
}

───────────────────────────────────────────────────────────────
RESPONSE: 200 OK
───────────────────────────────────────────────────────────────

{
  "success": true,
  "data": { ... }
}
```

### OData Batch Format

For $batch requests, each operation is parsed separately:

```
──── PATCH MockConfig('SCALE_WEIGHT') ────
{"ConfigValue":"1.716"}

──── PATCH MockConfig('SCALE_UNIT') ────
{"ConfigValue":"kg"}
```

## Development

### File Structure

```
network-request-response-copier/
├── manifest.json      # Extension configuration
├── devtools.html      # DevTools page bootstrap
├── devtools.js        # Creates the panel
├── panel.html         # Panel UI structure
├── panel.css          # Panel styles
├── panel.js           # Panel logic (main code)
└── icons/             # Extension icons
```

### Making Changes

1. Edit files as needed
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension
4. Close and reopen DevTools

### Releasing Updates

This repository uses a single GitHub Actions workflow for automated releases:

1. Commit your changes with conventional commit messages (`feat:` or `fix:`)
2. Push to `main`
3. Go to **Actions** > **Release Browser Extension** > **Run workflow**
4. The workflow automatically bumps the version, updates `CHANGELOG.md`, creates a tag, GitHub Release, and publishes to Chrome Web Store and Edge Add-ons
5. If Chrome or Edge publishing fails, rerun the workflow -- it will retry the failed store(s) without creating a new version

See [PUBLISHING.md](PUBLISHING.md) for detailed publishing instructions.

## Troubleshooting

### Extension not in DevTools?

- Enable Developer mode in `chrome://extensions/`
- Reload the extension
- Close ALL DevTools windows and reopen

### No requests showing?

- Open DevTools BEFORE making requests
- Refresh the page with DevTools open
- Clear filters (check payload filters too)
- Make sure "Show HTTP" is checked

### Copy not working?

The extension tries multiple clipboard methods:

1. Via inspected page (most reliable)
2. Legacy `execCommand`
3. Console logging as fallback

To debug: Right-click in the Network Copier panel → "Inspect" → Check Console

## Privacy

This extension does not collect any personal data. All data processing happens locally in your browser.

See [Privacy Policy](PRIVACY_POLICY.md) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - Feel free to modify and use as needed.

## Changelog

### v1.1.0

- Added multi-selection for request rows (`Ctrl/Cmd + Click`)
- Added range selection (`Shift + Click`) and range add (`Ctrl/Cmd + Shift + Click`)
- Updated copy behavior so **Copy Selected** copies all selected rows
- Added a **Clear Selection** toolbar button to quickly deselect all rows

### v1.0.0

- Initial release
- OData $batch request/response parsing
- WebSocket message capture
- Split-panel UI with resizable sections
- Column sorting and resizing
- URL decoding for readability
- Persistent layout preferences
- Copy selected or all filtered requests
- Performance optimizations (entry limits, throttled rendering)
