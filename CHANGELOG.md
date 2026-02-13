# Changelog
All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog.

## [Unreleased]

## [1.3.0] - 2026-02-13
### Added
- feat: implement format selection and syntax highlighting for payload and response panels
- feat: enhance column customization with drag & drop and visibility options
- feat: add customizable column order with drag & drop (#2)
## [1.2.0] - 2026-02-10
### Added
- feat: add XML formatting, syntax highlighting, and version label
### Fixed
- fix: update clipboard copy methods for improved reliability in DevTools
- fix: improve batch response handling and clipboard functionality
- fix: decode base64-encoded response bodies from Chrome HAR API
## [1.1.0] - 2026-02-06
### Added
- feat: enhance multi-selection capabilities and update README
## [1.0.0] - 2026-02-05
### Added
- Initial release
- OData $batch request/response parsing
- WebSocket message capture
- Split-panel UI with resizable sections
- Column sorting and resizing
- URL decoding for readability
- Persistent layout preferences
- Copy selected or all filtered requests
- Performance optimizations (entry limits, throttled rendering)
