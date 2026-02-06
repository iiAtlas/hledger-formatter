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

### Options

```
hledger-fmt format [file]   Format a journal file
hledger-fmt sort [file]     Sort journal entries by date

Options:
  -V, --version  Show version number
  -h, --help     Show help
```

## Related

- [hledger-formatter](https://marketplace.visualstudio.com/items?itemName=iiatlas.hledger-formatter) — VS Code extension with the same formatting engine
