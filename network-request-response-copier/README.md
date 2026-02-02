# Network Request & Response Copier

A Chrome DevTools extension that lets you easily copy network request URLs, headers, payloads, and response bodies. **Features OData $batch parsing, WebSocket support, and a split-panel UI!**

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue) ![Manifest V3](https://img.shields.io/badge/Manifest-V3-green) ![Version](https://img.shields.io/badge/Version-1.0.0-orange)

## ✨ Features

### Core Features

- 📋 **Copy full request details** - URL, method, headers, payload, and response body
- 📦 **OData $batch support** - Parses batch requests and shows individual operations with payloads
- 🔌 **WebSocket messages** - Captures and displays WebSocket sent/received messages
- 🔍 **Advanced filtering** - Filter by URL, method, status, or payload content
- 🎨 **Pretty-print JSON** - Automatically format JSON responses
- 🌙 **Dark theme** - Matches Chrome DevTools aesthetic

### UI Features

- 📊 **Split-panel layout** - Request list on left, details on right (like Chrome Network tab)
- 🔧 **Resizable columns** - Drag column headers to resize Name, URL, and Payload columns
- 🔧 **Resizable panels** - Adjust the split between list and details, payload and response
- 💾 **Persistent layout** - Panel sizes and column widths are saved across sessions
- 📝 **URL decoding** - Encoded URLs are displayed decoded for readability
- ⚡ **Sortable columns** - Click headers to sort by Method, Status, Name, URL, or Payload

### Copy Options

- 📄 **Copy Selected** - Copy the currently selected request
- 📑 **Copy All Filtered** - Copy all visible/filtered requests at once
- 📋 **Copy Payload** - Copy just the request payload
- 📋 **Copy Response** - Copy just the response body

---

## 🚀 Installation (Developer Mode)

### Step 1: Download the Extension

Clone or download this repository:

```bash
git clone https://github.com/YOUR_USERNAME/chrome-extension-copynetworkrequests.git
```

Or download and extract the ZIP file.

### Step 2: Open Chrome Extensions

1. Open **Google Chrome**
2. Navigate to: `chrome://extensions/`
3. Or go to **Menu (⋮)** → **More Tools** → **Extensions**

### Step 3: Enable Developer Mode

Toggle **"Developer mode"** switch in the top-right corner.

### Step 4: Load the Extension

1. Click **"Load unpacked"**
2. Select the `network-request-response-copier` folder
3. Click **"Select"**

✅ You should now see **"Network Request & Response Copier"** in your extensions list!

---

## 📖 How to Use

### Opening the Panel

1. Open any webpage
2. Open **Chrome DevTools** (`F12` or `Ctrl+Shift+I` / `Cmd+Opt+I`)
3. Find the **"Network Copier"** tab in DevTools
4. Click to open

> **Tip:** You may need to scroll right in DevTools tabs or click `>>` to find it.

### Capturing Requests

- Requests are automatically captured when DevTools is open
- Interact with the page to see requests appear in the list

### Filtering

| Filter | Description |
|--------|-------------|
| **Text filter** | Search by URL, method, status code, or payload content |
| **Payload Include** | Only show requests containing this string in payload |
| **Payload Exclude** | Hide requests containing this string in payload |
| **Show HTTP** | Toggle HTTP requests visibility |
| **Show WS** | Toggle WebSocket messages visibility |

### Sorting

Click column headers to sort:

- **1st click** → Sort ascending (▲)
- **2nd click** → Sort descending (▼)
- **3rd click** → Reset to default order

### Resizing

- **Columns**: Drag the right edge of Name, URL, or Payload headers
- **Left/Right panels**: Drag the vertical divider
- **Payload/Response**: Drag the horizontal divider in the right panel

All sizes are automatically saved!

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate requests |
| `Enter` | Copy selected |
| `Ctrl/Cmd + C` | Copy selected |
| `Escape` | Deselect |

---

## 📤 Output Format

When you copy a request:

```text
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

```text
──── PATCH MockConfig('SCALE_WEIGHT') ────
{"ConfigValue":"1.716"}

──── PATCH MockConfig('SCALE_UNIT') ────
{"ConfigValue":"kg"}
```

---

## 🏪 Publishing to Chrome Web Store

### Prerequisites

1. **Google Developer Account** - Register at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. **One-time fee** - $5 USD registration fee
3. **Extension package** - ZIP file of the extension

### Step 1: Prepare the Package

Create a ZIP file containing all extension files:

```bash
cd network-request-response-copier
zip -r ../network-copier-v1.0.0.zip . -x "*.DS_Store" -x "*.git*"
```

**Required files in ZIP:**

```text
network-request-response-copier.zip
├── manifest.json
├── devtools.html
├── devtools.js
├── panel.html
├── panel.css
├── panel.js
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

### Step 2: Create Store Listing

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Click **"New Item"**
3. Upload your ZIP file
4. Fill in the listing details:

| Field | Suggested Value |
|-------|-----------------|
| **Name** | Network Request & Response Copier |
| **Summary** | DevTools panel to copy network requests with OData batch parsing and WebSocket support |
| **Category** | Developer Tools |
| **Language** | English |

### Step 3: Add Store Assets

You'll need:

| Asset | Size | Purpose |
|-------|------|---------|
| **Icon** | 128x128 px | Store listing icon |
| **Screenshot 1** | 1280x800 or 640x400 | Main UI screenshot |
| **Screenshot 2** | 1280x800 or 640x400 | Feature highlight |
| **Promotional tile** | 440x280 (optional) | Featured display |

**Screenshot suggestions:**

1. Extension panel showing requests list
2. Split view with payload and response
3. OData batch parsing example
4. Filtering in action

### Step 4: Privacy & Permissions

Fill in the privacy practices:

- **Single purpose**: "Copy and format network request data from Chrome DevTools"
- **Permissions justification**:
  - `clipboardWrite`: "Required to copy request data to clipboard"
- **Data usage**: "This extension does not collect, transmit, or store any user data"

### Step 5: Submit for Review

1. Review all information
2. Click **"Submit for Review"**
3. Wait for approval (usually 1-3 business days)

### After Publishing

- **Updates**: Upload new ZIP with incremented version in manifest.json
- **Reviews**: Monitor and respond to user feedback
- **Analytics**: Track installs and usage in the dashboard

---

## 🔧 Development

### File Structure

```text
network-request-response-copier/
├── manifest.json      # Extension configuration
├── devtools.html      # DevTools page bootstrap
├── devtools.js        # Creates the panel
├── panel.html         # Panel UI structure
├── panel.css          # Panel styles
├── panel.js           # Panel logic (main code)
├── icons/             # Extension icons
└── README.md          # This file
```

### Making Changes

1. Edit files as needed
2. Go to `chrome://extensions/`
3. Click the **refresh icon** (🔄) on the extension
4. Close and reopen DevTools

### Local Storage Keys

The extension stores preferences in localStorage:

| Key | Purpose |
|-----|---------|
| `networkCopier_columnWidths` | Column width settings |
| `networkCopier_panelSizes` | Panel split positions |

---

## 🐛 Troubleshooting

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

1. Modern Clipboard API
2. Legacy `execCommand`
3. Console logging as fallback

**To debug:**

1. Right-click in the Network Copier panel
2. Select "Inspect" to open DevTools-for-DevTools
3. Check Console for error messages

### Column resize not working?

- Make sure you're dragging the right edge of Name, URL, or Payload columns
- Look for the cursor to change to `↔`
- Try refreshing the extension

---

## 📄 License

MIT License - Feel free to modify and use as needed.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📝 Changelog

### v1.0.0

- Initial release
- OData $batch request/response parsing
- WebSocket message capture
- Split-panel UI with resizable sections
- Column sorting and resizing
- URL decoding for readability
- Persistent layout preferences
- Copy selected or all filtered requests
