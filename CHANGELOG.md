# Change Log

All notable changes to the "hledger-formatter" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [1.0.3] - September 22, 2025

### Added
- Syntax highlighting for `!include` statements (closes #27)

## [1.0.2] - September 20, 2025

### Removed
- Unused color theme contribution from extension package to reduce bundle size

## [1.0.1] - September 20, 2025

### Fixed
- Update VS Code Marketplace URL to use correct publisher ID
- Fix package and publisher configuration

## [1.0.0] - September 20, 2025

### Added
- Configurable amount column position with `hledger-formatter.amountColumnPosition` setting (closes #16)
  - Default: 42 (preserves existing behavior)
  - Range: 20-100 for flexible alignment preferences
- Sort-on-save option for automatic journal sorting (closes #10)
- New file command to create monthly journal files with Cmd+N (closes #4)
- Sort journal entries by date command with Shift+Cmd+S (closes #1)
- Comment toggle functionality with Cmd+/ supporting smart block behavior (closes #5)
- Comprehensive syntax highlighting for hledger journal files (closes #6)
  - Hierarchical account coloring (5 levels of accounts)
  - Transaction status differentiation (reconciled/pending/unreconciled)
  - Project tag support with distinct colors
  - Support for indented and inline comments
- Initial release of hledger formatter
- Automatic alignment of account names and amounts
- Format on save support
- VS Code Format Document integration

### Fixed
- Ensures exactly one blank line between transaction entries (closes #3)
- Removes any blank lines at the start of the file (closes #2)
- Changed project name color from red to bright blue for better visibility
- Improved multi-comment toggle behavior with indentation preservation

### Changed
- Better multi-comment behavior with smart block selection
- Organized test files structure and updated documentation