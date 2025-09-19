# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VS Code extension called "hledger-formatter" that formats hledger journal files by aligning account names and amounts. It supports `.journal`, `.hledger`, and `.ledger` file extensions.

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

2. **Command Registration**:
   - Manual format command: `hledger-formatter.formatDocument`
   - Comment toggle command: `hledger-formatter.toggleComment` (Cmd+/)
   - Format-on-save handler for hledger files
   - Document formatting provider (integrates with VS Code's Format Document)
   - Range formatting provider

### Formatting Logic

The formatter aligns all amounts to a fixed column position (42 characters from left):
- Uses exactly 2 spaces for posting line indentation
- Handles negative amounts by converting `$-X.XX` to `-$X.XX` format
- Preserves comments and transaction structure
- Normalizes transaction header spacing

### Comment Toggle Logic

The comment toggle feature (Cmd+/) uses smart block behavior and preserves indentation:

**Smart Block Behavior:**
- Analyzes entire selection to determine if ANY lines are uncommented
- If any uncommented lines exist → comments ALL lines in selection
- If all lines are commented → uncomments ALL lines in selection
- Eliminates alternating comment patterns in mixed selections

**Indentation Preservation:**
- Adds `; ` after existing indentation rather than at line start
- Transaction headers: `2025-03-01 Transaction` → `; 2025-03-01 Transaction`
- Posting lines: `  Assets:Cash  $100.00` → `  ; Assets:Cash  $100.00`
- Maintains visual hierarchy when commenting/uncommenting

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

Test verification includes:
- Exact output matching
- Decimal point alignment within transactions
- Consistent 2-space indentation
- Proper negative amount format (-$X.XX)
- Smart block comment toggle behavior with preserved indentation
- Mixed comment state handling (comment all → uncomment all cycle)

## Configuration

The extension provides one setting:
- `hledger-formatter.formatOnSave` (boolean, default: true) - Auto-format on file save

## Key Implementation Details

- Fixed amount column alignment at position 42
- Negative amount format standardization
- Transaction boundary detection using date regex: `/^\d{4}[/-]\d{2}[/-]\d{2}/`
- Supports transaction status markers (`*`, `!`)
- Preserves comments within transactions