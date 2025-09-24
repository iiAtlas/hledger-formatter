# Contributing to HLedger Formatter

Thank you for your interest in contributing to HLedger Formatter! This guide will help you get started with development.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (use Node Version Manager for easy version management)
- [VS Code](https://code.visualstudio.com/) (for extension development)
- Git

### Setting Up Your Development Environment

1. **Clone the repository:**
   ```bash
   git clone https://github.com/iiAtlas/hledger-formatter.git
   cd hledger-formatter
   ```

2. **Set up Node.js with NVM:**
   
   We recommend using [nvm](https://github.com/nvm-sh/nvm) (Node Version Manager) to manage Node.js versions:
   
   ```bash
   # Install nvm if you haven't already

   # Use the Node version specified in .nvmrc (if available)
   nvm use
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Open in VS Code:**
   ```bash
   code .
   ```

## Development Commands

### Building and Compiling

```bash
# Compile TypeScript to JavaScript
npm run compile

# Watch mode for development (auto-recompile on changes)
npm run watch
```

### Testing

```bash
# Run all tests (compile, lint, copy test files, then test)
npm run test

# Run linter
npm run lint
```

### Debugging the Extension

1. Open the project in VS Code
2. Press `F5` or choost `Debug: Start Debugging` to open a new VS Code window with the extension loaded
3. Open a `.journal`, `.hledger`, or `.ledger` file in the new window
4. Set breakpoints in your code
5. Test the extension functionality

## Writing Tests

### Test Structure

Tests are located in `src/test/` and follow a pattern of input/output file pairs:
- Input files: `*_in.journal`
- Expected output files: `*_out.journal`

### Adding New Tests

1. **Create test input file:**
   
   Create a new file in `src/test/` with the suffix `_in.journal`:
   ```
   src/test/my_feature_in.journal
   ```

2. **Create expected output file:**
   
   Create the corresponding output file with the suffix `_out.journal`:
   ```
   src/test/my_feature_out.journal
   ```

3. **Update the test suite:**
   
   Add your test case to `src/test/suite/extension.test.ts`:
   ```typescript
   test('My Feature Test', async () => {
     await testFormatting('my_feature_in.journal', 'my_feature_out.journal');
   });
   ```

### Running Tests

```bash
# Run all tests
npm run test
```

## Code Style Guidelines

- Use TypeScript for all source code
- Follow the existing code style (enforced by ESLint)
- Add JSDoc comments for public functions
- Keep functions focused and single-purpose
- Write self-documenting code with clear variable names

## Submitting Changes

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes and commit:**
   ```bash
   git add .
   git commit -m "feat: Add your feature description"
   ```

3. **Run tests and linting:**
   ```bash
   npm run test
   npm run lint
   ```

4. **Push your branch and create a pull request:**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a pull request on GitHub.

## Project Structure

```
hledger-formatter/
├── src/
│   ├── extension.ts          # Main extension code
│   └── test/
│       ├── suite/            # Test suite files
│       └── *.journal         # Test input/output files
├── syntaxes/
│   └── hledger.tmLanguage.json  # Syntax highlighting grammar
├── package.json              # Extension manifest
├── tsconfig.json            # TypeScript configuration
└── .eslintrc.json          # ESLint configuration
```

## Getting Help

- Check existing [issues](https://github.com/iiAtlas/hledger-formatter/issues) for similar problems
- Create a new issue for bugs or feature requests

## License

By contributing to HLedger Formatter, you agree that your contributions will be licensed under the [MIT license](LICENSE).