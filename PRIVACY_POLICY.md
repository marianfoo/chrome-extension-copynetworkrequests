# Privacy Policy

**Network Request & Response Copier**  
*Last updated: February 2, 2026*

## Overview

Network Request & Response Copier is a Chrome DevTools extension that helps developers copy and format network request data for debugging purposes. This privacy policy explains how the extension handles data.

## Data Collection

**This extension does not collect any personal data.**

Specifically, the extension:

- Does **not** collect any personally identifiable information
- Does **not** track your browsing history
- Does **not** transmit any data to external servers
- Does **not** use analytics or tracking services
- Does **not** store any data outside of your browser

## Data Processing

The extension processes the following data **locally in your browser only**:

| Data Type | Purpose | Storage |
|-----------|---------|---------|
| Network request URLs | Display in DevTools panel | Memory only (not persisted) |
| Request headers | Display request details | Memory only |
| Request payloads | Display and copy functionality | Memory only |
| Response bodies | Display and copy functionality | Memory only |
| WebSocket messages | Display WebSocket traffic | Memory only |

All data is:
- Processed entirely within your browser
- Never transmitted to any external server
- Cleared when you close the DevTools panel or click "Clear"
- Limited to the most recent 500 entries to prevent memory issues

## Permissions

The extension requires the following permission:

| Permission | Purpose |
|------------|---------|
| `clipboardWrite` | Copy request data to your clipboard when you click "Copy" buttons |

## Data Sharing

**This extension does not share any data with third parties.**

No data leaves your browser. The extension operates entirely locally.

## Data Storage

The extension stores only user preferences (not user data) in your browser's local storage:

- Column width settings
- Panel size preferences

These preferences contain no personal or sensitive information.

## Remote Code

The extension uses `chrome.devtools.inspectedWindow.eval()` to:
1. Capture WebSocket messages from the inspected page
2. Provide clipboard functionality as a fallback method

No external or remote code is loaded. All code is bundled within the extension.

## Children's Privacy

This extension is a developer tool and is not directed at children under 13.

## Changes to This Policy

If we make changes to this privacy policy, we will update the "Last updated" date at the top of this document.

## Contact

If you have questions about this privacy policy, please open an issue on our GitHub repository:

https://github.com/marianfoo/chrome-extension-copynetworkrequests/issues

## Open Source

This extension is open source. You can review the complete source code at:

https://github.com/marianfoo/chrome-extension-copynetworkrequests
