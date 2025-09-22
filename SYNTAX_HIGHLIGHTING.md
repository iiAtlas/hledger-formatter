# hledger Syntax Highlighting

## Overview
The hledger-formatter extension includes comprehensive syntax highlighting for hledger journal files (`.journal`, `.hledger`, `.ledger`).

## Features

### Account Category Highlighting
Account names are highlighted with different colors for each hierarchical level:
- **Level 1** (e.g., `assets`, `expenses`): Bold blue - Primary account categories
- **Level 2** (e.g., `bank`, `food`): Teal - Secondary categories  
- **Level 3** (e.g., `checking`, `groceries`): Yellow - Tertiary categories
- **Level 4** (e.g., `personal`, `produce`): Light blue - Quaternary categories
- **Level 5** (e.g., `apple`): Purple - Additional subcategories

### Other Syntax Elements
- **Include Statements**: `!include` directives are highlighted with the keyword as a control element and file paths as strings
- **Comments**: Lines starting with `;` are highlighted in green italic (supports indented and inline comments)
- **Dates**: Transaction dates in `YYYY-MM-DD` or `YYYY/MM/DD` format
- **Transaction Status & Descriptions**:
  - **Reconciled (`*`)**: Normal color for descriptions
  - **Pending (`!`)**: Orange italic for descriptions  
  - **Unreconciled (no marker)**: Red italic for descriptions - makes unreconciled transactions stand out
- **Amounts**: Numeric amounts with currency symbols are highlighted
- **Project Tags**: `project: name` or `project:name` tags are highlighted with:
  - Project keyword in purple bold
  - Project name in bright blue bold italic
  - Can appear on separate lines or within transaction descriptions

## Example
```hledger
; This is a comment
!include common/accounts.journal
project: mugsly

2023-01-01 * Opening Balance project:mugsly
    assets:bank:checking:personal        $1000.00
    equity:opening:balances              -$1000.00
```

In this example:
- The `!include` keyword is highlighted as a control keyword
- The file path `common/accounts.journal` is highlighted as a string
- `assets` appears in bold blue (level 1)
- `bank` appears in teal (level 2)  
- `checking` appears in yellow (level 3)
- `personal` appears in light blue (level 4)
- The amount `$1000.00` is highlighted
- The comment is in green italic
- `project:` appears in purple bold and `mugsly` in bright blue bold italic

## Custom Theme
The extension includes an optional "HLedger Color Theme" optimized for viewing journal files with VS Code's dark theme.

## TextMate Scopes
For theme authors, the following TextMate scopes are available:
- `keyword.control.include.hledger` - Include directive keyword
- `string.quoted.other.include-path.hledger` - Include file paths
- `comment.line.semicolon.hledger` - Comments
- `constant.numeric.date.hledger` - Transaction dates
- `keyword.operator.status.reconciled.hledger` - Reconciled status marker (*)
- `keyword.operator.status.pending.hledger` - Pending status marker (!)
- `string.unquoted.description.reconciled.hledger` - Reconciled transaction descriptions
- `string.unquoted.description.pending.hledger` - Pending transaction descriptions
- `string.unquoted.description.unreconciled.hledger` - Unreconciled transaction descriptions
- `keyword.other.project.hledger` - Project tag keyword
- `entity.name.type.project.hledger` - Project name
- `entity.name.tag.account.level1.hledger` - First level accounts
- `entity.name.function.account.level2.hledger` - Second level accounts
- `variable.parameter.account.level3.hledger` - Third level accounts
- `storage.type.account.level4.hledger` - Fourth level accounts
- `keyword.control.account.level5.hledger` - Fifth level accounts
- `constant.numeric.amount.hledger` - Monetary amounts