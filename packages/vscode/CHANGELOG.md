# Change Log

All notable changes to the "hledger-formatter" extension will be documented in this file.

## [1.1.3]
- Fixed accepting an autocomplete suggestion not replacing the current content

## [1.1.2]
- Improved syntax highlighting for account name and amount to match Hledger (thank you @rainyrainyday!)

## [1.1.1]
- Support syntax-highlighting for arbitrary depth accounts (thank you @EthanOlpin)
- Support all valid commodity formats (again, thank you @EthanOlpin!)

## [1.1.0]

### Added
- Added balencing suggestions
  - Appears automatically when cursor is on a posting line without an amount
  - Calculates the exact amount needed based on other postings in the transaction
  - Respects all formatting settings (alignment, negative commodity style, indentation)
  - Accept suggestions with Tab key for fast data entry
  - Only suggests when exactly one posting is missing an amount (unambiguous)
  - Configurable via `hledger-formatter.suggestBalancingAmounts` setting (default: enabled)
- Added autocomplete suggestions
  - Includes standard hledger account categories (assets, liabilities, equity, revenues, income, expenses)
  - Automatically discovers accounts from all journal files in workspace (including `!include` directives)
  - Case-insensitive deduplication of standard categories with user accounts
  - Configurable casing for standard categories via `hledger-formatter.defaultAccountCategories` setting
  - Hierarchical account completion with colon (`:`) trigger character
- Added support for more comment formats (`comment` / `end comment` blocks, `;`, `#`, and `*`)

### Fixed
- Fixed format spacing on first row entries

## [1.0.5]

This update works to bring the extension defaults closer to HLedger’s, including date formats, spacing, and handling of the negative commodity sign.

### Added
- Configurable transaction date format (`hledger-formatter.dateFormat`)
  - Mixed date-format parsing in both the formatter and sorter so `/`, `-`, or `.` separators are recognised interchangeably
  - Syntax highlighting update to recognise dotted dates alongside slashes/dashes
- Default negative commodity style now matches `hledger print` (`$-`) via `hledger-formatter.negativeCommodityStyle`, with the previous `-$` layout still available through the same setting

### Changed
- `formatOnSave` and `sortOnSave` now default to `false`, aligning with hledger’s default
- Sorting consumes parsed date components but preserves the original string formatting so journals stay untouched unless formatting is requested

## [1.0.4] - September 24, 2025

- Removed unused test files from generated VSCode package
- Updated project to use MIT License. Enjoy!

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
