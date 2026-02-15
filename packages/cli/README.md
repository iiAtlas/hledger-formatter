![hledger-fmt Banner](https://raw.githubusercontent.com/iiAtlas/hledger-formatter/main/images/banner.jpg)

# hledger-fmt

A CLI formatter for your [hledger](https://hledger.org/) journals.

`hledger-fmt` keeps journal files consistent by formatting postings, normalizing transaction headers, and sorting transactions by date when needed.

![npm](https://img.shields.io/npm/v/%40iiatlas%2Fhledger-fmt) ![license](https://img.shields.io/github/license/iiAtlas/hledger-formatter) ![node](https://img.shields.io/node/v/%40iiatlas%2Fhledger-fmt)

## Features

- Format hledger journal files with consistent spacing and alignment
- Sort transactions chronologically by transaction date
- Read input from a file or stdin
- Write changes in place with `--in-place`
- Configure formatting via CLI flags, environment variables, or JSON config
- Generate a starter config file with `hledger-fmt init`

Looking for a VSCode extension to do this automatically? Check out [hledger-formatter](https://marketplace.visualstudio.com/items?itemName=iiatlas.hledger-formatter).

## Demo

### Format

![hledger-fmt format demo](https://raw.githubusercontent.com/iiAtlas/hledger-formatter/main/images/hledger-fmt-cli-format.gif)

### Sort

![hledger-fmt sort demo](https://raw.githubusercontent.com/iiAtlas/hledger-formatter/main/images/hledger-fmt-cli-sort.gif)

## Install

View on NPM: https://www.npmjs.com/package/@iiatlas/hledger-fmt

```bash
npm install -g @iiatlas/hledger-fmt
```

## Quick Start

_(Optional)_ Create a default config file:

```bash
hledger-fmt init
```

Format a file:

```bash
hledger-fmt format ledger.journal
```

Format stdin:

```bash
cat ledger.journal | hledger-fmt format
```

Sort a file:

```bash
hledger-fmt sort ledger.journal
```

## Supported File Types

- `.journal`
- `.hledger`
- `.ledger`

## Commands

### `format [file]`

Format a journal file. If `file` is omitted, reads from stdin.

```bash
hledger-fmt format [file]
```

Options:

- `--config <path>`: path to JSON config file (default discovery: `.hledger-fmt.json` in current directory)
- `--alignment <mode>`: `fixedColumn` or `widest`
- `--column <n>`: column position for fixed alignment (non-negative integer)
- `--indent <width>`: indentation width (non-negative integer)
- `--negative-style <style>`: `signBeforeSymbol` or `symbolBeforeSign`
- `--date-format <fmt>`: `YYYY-MM-DD`, `YYYY/MM/DD`, or `YYYY.MM.DD`
- `--comment-char <char>`: `;`, `#`, or `*`
- `-i, --in-place`: modify file in place (requires `file` argument)

### `sort [file]`

Sort journal entries by date. If `file` is omitted, reads from stdin.

```bash
hledger-fmt sort [file]
```

Options:

- `-i, --in-place`: modify file in place (requires `file` argument)

### `init`

Create a default config file.

```bash
hledger-fmt init
```

Options:

- `--path <path>`: custom output path (default: `.hledger-fmt.json`)
- `-f, --force`: overwrite an existing config file

## Format Configuration

Formatting options can come from the following locations (in order of precedence):

1. CLI flags (like `--alignment` or `--column`)
2. Environment variables (`HLEDGER_FMT_*`)
3. JSON config file (`--config <path>` or auto-discovered `.hledger-fmt.json`)
4. Or, the built-in defaults which align with the hledger manual

### Config File Shape

`.hledger-fmt.json`:

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

### Config Options Reference

- `format.alignment`
  - Valid values: `fixedColumn`, `widest`
  - Default: `widest`
  - Env var: `HLEDGER_FMT_ALIGNMENT`
  - CLI flag: `--alignment`
- `format.column`
  - Valid values: non-negative integer
  - Default: `42`
  - Env var: `HLEDGER_FMT_COLUMN`
  - CLI flag: `--column`
- `format.indent`
  - Valid values: non-negative integer
  - Default: `4`
  - Env var: `HLEDGER_FMT_INDENT`
  - CLI flag: `--indent`
- `format.negativeStyle`
  - Valid values: `signBeforeSymbol`, `symbolBeforeSign`
  - Default: `symbolBeforeSign`
  - Env var: `HLEDGER_FMT_NEGATIVE_STYLE`
  - CLI flag: `--negative-style`
- `format.dateFormat`
  - Valid values: `YYYY-MM-DD`, `YYYY/MM/DD`, `YYYY.MM.DD`
  - Default: `YYYY-MM-DD`
  - Env var: `HLEDGER_FMT_DATE_FORMAT`
  - CLI flag: `--date-format`
- `format.commentChar`
  - Valid values: `;`, `#`, `*`
  - Default: `;`
  - Env var: `HLEDGER_FMT_COMMENT_CHAR`
  - CLI flag: `--comment-char`

If the config file exists but contains invalid JSON, unknown keys, or invalid values, the CLI prints a warning and ignores that config file.

## Example

Before:

```ledger
2023-01-05   Grocery Store
  expenses:food      $85.50
    assets:bank:checking    $-85.50

2023-01-10 Coffee Shop
 expenses:dining:coffee  $4.75
   assets:cash  $-4.75
```

After:

```ledger
2023-01-05 Grocery Store
    expenses:food             $85.50
    assets:bank:checking     $-85.50

2023-01-10 Coffee Shop
    expenses:dining:coffee     $4.75
    assets:cash               $-4.75
```

## Related

Looking to automatically format and sort your HLedger Journals in VSCode? _(Along with syntax highlighting and more...)_

Check out my VSCode extension [hledger-formatter](https://marketplace.visualstudio.com/items?itemName=iiatlas.hledger-formatter) which does exactly that!

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for CLI release history.

## Contributing

See [CONTRIBUTING.md](https://github.com/iiAtlas/hledger-formatter/blob/main/CONTRIBUTING.md).

## Support

See [SUPPORT.md](https://github.com/iiAtlas/hledger-formatter/blob/main/SUPPORT.md).

## License

MIT - see [LICENSE](./LICENSE).
