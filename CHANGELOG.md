# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [1.4.0] - 2026-02-18
### Added
- Colorization for URL parameters in request payloads and batch separators (OData $filter, $select, etc.)
- Filter input clear button for quick reset
- Batch response handling: metadata first, sap-message, then response body with section dividers
- Response body divider (`──── response body ────`) to separate sap-message from JSON response
### Changed
- Batch response display order: metadata → sap-message → JSON body (raw batch kept at end in panel only)
- Removed raw batch response from copied output (avoids duplication)
- sap-message block now uses full visibility (removed reduced opacity)

## [1.3.1] - 2026-02-16
### Fixed
- Prevent column sorting from triggering immediately after column resize

## [1.3.0] - 2026-02-13
### Added
- Format selection dropdown for payload and response panels (Auto, JSON, JavaScript, TypeScript, CSS, XML, Text)
- Syntax highlighting for JSON, XML, JavaScript, TypeScript, and CSS
- Column drag & drop reordering
- Column visibility toggle via right-click context menu on table header
- License file (MIT)

## [1.2.0] - 2026-02-10
### Added
- XML formatting and syntax highlighting
- Version label in footer from manifest
- Detailed Chrome API setup and token expiration solutions (docs)
### Fixed
- Decode base64-encoded response bodies from Chrome HAR API
- Batch response handling and clipboard functionality
- Clipboard copy methods for improved reliability in DevTools panels
### Changed
- README updated for Edge extension publication

## [1.1.0] - 2026-02-06
### Added
- Multi-selection with Ctrl/Cmd-click and Shift-click range selection
- Publish gating with release-state.json
### Changed
- Release workflows combined into single manual workflow

## [1.0.1] - 2026-02-05
### Added
- deselectEntry function for clearing selection
- Improved clipboard copy method (inspected page fallback for DevTools)
### Changed
- README with Chrome Web Store link and cleaner structure
- Automated Chrome Web Store publishing

## [1.0.0] - 2026-02-05
### Added
- Initial release: Network Request & Response Copier Chrome extension
- OData $batch request/response parsing with multipart/mixed support
- WebSocket message capture (send/receive)
- Split-panel UI with resizable sections (horizontal and vertical)
- Column sorting (3-state: asc → desc → default) and resizing
- URL decoding for readability in payload preview and batch operations
- Persistent layout preferences (column widths, panel sizes, column order, filter)
- Copy selected or all filtered requests to clipboard
- Performance optimizations: entry limit (500), throttled rendering
- GitHub Actions workflow for release automation
- Comprehensive publishing guide for Chrome Web Store
- Privacy policy for Chrome Web Store compliance
### Fixed
- Manifest description length (108 chars, max 132)
