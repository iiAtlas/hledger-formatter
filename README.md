![HLedger Formatter Banner](images/banner.jpg)

# HLedger Formatter

A VS Code extension to make editing hledger journal files a bit more fun.

[HLedger](https://hledger.org/) is an awesome plain text cli accounting tool. This extension adds syntax highlighting, formatting, sorting, and other quality-of-life improvements to make editing these files easier.

## Features

- Automatically aligns account names and amounts in hledger journal files
- Rich syntax highlighting with hierarchical account coloring
- Sort journal entries by date (`Shift+Cmd+S`)
- Sort on save option (enabled by default)
- Toggle comment lines (`Cmd+/`)
- Create new monthly journal files (`Cmd+N`)

## Demo

### Syntax Highlighting ([details](SYNTAX_HIGHLIGHTING.md))
Rich syntax highlighting with hierarchical account coloring and project tags:

![Syntax Demo](images/syntax-demo.gif)

### Automatic Formatting
Aligns amounts to a configurable column position for clean, readable journal files:

![Format Demo](images/format-demo.gif)

### Sort by Date
Automatically sorts transactions chronologically:

![Sort Demo](images/sort-demo.gif)

## Supported File Types

- `.journal`
- `.hledger`
- `.ledger`

## Usage

1. Open a hledger journal file
2. Use one of these methods to format:
   - Press `Shift+Alt+F` to format the entire document
   - Save the file (if format on save is enabled)
   - Right-click and select "Format hledger Journal" from the context menu
3. Additional commands:
   - Press `Shift+Cmd+S` to sort entries by date
   - Press `Cmd+/` to toggle comments on selected lines
   - Press `Cmd+N` to create a new monthly journal file

## Extension Settings

This extension contributes the following settings:

* `hledger-formatter.formatOnSave`: Enable/disable formatting on save (default: true)
* `hledger-formatter.sortOnSave`: Enable/disable sorting entries by date on save (default: true)
* `hledger-formatter.amountColumnPosition`: Column position for aligning amounts (default: 42, range: 20-100)

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

See [CHANGELOG.md](CHANGELOG.md) for a full list of changes in each release.

## Requirements

- VS Code 1.92.0 or newer

## Contributing

This is an open source project and contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed information on:
- Setting up your development environment
- Running tests and building the extension
- Submitting pull requests

Feel free to:
- Report bugs or request features via [GitHub Issues](https://github.com/iiAtlas/hledger-formatter/issues)
- Submit pull requests with improvements
- Share feedback and suggestions

## Other Distributions

In addition to the VSCode Marketplace, this package is also available on the OpenVSX Registry: [iiatlas/hledger-formatter](https://open-vsx.org/extension/iiatlas/hledger-formatter).

## Support

For help and support, see [SUPPORT.md](SUPPORT.md)

- **Issues & Bug Reports**: [GitHub Issues](https://github.com/iiAtlas/hledger-formatter/issues)
- **Source Code**: [GitHub Repository](https://github.com/iiAtlas/hledger-formatter)
- **VS Code Marketplace**: [hledger-formatter](https://marketplace.visualstudio.com/items?itemName=iiatlas.hledger-formatter)

## License

MIT - see the [LICENSE](LICENSE) file for details
