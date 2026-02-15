# @iiatlas/hledger-fmt

A CLI tool for formatting and sorting [hledger](https://hledger.org/) journal files.

Supports `.journal`, `.hledger`, and `.ledger` files.

## Install

```bash
npm install -g @iiatlas/hledger-fmt
```

## Usage

### Format

Format a journal file, aligning amounts and normalizing whitespace:

```bash
hledger-fmt format ledger.journal
```

Read from stdin:

```bash
cat ledger.journal | hledger-fmt format
```

### Sort

Sort journal entries chronologically by date:

```bash
hledger-fmt sort ledger.journal
```

### Init Config

Create a default config file in the current directory:

```bash
hledger-fmt init
```

Write to a custom path:

```bash
hledger-fmt init --path ./config/.hledger-fmt.json
```

### Options

```
hledger-fmt format [file]   Format a journal file
hledger-fmt sort [file]     Sort journal entries by date
hledger-fmt init            Create a default config file

Options:
  -V, --version  Show version number
  -h, --help     Show help
```

### Format Configuration

`hledger-fmt format` supports configuration from:

1. CLI flags
2. Environment variables (`HLEDGER_FMT_*`)
3. JSON config file (`--config <path>` or `.hledger-fmt.json` in the current directory)
4. Built-in defaults

Precedence is highest to lowest in the list above.

Config file example:

```json
{
  "format": {
    "alignment": "widest",
    "column": 42,
    "indent": 4,
    "negativeStyle": "symbolBeforeSign",
    "dateFormat": "YYYY-MM-DD",
    "commentChar": ";"
  }
}
```

Supported environment variables:

- `HLEDGER_FMT_ALIGNMENT`
- `HLEDGER_FMT_COLUMN`
- `HLEDGER_FMT_INDENT`
- `HLEDGER_FMT_NEGATIVE_STYLE`
- `HLEDGER_FMT_DATE_FORMAT`
- `HLEDGER_FMT_COMMENT_CHAR`

If a config file is invalid, the CLI prints a warning and ignores that config file.

## Related

- [hledger-formatter](https://marketplace.visualstudio.com/items?itemName=iiatlas.hledger-formatter) — VS Code extension with the same formatting engine
