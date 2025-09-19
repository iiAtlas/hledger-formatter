# hledger Formatter

A VS Code extension to format spacing in hledger journal files.

## Features

- Automatically aligns account names and amounts in hledger journal files
- Ensures exactly one blank line between transaction entries
- Removes any blank lines at the start of the file
- Format on demand with keyboard shortcut (Shift+Alt+F)
- Format on save option (enabled by default)
- Sort journal entries by date (Shift+Cmd+S)
- Sort on save option (enabled by default)
- Context menu option to format hledger files
- Toggle comment lines (Cmd+/)

## Supported File Types

- `.journal`
- `.hledger`
- `.ledger`

## Usage

1. Open a hledger journal file
2. Use one of these methods to format:
   - Press `Shift+Alt+F`
   - Right-click and select "Format hledger Journal" from the context menu
   - Save the file (if format on save is enabled)

## Extension Settings

This extension contributes the following settings:

* `hledger-formatter.formatOnSave`: Enable/disable formatting on save (default: true)
* `hledger-formatter.sortOnSave`: Enable/disable sorting entries by date on save (default: true)

## Example

Before formatting:

```

2023-01-05   Grocery Store
  expenses:food      $85.50
    assets:bank:checking    $-85.50


2023-01-10 Coffee Shop
 expenses:dining:coffee  $4.75
   assets:cash  $-4.75
```

After formatting:

```
2023-01-05 Grocery Store
  expenses:food                           $85.50
  assets:bank:checking                   -$85.50

2023-01-10 Coffee Shop
  expenses:dining:coffee                  $4.75
  assets:cash                            -$4.75
```

## Release Notes

### 1.0.0

Initial release of hledger Formatter

## Requirements

- VS Code 1.60.0 or newer

## License

MIT
