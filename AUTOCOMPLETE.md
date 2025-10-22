# Autocomplete & Balancing Suggestions

This extension provides two features to speed up journal entry: **account name autocomplete** and **balancing amount suggestions**.

## Account Name Autocomplete

As you type account names in posting lines, the extension automatically suggests matching accounts from both standard categories and your existing journal entries.

### How It Works

1. **Type the account name** on a posting line (lines starting with whitespace)
2. **See suggestions** appear in a dropdown list
3. **Select a suggestion** using arrow keys and Enter, or keep typing to filter

### What Gets Suggested

The autocomplete includes:

**Standard Account Categories** (configurable):
- `assets`
- `liabilities`
- `equity`
- `revenues`
- `income`
- `expenses`

**Your Existing Accounts**:
- Automatically discovered from all `.journal`, `.hledger`, and `.ledger` files in your workspace
- Includes accounts from files referenced via `!include` directives

**Hierarchical Completions**:
- Typing `:` triggers suggestions for sub-accounts
- Example: `assets:` suggests `assets:bank`, `assets:cash`, etc.

### Example

```
2025-10-22 * Grocery Shopping
    expenses:food:groceries    $45.50
    assets:   [Type here - see suggestions: assets:bank:checking, assets:cash, etc.]
```

### Configuration

**Standard Categories Casing** (`hledger-formatter.defaultAccountCategories`):
- `lowercase` (default): assets, expenses, income, etc.
- `uppercase`: ASSETS, EXPENSES, INCOME, etc.
- `capitalize`: Assets, Expenses, Income, etc.
- `none`: Don't include standard categories

**Deduplication**:
Standard categories are automatically deduplicated with your existing accounts (case-insensitive). For example, if you have "Assets:Checking" in your journal and standard categories set to "lowercase", you'll only see "assets" once in suggestions.

---

## Balancing Amount Suggestions

When you're entering a transaction, the extension can automatically suggest the balancing amount needed to make the transaction sum to zero.

### How It Works

1. **Type a transaction** with one or more posting lines that have amounts
2. **Add a posting line** without an amount (just the account name)
3. **Ghost text appears** showing the exact amount needed to balance
4. **Press Tab** to accept the suggestion

The suggestion appears as gray "ghost text" at the end of your cursor position, similar to how GitHub Copilot works.

### When Suggestions Appear

Balancing suggestions appear when:
- You're on a posting line (starts with whitespace)
- The line has an account name but no amount
- Exactly one posting in the transaction is missing an amount
- All other postings have valid amounts in the same currency

Suggestions won't appear when:
- Multiple postings are missing amounts (ambiguous)
- All postings already have amounts (nothing to balance)
- The transaction uses multiple currencies (currently not supported)

### Example 1: Simple Two-Posting Transaction

```
2025-10-22 * Coffee Shop
    expenses:food:coffee    $4.50
    assets:cash             [Ghost text shows: -$4.50 Press Tab]
```

### Example 2: Multi-Posting Transaction

```
2025-10-22 * Grocery & Gas
    expenses:food:groceries       $85.20
    expenses:transportation:gas   $42.00
    assets:bank:checking          [Ghost text shows: -$127.20 Press Tab]
```

### Example 3: Income Transaction

```
2025-10-22 * Freelance Payment
    assets:bank:checking    $500.00
    income:freelance        [Ghost text shows: -$500.00 Press Tab]
```

### Smart Alignment

The balancing suggestion respects all your formatting settings:
- **Amount Alignment**: Aligns with the configured mode (`widest` or `fixedColumn`)
- **Negative Commodity Style**: Uses your configured style (`$-100` or `-$100`)
- **Indentation**: Matches your indentation width setting
- **Currency**: Automatically uses the same currency as other postings

### Configuration

**Enable/Disable** (`hledger-formatter.suggestBalancingAmounts`):
- `true` (default): Show balancing suggestions
- `false`: Disable the feature entirely

To disable, add to your VS Code settings:

```json
{
  "hledger-formatter.suggestBalancingAmounts": false
}
```

**More Than Two Postings**
Balancing suggestions work great with complex transactions! Just make sure only one posting is missing an amount:

```
2025-10-22 * Split Dinner
    expenses:food:restaurant    $60.00
    expenses:food:tip           $12.00
    liabilities:creditcard      $-50.00  ; Friend paid part
    assets:cash                 [Suggests: -$22.00]
```

### Troubleshooting

**Q: Why isn't the balancing suggestion appearing?**
- Make sure exactly one posting is missing an amount
- Verify all other postings have valid amounts
- Check that the feature is enabled in settings
- Ensure your cursor is at the end of the line (after the account name)

**Q: The suggestion shows the wrong amount**
- This usually means there's a parsing issue with one of the amounts
- Check for typos in currency symbols or numbers
- Ensure amounts follow the format: `$100.00` or `100.00 USD`

**Q: Can I use this with multiple currencies?**
- Not currently. The extension only suggests balancing amounts for transactions where all postings use the same currency.

**Q: The alignment looks wrong**
- Make sure you've configured your preferred alignment mode in settings
- The suggestion respects `hledger-formatter.amountAlignment` and other formatting settings
- Try formatting the document (Shift+Alt+F) to see how the final result will look

---

## Combining Both Features

These features work great together for the fastest journal entry experience:

1. **Start typing account name** See autocomplete suggestions
2. **Select from autocomplete** Account name filled in
3. **Add amount** Type the amount for this posting
4. **Next line, start typing account** See autocomplete again
5. **Select account** Account name filled in
6. **Press Tab** Balancing amount suggestion accepted
7. **Done!** Move to next transaction

This workflow lets you enter transactions quickly while maintaining accuracy and proper formatting.
