# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VS Code extension called "hledger-formatter" that formats hledger journal files by aligning account names and amounts. It supports `.journal`, `.hledger`, and `.ledger` file extensions and provides comprehensive syntax highlighting.

## Development Commands

### Build and Development
- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode for development
- `npm run vscode:prepublish` - Prepare for publishing (runs compile)

### Testing
- `npm run test` - Run all tests (compiles, lints, copies test files, then runs tests)
- `npm run pretest` - Prepare for testing (compile + lint + copy test files)
- `npm run copy-test-files` - Copy test journal files to output directory

### Code Quality
- `npm run lint` - Run ESLint on the source code

## Architecture

### Core Components

1. **Main Extension (`src/extension.ts`)**:
   - `activate()` - Extension activation, registers commands and providers
   - `formatHledgerJournal()` - Main formatting function (exported for testing)
   - `formatTransaction()` - Formats individual transactions
   - `formatTransactionHeader()` - Normalizes transaction header spacing
   - `toggleCommentLines()` - Toggle comments on selected lines (exported for testing)
   - `sortHledgerJournal()` - Sorts journal entries by date (exported for testing)
   - `parseAmount()` - Parses amount strings and extracts value/currency (exported for testing)
   - `formatAmountValue()` - Formats numeric values with currency symbols (exported for testing)
   - `calculateBalancingAmount()` - Calculates balancing amounts for transactions (exported for testing)

2. **Command Registration**:
   - Manual format command: `hledger-formatter.formatDocument`
   - Comment toggle command: `hledger-formatter.toggleComment` (Cmd+/)
   - Sort entries command: `hledger-formatter.sortEntries` (Shift+Cmd+S)
   - New file command: `hledger-formatter.newFile` (Cmd+N when in .journal file)
   - Format-on-save handler for hledger files (includes optional sort-on-save)
   - Document formatting provider (integrates with VS Code's Format Document)
   - Range formatting provider

3. **Syntax Highlighting** (`syntaxes/hledger.tmLanguage.json`):
   - TextMate grammar for comprehensive syntax highlighting
   - Hierarchical account coloring (up to 5 levels)
   - Transaction status differentiation (reconciled/pending/unreconciled)
   - Project tag support (`project: name` or `project:name`)
   - Comment highlighting for all formats (`;`, `#`, `*`, and `comment` blocks)
   - Supports indented and inline comments
   - Amount and date highlighting

### Formatting Logic

The formatter aligns all amounts to a configurable column position (default: 42 characters from left):
- Uses exactly 2 spaces for posting line indentation
- Handles negative amounts by converting `$-X.XX` to `-$X.XX` format
- Preserves comments and transaction structure
- Normalizes transaction header spacing
- Column position is configurable via `hledger-formatter.amountColumnPosition` setting

### Comment Toggle Logic

The comment toggle feature (Cmd+/) uses smart block behavior and preserves indentation:

**Supported Comment Formats:**
All hledger comment formats are supported:
- `;` (semicolon) - Most common format, recommended for temporary commenting
- `#` (hash/pound) - Recommended for top-level notes
- `*` (asterisk) - Useful for Emacs org-mode users
- `comment`/`end comment` - Multi-line comment blocks (preserved during formatting)

The preferred comment character when toggling comments is configurable via `hledger-formatter.commentCharacter` setting (default: `;`).

**Smart Block Behavior:**
- Analyzes entire selection to determine if ANY lines are uncommented
- If any uncommented lines exist → comments ALL lines in selection using the configured character
- If all lines are commented → uncomments ALL lines in selection (detects any comment format)
- Eliminates alternating comment patterns in mixed selections

**Indentation Preservation:**
- Adds comment character and space after existing indentation rather than at line start
- Transaction headers: `2025-03-01 Transaction` → `; 2025-03-01 Transaction`
- Posting lines: `  Assets:Cash  $100.00` → `  ; Assets:Cash  $100.00`
- Maintains visual hierarchy when commenting/uncommenting
- Respects configured indentation width

**Example:**
```
Mixed state:
; 2025-07-31 * Transaction
  assets:checking $100.00    ← uncommented
  ; reconciliation note      ← commented

First toggle (comments all):
; 2025-07-31 * Transaction
  ; assets:checking $100.00   ← now commented
  ; reconciliation note       ← stays commented

Second toggle (uncomments all):
2025-07-31 * Transaction
  assets:checking $100.00     ← now uncommented
  reconciliation note         ← now uncommented
```

### New File Command

The new file command (Cmd+N when in a journal file) creates a new monthly journal file:

**Features:**
- Prompts for month selection (defaults to current month)
- Creates file with format: `MM-mmm.journal` (e.g., `09-sep.journal`)
- Adds a header comment with month/year and creation date
- Opens the newly created file in the editor
- Warns if file already exists and offers to open it

**Example:**
```
; September 2025 Journal
;
; Created on 2025-09-19

```

### Sort Entries Logic

The sort entries feature can be used manually (Shift+Cmd+S) or automatically on save:

**Key Features:**
- Sorts all transactions chronologically by date
- Preserves transaction integrity (keeps posting lines with their headers)
- Maintains leading comments and empty lines before first transaction
- Preserves spacing between transactions
- Handles various date formats (YYYY-MM-DD, YYYY/MM/DD)
- When `sortOnSave` is enabled, sorting happens before formatting on save
- Works independently or in combination with `formatOnSave`

**Example:**
```
Before:
2025-03-08 Transaction 2
  Assets:Cash  $200.00
  
2025-03-04 Transaction 1
  Assets:Cash  $100.00

After:
2025-03-04 Transaction 1
  Assets:Cash  $100.00
  
2025-03-08 Transaction 2
  Assets:Cash  $200.00
```

### Balancing Amount Suggestions

The extension provides inline ghost text suggestions for balancing amounts that can be accepted with Tab:

**Key Features:**
- **Automatic & Manual Triggering**: Ghost text appears automatically when cursor is on a posting line without an amount, can also be triggered manually
- **Smart Calculation**: Calculates what's needed to balance the entire transaction to zero
- **Conservative Approach**: Only suggests when exactly one posting lacks an amount (unambiguous)
- **Respects User Settings**: Uses configured `negativeCommodityStyle` for currency position (`$-` vs `-$`)
- **Configurable**: Can be enabled/disabled via `hledger-formatter.suggestBalancingAmounts` setting (default: true)

**Implementation Details:**
- Uses VS Code's `InlineCompletionItemProvider` API for ghost text
- Parses current transaction to find all postings with/without amounts
- Calculates sum of all existing amounts and suggests the negated sum
- Supports multiple currencies (suggests for single-currency transactions only)
- Handles various amount formats: `$100.00`, `-$100.00`, `$-100.00`, `€50.00`, etc.

**Example:**
```
2025-10-21 * Apple Developer Program
  expenses:software:developerfees  $104.45
  equity:owner:contributions       [Tab shows: -$104.45 in ghost text]
```

**Helper Functions:**
- `parseAmount(amountStr)` - Parses amount strings like "$100.50" or "-$50.00" and extracts numeric value and currency symbol
- `formatAmountValue(value, currency, style)` - Formats numeric values with currency, respecting the configured negative commodity style
- `calculateBalancingAmount(transaction, options)` - Core logic that calculates the balancing amount for a transaction
- `parseCurrentTransaction(document, lineNumber)` - Extracts all lines belonging to the current transaction

### Syntax Highlighting Features

The extension provides rich syntax highlighting with distinct colors for:

**Account Categories**: Each hierarchy level gets a unique color
- Level 1 (assets, expenses): Bold blue
- Level 2 (bank, food): Teal
- Level 3 (checking, groceries): Yellow
- Level 4 (personal, produce): Light blue
- Level 5: Purple

**Transaction Status**: Visual differentiation for transaction states
- Reconciled (`*`): Normal coloring
- Pending (`!`): Orange italic
- Unreconciled (no marker): Red italic - helps identify transactions needing reconciliation

**Project Tags**: Support for project tracking
- Format: `project: name` or `project:name`
- Can appear on separate lines or inline within descriptions
- Project keyword: Purple bold
- Project name: Bright blue bold italic

**Other Elements**:
- Comments: Green italic (supports indented and inline)
- Dates: Highlighted in YYYY-MM-DD or YYYY/MM/DD format
- Amounts: Numeric values with proper currency formatting

### Test Structure

Tests are in `src/test/` with input/output journal pairs:

**Formatting Tests:**
- `test_1_in.journal` / `test_1_out.journal` - Basic formatting
- `sample_in.journal` / `sample_out.journal` - Negative amounts handling
- `inconsistent_indents_in.journal` / `inconsistent_indents_out.journal` - Indentation correction
- `negative_amounts_in.journal` / `negative_amounts_out.journal` - Negative amount alignment

**Comment Toggle Tests:**
- `comment_simple_in.journal` / `comment_simple_out.journal` - Basic comment toggling
- `comment_mixed_in.journal` / `comment_mixed_out.journal` - Mixed commented/uncommented lines with smart block behavior
- `comment_indented_in.journal` / `comment_indented_out.journal` - Complex indentation scenarios
- Unit tests for smart block behavior with mixed comment states

**Sort Tests:**
- `sort_in.journal` / `sort_out.journal` - Sorting transactions by date
- Unit tests for transaction integrity and comment preservation

**Balancing Amount Tests:**
- Unit tests for `parseAmount()` - Various amount formats, currencies, and sign positions
- Unit tests for `formatAmountValue()` - Formatting with different negative commodity styles
- Unit tests for `calculateBalancingAmount()` - Simple/complex transactions, edge cases

**Syntax Highlighting Tests:**
- `test-syntax.journal` - Comprehensive syntax highlighting examples including all supported features

Test verification includes:
- Exact output matching
- Decimal point alignment within transactions
- Consistent 2-space indentation
- Proper negative amount format (-$X.XX)
- Smart block comment toggle behavior with preserved indentation
- Mixed comment state handling (comment all → uncomment all cycle)
- Syntax highlighting for all supported elements
- Correct chronological sorting of transactions

## Configuration

The extension provides the following settings:
- `hledger-formatter.formatOnSave` (boolean, default: false) - Auto-format on file save
- `hledger-formatter.sortOnSave` (boolean, default: false) - Sort journal entries by date on save
- `hledger-formatter.amountColumnPosition` (number, default: 42, range: 20-100) - Column position for aligning amounts (when using fixed column alignment)
- `hledger-formatter.amountAlignment` (enum: 'fixedColumn' | 'widest', default: 'widest') - Controls how posting amounts are aligned
- `hledger-formatter.indentationWidth` (enum: 2 | 4, default: 4) - Number of spaces used to indent postings
- `hledger-formatter.negativeCommodityStyle` (enum: 'signBeforeSymbol' | 'symbolBeforeSign', default: 'symbolBeforeSign') - How negative amounts are formatted (-$100 vs $-100)
- `hledger-formatter.dateFormat` (enum: 'YYYY-MM-DD' | 'YYYY/MM/DD' | 'YYYY.MM.DD', default: 'YYYY-MM-DD') - Preferred transaction date format
- `hledger-formatter.defaultAccountCategories` (enum: 'none' | 'lowercase' | 'uppercase' | 'capitalize', default: 'lowercase') - Standard account categories in autocomplete
- `hledger-formatter.suggestBalancingAmounts` (boolean, default: true) - Suggest balancing amounts as inline ghost text (accept with Tab)
- `hledger-formatter.commentCharacter` (string, default: ";") - Preferred comment character for toggling comments (";", "#", or "*")

## Key Implementation Details

- Configurable amount column alignment (default position: 42, 'widest' mode for optimal spacing)
- Negative amount format standardization (configurable: `-$100` or `$-100`)
- Transaction boundary detection using date regex: `/^\d{4}[/-]\d{2}[/-]\d{2}/`
- Supports transaction status markers (`*`, `!`)
- Preserves comments within transactions
- Comprehensive TextMate grammar for syntax highlighting
- Theme contribution with optimized colors for hledger files
- Transaction sorting with preservation of structure and comments
- Inline completion provider for balancing amount suggestions (ghost text accepted with Tab)
- Account autocomplete with standard categories and user-defined accounts
- Case-insensitive deduplication of standard accounts with user accounts