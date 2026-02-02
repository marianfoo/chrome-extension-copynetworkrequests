// devtools.js
// Creates the custom "Network Copier" panel in Chrome DevTools

chrome.devtools.panels.create(
  "Network Copier",   // Panel title shown in DevTools tab
  "icons/icon16.png", // Icon path (optional)
  "panel.html",       // The UI for the panel
  function (panel) {
    // Optional: hook panel.onShown/onHidden for additional functionality
    // panel.onShown.addListener((window) => { ... });
    // panel.onHidden.addListener(() => { ... });
  }
);
















