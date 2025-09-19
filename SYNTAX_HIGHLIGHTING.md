# hledger Syntax Highlighting

## Overview
The hledger-formatter extension now includes comprehensive syntax highlighting for hledger journal files (`.journal`, `.hledger`, `.ledger`).

## Features

### Account Category Highlighting
Account names are highlighted with different colors for each hierarchical level:
- **Level 1** (e.g., `assets`, `expenses`): Bold blue - Primary account categories
- **Level 2** (e.g., `bank`, `food`): Teal - Secondary categories  
- **Level 3** (e.g., `checking`, `groceries`): Yellow - Tertiary categories
- **Level 4** (e.g., `personal`, `produce`): Light blue - Quaternary categories
- **Level 5** (e.g., `apple`): Purple - Additional subcategories

### Other Syntax Elements
- **Comments**: Lines starting with `;` are highlighted in green italic
- **Dates**: Transaction dates in `YYYY-MM-DD` or `YYYY/MM/DD` format
- **Transaction Status**: `*` (cleared) and `!` (pending) markers are highlighted
- **Transaction Descriptions**: Text after the date/status
- **Amounts**: Numeric amounts with currency symbols are highlighted

## Example
```hledger
; This is a comment
2023-01-01 * Opening Balance
    assets:bank:checking:personal        $1000.00
    equity:opening:balances              -$1000.00
```

In this example:
- `assets` appears in bold blue (level 1)
- `bank` appears in teal (level 2)  
- `checking` appears in yellow (level 3)
- `personal` appears in light blue (level 4)
- The amount `$1000.00` is highlighted
- The comment is in green italic

## Custom Theme
The extension includes an optional "hledger Color Theme" optimized for viewing journal files with VS Code's dark theme.

## TextMate Scopes
For theme authors, the following TextMate scopes are available:
- `comment.line.semicolon.hledger` - Comments
- `constant.numeric.date.hledger` - Transaction dates
- `keyword.operator.status.hledger` - Status markers (* or !)
- `string.unquoted.description.hledger` - Transaction descriptions
- `entity.name.tag.account.level1.hledger` - First level accounts
- `entity.name.function.account.level2.hledger` - Second level accounts
- `variable.parameter.account.level3.hledger` - Third level accounts
- `storage.type.account.level4.hledger` - Fourth level accounts
- `keyword.control.account.level5.hledger` - Fifth level accounts
- `constant.numeric.amount.hledger` - Monetary amounts