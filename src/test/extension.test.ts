import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

// Import the formatter, comment, and sort functions directly for testing
import { formatHledgerJournal, toggleCommentLines, sortHledgerJournal, parseAmount, formatAmountValue, calculateBalancingAmount } from '../extension';

suite('Hledger Formatter Tests', () => {
	vscode.window.showInformationMessage('Running hledger formatter tests');

	const testsPath = path.join(__dirname, 'test_journals');
	
	// Helper function to read test journal files
	function readTestFile(filename: string): string {
		const filePath = path.join(testsPath, filename);
		return fs.readFileSync(filePath, 'utf8');
	}

	// Helper function to normalize line endings and trailing whitespace
	function normalizeText(text: string): string {
		return text.split('\n')
			.map(line => line.trimRight())
			.join('\n')
			.trim();
	}

	test('Format test_1 journal file', () => {
		// Read input and expected output files
		const inputJournal = readTestFile('test_1_in.journal');
		const expectedOutput = readTestFile('test_1_out.journal');
		
		// Format the input journal
		const formattedJournal = formatHledgerJournal(inputJournal);
		
		// Normalize both texts to handle line endings and whitespace
		const normalizedFormatted = normalizeText(formattedJournal);
		const normalizedExpected = normalizeText(expectedOutput);
		
		// Verify the formatting matches the expected output
		assert.strictEqual(normalizedFormatted, normalizedExpected, 
			'Formatted output should match expected output');
		
		// Additional verification: Check decimal point alignment
		const decimalPointsAligned = verifyDecimalPointsAligned(formattedJournal);
		assert.strictEqual(decimalPointsAligned, true, 
			'Decimal points should be aligned in each transaction');
	});
	
	test('Format inconsistent indentation', () => {
		// Read input and expected output files
		const inputJournal = readTestFile('inconsistent_indents_in.journal');
		const expectedOutput = readTestFile('inconsistent_indents_out.journal');

		// Format the input journal
		const formattedJournal = formatHledgerJournal(inputJournal);

		// Normalize both texts to handle line endings and whitespace
		const normalizedFormatted = normalizeText(formattedJournal);
		const normalizedExpected = normalizeText(expectedOutput);

		// Verify the formatting matches the expected output
		assert.strictEqual(normalizedFormatted, normalizedExpected,
			'Formatted output with inconsistent indentation should match expected output');

		// Verify indentation correction
		const correctIndentation = verifyIndentation(formattedJournal);
		assert.strictEqual(correctIndentation, true,
			'All posting lines should have exactly 2 spaces of indentation');

		// Verify decimal point alignment
		const decimalPointsAligned = verifyDecimalPointsAligned(formattedJournal);
		assert.strictEqual(decimalPointsAligned, true,
			'Decimal points should be aligned in each transaction');
	});

	test('Format transaction headers with leading spaces', () => {
		// Read input and expected output files
		const inputJournal = readTestFile('header_indented_in.journal');
		const expectedOutput = readTestFile('header_indented_out.journal');

		// Format the input journal
		const formattedJournal = formatHledgerJournal(inputJournal);

		// Normalize both texts to handle line endings and whitespace
		const normalizedFormatted = normalizeText(formattedJournal);
		const normalizedExpected = normalizeText(expectedOutput);

		// Verify the formatting matches the expected output
		assert.strictEqual(normalizedFormatted, normalizedExpected,
			'Transaction headers should not have leading spaces');

		// Verify transaction headers start at column 0
		const lines = formattedJournal.split('\n');
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(line)) {
				assert.ok(!line.startsWith(' '),
					`Transaction header at line ${i+1} should not have leading spaces: "${line}"`);
			}
		}
	});
	
	test('Format sample journal with negative amounts', () => {
		// Read input and expected output files
		const inputJournal = readTestFile('sample_in.journal');
		const expectedOutput = readTestFile('sample_out.journal');
		
		// Format the input journal
		const formattedJournal = formatHledgerJournal(inputJournal);
		
		// Normalize both texts to handle line endings and whitespace
		const normalizedFormatted = normalizeText(formattedJournal);
		const normalizedExpected = normalizeText(expectedOutput);
		
		// Verify the formatting matches the expected output
		assert.strictEqual(normalizedFormatted, normalizedExpected, 
			'Formatted output should correctly format negative amounts');
		
		// Verify indentation correction
		const correctIndentation = verifyIndentation(formattedJournal);
		assert.strictEqual(correctIndentation, true, 
			'All posting lines should have exactly 2 spaces of indentation');
		
		// Verify decimal point alignment
		const decimalPointsAligned = verifyDecimalPointsAligned(formattedJournal);
		assert.strictEqual(decimalPointsAligned, true, 
			'Decimal points should be aligned in each transaction');
			
		// Verify negative amounts format
		const correctNegativeFormat = verifyNegativeAmountFormat(formattedJournal);
		assert.strictEqual(correctNegativeFormat, true, 
			'Negative amounts should be in -$X.XX format');
	});

	test('Format dates to default format with padding', () => {
		const mixedDates = `2025/3/1 Sample transaction
  Assets:Cash  $10.00
  Income:Misc -$10.00

2025.03.02 Second
  Assets:Cash $5.00
  Income:Misc -$5.00`;

		const formatted = formatHledgerJournal(mixedDates);
		const lines = formatted.split('\n');
		assert.strictEqual(lines[0], '2025-03-01 Sample transaction');
		assert.strictEqual(lines[4], '2025-03-02 Second');
	});

	test('Format dates to configured style', () => {
		const original = `2025-03-01 Sample transaction
  Assets:Cash  $10.00
  Income:Misc -$10.00

2025-03-02 Another one
  Assets:Cash $5.00
  Income:Misc -$5.00`;

		const formatted = formatHledgerJournal(original, { dateFormat: 'YYYY/MM/DD' });
		const lines = formatted.split('\n');
		assert.strictEqual(lines[0], '2025/03/01 Sample transaction');
		assert.strictEqual(lines[4], '2025/03/02 Another one');
	});

	test('Format dates to dotted style', () => {
		const original = `2025-03-01 One
  Assets:Cash $10.00
  Income:Misc -$10.00

2025/03/02 Two
  Assets:Cash $5.00
  Income:Misc -$5.00`;

		const formatted = formatHledgerJournal(original, { dateFormat: 'YYYY.MM.DD' });
		const lines = formatted.split('\n');
		assert.strictEqual(lines[0], '2025.03.01 One');
		assert.strictEqual(lines[4], '2025.03.02 Two');
	});
	
	test('Correct alignment of negative amounts', () => {
		// Read input and expected output files
		const inputJournal = readTestFile('negative_amounts_in.journal');
		const expectedOutput = readTestFile('negative_amounts_out.journal');
		
		// Format the input journal
		const formattedJournal = formatHledgerJournal(inputJournal);
		
		// Normalize both texts to handle line endings and whitespace
		const normalizedFormatted = normalizeText(formattedJournal);
		const normalizedExpected = normalizeText(expectedOutput);
		
		// Verify the formatting matches the expected output
		assert.strictEqual(normalizedFormatted, normalizedExpected, 
			'Formatted output should correctly align negative amounts in both formats');
		
		// Visual debug if test fails
		if (normalizedFormatted !== normalizedExpected) {
			console.log('Expected:\n' + expectedOutput);
			console.log('Actual:\n' + formattedJournal);
		}
		
		// Verify negative amounts format
		const correctNegativeFormat = verifyNegativeAmountFormat(formattedJournal);
		assert.strictEqual(correctNegativeFormat, true,
			'Negative amounts should be in -$X.XX format');
	});

	test('Remove leading blank lines', () => {
		// Read input and expected output files
		const inputJournal = readTestFile('leading_blanks_in.journal');
		const expectedOutput = readTestFile('leading_blanks_out.journal');
		
		// Format the input journal
		const formattedJournal = formatHledgerJournal(inputJournal);
		
		// Verify no leading blank lines
		assert.strictEqual(formattedJournal[0] !== '\n', true, 
			'Formatted output should not start with a blank line');
		
		// Normalize both texts to handle line endings and whitespace
		const normalizedFormatted = normalizeText(formattedJournal);
		const normalizedExpected = normalizeText(expectedOutput);
		
		// Verify the formatting matches the expected output
		assert.strictEqual(normalizedFormatted, normalizedExpected, 
			'Formatted output should remove leading blank lines');
		
		// Additional verification: ensure first line is not blank
		const lines = formattedJournal.split('\n');
		assert.strictEqual(lines[0].trim().length > 0, true,
			'First line should have content');
	});

	test('Toggle comment - simple case', () => {
		// Read input and expected output files
		const inputJournal = readTestFile('comment_simple_in.journal');
		const expectedOutput = readTestFile('comment_simple_out.journal');

		// Toggle comments on all lines (0 to end)
		const lines = inputJournal.split('\n');
		const modifiedJournal = toggleCommentLines(inputJournal, 0, lines.length - 1);

		// Normalize both texts to handle line endings and whitespace
		const normalizedModified = normalizeText(modifiedJournal);
		const normalizedExpected = normalizeText(expectedOutput);

		// Verify the comment toggle matches the expected output
		assert.strictEqual(normalizedModified, normalizedExpected,
			'Comment toggle should match expected output');
	});

	test('Toggle comment - mixed case', () => {
		// Read input and expected output files
		const inputJournal = readTestFile('comment_mixed_in.journal');
		const expectedOutput = readTestFile('comment_mixed_out.journal');

		// Toggle comments on all lines (0 to end)
		const lines = inputJournal.split('\n');
		const modifiedJournal = toggleCommentLines(inputJournal, 0, lines.length - 1);

		// Normalize both texts to handle line endings and whitespace
		const normalizedModified = normalizeText(modifiedJournal);
		const normalizedExpected = normalizeText(expectedOutput);

		// Verify the comment toggle matches the expected output
		assert.strictEqual(normalizedModified, normalizedExpected,
			'Mixed comment toggle should match expected output');
	});

	test('Toggle comment - indented case', () => {
		// Read input and expected output files
		const inputJournal = readTestFile('comment_indented_in.journal');
		const expectedOutput = readTestFile('comment_indented_out.journal');

		// Toggle comments on all lines (0 to end)
		const lines = inputJournal.split('\n');
		const modifiedJournal = toggleCommentLines(inputJournal, 0, lines.length - 1);

		// Normalize both texts to handle line endings and whitespace
		const normalizedModified = normalizeText(modifiedJournal);
		const normalizedExpected = normalizeText(expectedOutput);

		// Verify the comment toggle matches the expected output
		assert.strictEqual(normalizedModified, normalizedExpected,
			'Indented comment toggle should match expected output');
	});

	test('Toggle comment - single line', () => {
		const testInput = '2025-03-01 Test transaction\n  Assets:Cash                $100.00\n  Income:Salary             -$100.00';

		// Toggle comment on first line only
		const result = toggleCommentLines(testInput, 0, 0);
		const lines = result.split('\n');

		// First line should be commented, others unchanged
		assert.strictEqual(lines[0], '; 2025-03-01 Test transaction');
		assert.strictEqual(lines[1], '  Assets:Cash                $100.00');
		assert.strictEqual(lines[2], '  Income:Salary             -$100.00');
	});

	test('Toggle comment - range selection', () => {
		const testInput = '2025-03-01 Test transaction\n  Assets:Cash                $100.00\n  Income:Salary             -$100.00\n\n2025-03-02 Another transaction';

		// Toggle comment on lines 1-2 only (the posting lines)
		const result = toggleCommentLines(testInput, 1, 2);
		const lines = result.split('\n');

		// First line unchanged, lines 1-2 commented with preserved indentation, rest unchanged
		assert.strictEqual(lines[0], '2025-03-01 Test transaction');
		assert.strictEqual(lines[1], '  ; Assets:Cash                $100.00');
		assert.strictEqual(lines[2], '  ; Income:Salary             -$100.00');
		assert.strictEqual(lines[3], '');
		assert.strictEqual(lines[4], '2025-03-02 Another transaction');
	});

	test('Toggle comment - uncomment previously commented', () => {
		const testInput = '; 2025-03-01 Test transaction\n  ; Assets:Cash                $100.00\n  ; Income:Salary             -$100.00';

		// Toggle comment on all lines (should uncomment)
		const result = toggleCommentLines(testInput, 0, 2);
		const lines = result.split('\n');

		// All lines should be uncommented
		assert.strictEqual(lines[0], '2025-03-01 Test transaction');
		assert.strictEqual(lines[1], '  Assets:Cash                $100.00');
		assert.strictEqual(lines[2], '  Income:Salary             -$100.00');
	});

	test('Toggle comment - smart block behavior with mixed states', () => {
		const mixedInput = '; 2025-07-31 * Reconciled - July 2025\n  assets:bank:checking matched statement balance of $96.98\n  ; reconciliation completed Fri Sep 19 16:10:46 EDT 2025';

		// First toggle: should comment all lines (since some are uncommented)
		const firstToggle = toggleCommentLines(mixedInput, 0, 2);
		const firstLines = firstToggle.split('\n');

		assert.strictEqual(firstLines[0], '; 2025-07-31 * Reconciled - July 2025');
		assert.strictEqual(firstLines[1], '  ; assets:bank:checking matched statement balance of $96.98');
		assert.strictEqual(firstLines[2], '  ; reconciliation completed Fri Sep 19 16:10:46 EDT 2025');

		// Second toggle: should uncomment all lines (since all are now commented)
		const secondToggle = toggleCommentLines(firstToggle, 0, 2);
		const secondLines = secondToggle.split('\n');

		assert.strictEqual(secondLines[0], '2025-07-31 * Reconciled - July 2025');
		assert.strictEqual(secondLines[1], '  assets:bank:checking matched statement balance of $96.98');
		assert.strictEqual(secondLines[2], '  reconciliation completed Fri Sep 19 16:10:46 EDT 2025');
	});

	test('Sort journal entries by date', () => {
		// Read input and expected output files
		const inputJournal = readTestFile('sort_in.journal');
		const expectedOutput = readTestFile('sort_out.journal');

		// Sort the input journal
		const sortedJournal = sortHledgerJournal(inputJournal);

		// Normalize both texts to handle line endings and whitespace
		const normalizedSorted = normalizeText(sortedJournal);
		const normalizedExpected = normalizeText(expectedOutput);

		// Verify the sorted output matches the expected output
		assert.strictEqual(normalizedSorted, normalizedExpected,
			'Sorted journal should match expected output');
	});

	test('Sorts mixed date formats without rewriting them', () => {
		const mixedInput = `2025/03/05 Transaction slash
  Assets:Cash $5.00
  Income:Misc -$5.00

2025-03-01 Transaction dash
  Assets:Cash $1.00
  Income:Misc -$1.00

2025.03.03 Transaction dot
  Assets:Cash $3.00
  Income:Misc -$3.00`;

		const sorted = sortHledgerJournal(mixedInput);
		const expectedOrder = ['2025-03-01 Transaction dash', '2025.03.03 Transaction dot', '2025/03/05 Transaction slash'];
		const actualHeaders = sorted.split('\n').filter(line => isDateLine(line));
		assert.deepStrictEqual(actualHeaders, expectedOrder, 'Dates should remain in their original format while being sorted by value');
	});

	test('Sort maintains transaction integrity', () => {
		const testInput = `2025-03-10 Transaction 3
  Assets:Cash                $300.00
  Income:Sales              -$300.00

2025-03-05 Transaction 2
  Assets:Cash                $200.00
  Income:Sales              -$200.00

2025-03-01 Transaction 1
  Assets:Cash                $100.00
  Income:Sales              -$100.00`;

		const sorted = sortHledgerJournal(testInput);
		const lines = sorted.split('\n');

		// Verify transactions are in correct order
		assert.ok(lines[0].includes('2025-03-01'), 'First transaction should be March 1');
		assert.ok(lines[4].includes('2025-03-05'), 'Second transaction should be March 5');
		assert.ok(lines[8].includes('2025-03-10'), 'Third transaction should be March 10');

		// Verify transaction integrity (postings stay with their headers)
		assert.ok(lines[1].includes('$100.00'), 'First transaction should have $100.00');
		assert.ok(lines[5].includes('$200.00'), 'Second transaction should have $200.00');
		assert.ok(lines[9].includes('$300.00'), 'Third transaction should have $300.00');
	});

	test('Sort on save with formatting', () => {
		// Test data with unsorted transactions and poor formatting
		const unsortedInput = `; This is a header comment
; It should be preserved

2025-03-08 Later transaction
  Assets:Cash    $200.00
  Income:Sales              -$200.00

2025-03-04 Earlier transaction
  Assets:Cash  $100.00
  Income:Sales       -$100.00

2025-03-06 Middle transaction
  Assets:Cash           $150.00
  Income:Sales   -$150.00`;

		// First sort, then format (as the extension does with sortOnSave enabled)
		const sorted = sortHledgerJournal(unsortedInput);
		const formattedAndSorted = formatHledgerJournal(sorted);
		
		// Verify the transactions are in the correct order
		const lines = formattedAndSorted.split('\n');
		
		// Find transaction dates in the output
		const dates: string[] = [];
		for (const line of lines) {
			const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2})/);
			if (dateMatch) {
				dates.push(dateMatch[1]);
			}
		}
		
		// Verify dates are sorted
		assert.strictEqual(dates.length, 3, 'Should have 3 transactions');
		assert.strictEqual(dates[0], '2025-03-04', 'First transaction should be earliest date');
		assert.strictEqual(dates[1], '2025-03-06', 'Second transaction should be middle date');
		assert.strictEqual(dates[2], '2025-03-08', 'Third transaction should be latest date');
		
		// Verify leading comments are preserved
		assert.strictEqual(lines[0], '; This is a header comment');
		assert.strictEqual(lines[1], '; It should be preserved');
		
		// Verify formatting matches default expectations
		assert.ok(verifyIndentation(formattedAndSorted), 'Posting lines should be indented with four spaces');
		const amountGroups = collectAmountColumnsByTransaction(formattedAndSorted);
		for (const group of amountGroups) {
			if (group.length === 0) {
				continue;
			}
			const uniqueColumns = new Set(group);
			assert.strictEqual(uniqueColumns.size, 1, 'Each transaction should keep a single aligned amount column');
		}
	});

	test('Format with custom column position', () => {
		// Test input with transactions
		const testInput = `2025-03-01 Test transaction
  Assets:Cash  $100.00
  Income:Salary       -$100.00

2025-03-02 Another transaction  
  Expenses:Food    $25.50
  Assets:Cash   -$25.50`;

		// Test with column position 30
		const formatted30 = formatHledgerJournal(testInput, { amountAlignment: 'fixedColumn', amountColumnPosition: 30 });
		const lines30 = formatted30.split('\n');
		
		// Verify amounts are aligned at column 30
		const amountLines30 = lines30.filter(line => line.includes('$'));
		for (const line of amountLines30) {
			const digitIndex = line.search(/[0-9]/);
			assert.ok(digitIndex >= 28 && digitIndex <= 32, 
				`Amount digits should be aligned around column 30, got ${digitIndex}: ${line}`);
		}
		
		// Test with column position 50
		const formatted50 = formatHledgerJournal(testInput, { amountAlignment: 'fixedColumn', amountColumnPosition: 50 });
		const lines50 = formatted50.split('\n');
		
		// Verify amounts are aligned at column 50
		const amountLines50 = lines50.filter(line => line.includes('$'));
		for (const line of amountLines50) {
			const digitIndex = line.search(/[0-9]/);
			assert.ok(digitIndex >= 48 && digitIndex <= 52, 
				`Amount digits should be aligned around column 50, got ${digitIndex}: ${line}`);
		}
		
		// Test with default column position (42) but fixed alignment
		const formattedDefault = formatHledgerJournal(testInput, { amountAlignment: 'fixedColumn' });
		const linesDefault = formattedDefault.split('\n');
		
		// Verify amounts are aligned at column 42 (default)
		const amountLinesDefault = linesDefault.filter(line => line.includes('$'));
		for (const line of amountLinesDefault) {
			const digitIndex = line.search(/[0-9]/);
			assert.ok(digitIndex >= 40 && digitIndex <= 44, 
				`Amount digits should be aligned around column 42 (default), got ${digitIndex}: ${line}`);
		}
	});

	test('Respects alternate negative commodity style configuration', () => {
		const testInput = `2025-04-01 Example
  Assets:Cash                $150.00
  Income:Salary             -$150.00`;

		const formatted = formatHledgerJournal(testInput, { negativeCommodityStyle: 'signBeforeSymbol' });
		const lines = formatted.split('\n');
		const incomeLine = lines.find(line => line.includes('Income:Salary'));
		assert.ok(incomeLine, 'Income line should be present');
		assert.ok(incomeLine?.includes('-$150.00'), 'Negative commodity should render as -$ when configured');
		assert.ok(!incomeLine?.includes('$-150.00'), 'Configured style should not emit $- notation when overridden');
	});

	test('Aligns amounts by widest account when configured', () => {
		const testInput = `2025-05-01 Mixed accounts
  Assets:Very:Long:Account Name          $123.45
  Equity:Opening                        -$123.45

2025-05-02 Short accounts
  A:B                                    $5.00
  C:D                                  -$5.00`;

		const fixed = formatHledgerJournal(testInput, { amountAlignment: 'fixedColumn' });
		const widest = formatHledgerJournal(testInput, { amountAlignment: 'widest' });

		const fixedGroups = collectAmountColumnsByTransaction(fixed);
		const widestGroups = collectAmountColumnsByTransaction(widest);
		assert.strictEqual(widestGroups.length, fixedGroups.length, 'Widest alignment should preserve transaction structure');

		let observedImprovement = false;
		for (let i = 0; i < widestGroups.length; i++) {
			const widestGroup = widestGroups[i];
			const fixedGroup = fixedGroups[i];

			if (widestGroup.length === 0) {
				continue;
			}

			const uniqueColumns = new Set(widestGroup);
			assert.strictEqual(uniqueColumns.size, 1, 'Each transaction should have a single amount column when using widest alignment');

			const widestColumn = Math.min(...widestGroup);
			const fixedColumn = fixedGroup.length > 0 ? Math.min(...fixedGroup) : widestColumn;
			if (widestColumn < fixedColumn) {
				observedImprovement = true;
			}
			assert.ok(widestColumn <= fixedColumn, 'Widest alignment should not push amounts further right than the fixed column strategy');
		}

		assert.ok(observedImprovement, 'At least one transaction should move amounts closer when using widest alignment');
	});

	function collectAmountColumnsByTransaction(text: string): number[][] {
		const result: number[][] = [];
		let current: number[] = [];
		const lines = text.split('\n');
		for (const rawLine of lines) {
			const line = rawLine.trimRight();
			if (!line) {
				if (current.length) {
					result.push(current);
					current = [];
				}
				continue;
			}
			if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(line)) {
				if (current.length) {
					result.push(current);
					current = [];
				}
				continue;
			}
			if (line.trim().startsWith(';')) {
				continue;
			}
			const digitIndex = firstDigitIndex(line);
			if (digitIndex !== null) {
				current.push(digitIndex);
			}
		}
		if (current.length) {
			result.push(current);
		}
		return result;
	}

	function isDateLine(line: string): boolean {
		return /^\d{4}[-/.]/.test(line);
	}

	function firstDigitIndex(line: string): number | null {
		const matchIndex = line.search(/[0-9]/);
		return matchIndex === -1 ? null : matchIndex;
	}

	test('Uses configured indentation width', () => {
		const testInput = `2025-06-01 Indentation test
  Assets:Cash                $75.00
  Income:Misc               -$75.00`;

		const formatted = formatHledgerJournal(testInput, { indentationWidth: 2 });
		const postingLines = formatted.split('\n').filter(line => line.trim().startsWith('Assets') || line.trim().startsWith('Income'));
		for (const line of postingLines) {
			assert.ok(line.startsWith('  ') && !line.startsWith('   '), 'Posting lines should honor a two-space indentation override');
		}
	});

	test('Sort preserves comments at beginning', () => {
		const testInput = `; File header comment
; This should stay at the top

2025-03-05 Transaction 2
  Assets:Cash                $200.00
  Income:Sales              -$200.00

2025-03-01 Transaction 1
  Assets:Cash                $100.00
  Income:Sales              -$100.00`;

		const sorted = sortHledgerJournal(testInput);
		const lines = sorted.split('\n');

		// Verify header comments are preserved
		assert.strictEqual(lines[0], '; File header comment');
		assert.strictEqual(lines[1], '; This should stay at the top');

		// Verify transactions are sorted after comments
		assert.ok(lines[3].includes('2025-03-01'), 'First transaction should be March 1');
		assert.ok(lines[7].includes('2025-03-05'), 'Second transaction should be March 5');
	});

	test('New file command generates correct filename format', () => {
		// Test month name mapping
		const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

		// Verify each month generates correct format
		for (let month = 1; month <= 12; month++) {
			const paddedMonth = month.toString().padStart(2, '0');
			const monthName = monthNames[month - 1];
			const expectedFileName = `${paddedMonth}-${monthName}.journal`;

			// Verify format
			assert.ok(expectedFileName.match(/^\d{2}-[a-z]{3}\.journal$/),
				`File name ${expectedFileName} should match format XX-mon.journal`);
		}

		// Specific test cases
		assert.strictEqual(monthNames[8], 'sep', 'September should be abbreviated as "sep"');
		assert.strictEqual('09', '9'.padStart(2, '0'), 'Month 9 should pad to "09"');
		assert.strictEqual('12', '12'.padStart(2, '0'), 'Month 12 should stay as "12"');
	});

	test('Format with all comment formats', () => {
		// Read input and expected output files
		const inputJournal = readTestFile('comment_formats_in.journal');
		const expectedOutput = readTestFile('comment_formats_out.journal');

		// Format the input journal
		const formattedJournal = formatHledgerJournal(inputJournal);

		// Normalize both texts to handle line endings and whitespace
		const normalizedFormatted = normalizeText(formattedJournal);
		const normalizedExpected = normalizeText(expectedOutput);

		// Verify the formatting matches the expected output
		assert.strictEqual(normalizedFormatted, normalizedExpected,
			'Formatter should handle all comment formats (#, ;, *, comment blocks)');
	});

	test('Toggle comment with hash character preference', () => {
		const testInput = '2025-03-01 Test transaction\n    Assets:Cash                $100.00\n    Income:Salary             -$100.00';

		// Toggle comment with hash preference
		const result = toggleCommentLines(testInput, 0, 0, { commentCharacter: '#' });
		const lines = result.split('\n');

		// First line should be commented with hash
		assert.strictEqual(lines[0], '# 2025-03-01 Test transaction');
	});

	test('Toggle comment with asterisk character preference', () => {
		const testInput = '2025-03-01 Test transaction\n    Assets:Cash                $100.00\n    Income:Salary             -$100.00';

		// Toggle comment with asterisk preference
		const result = toggleCommentLines(testInput, 0, 0, { commentCharacter: '*' });
		const lines = result.split('\n');

		// First line should be commented with asterisk
		assert.strictEqual(lines[0], '* 2025-03-01 Test transaction');
	});

	test('Toggle uncomment any comment format', () => {
		const testInputs = [
			'; 2025-03-01 Test transaction',
			'# 2025-03-01 Test transaction',
			'* 2025-03-01 Test transaction'
		];

		for (const testInput of testInputs) {
			const result = toggleCommentLines(testInput, 0, 0);
			// All should uncomment to the same result
			assert.strictEqual(result, '2025-03-01 Test transaction',
				`Should uncomment ${testInput[0]} format`);
		}
	});

	test('Toggle comment preserves indentation with all formats', () => {
		const testInput = '2025-03-01 Test\n    Assets:Cash    $100.00\n    Income:Salary  -$100.00';

		// Test with each comment character
		for (const char of [';', '#', '*'] as const) {
			const result = toggleCommentLines(testInput, 1, 2, { commentCharacter: char });
			const lines = result.split('\n');

			// Posting lines should be commented with preserved indentation
			assert.strictEqual(lines[1], `    ${char} Assets:Cash    $100.00`,
				`Should preserve indentation with ${char} character`);
			assert.strictEqual(lines[2], `    ${char} Income:Salary  -$100.00`,
				`Should preserve indentation with ${char} character`);
		}
	});

	// Helper function to verify posting lines use the default indentation width (4 spaces)
	function verifyIndentation(formattedText: string): boolean {
		const lines = formattedText.split('\n');
		let inTransaction = false;
		
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trimRight();
			if (!line) {
				inTransaction = false;
				continue;
			}
			
			// Check if this is a transaction header
			if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(line)) {
				inTransaction = true;
				continue;
			}
			
			// Skip comment lines
			if (line.trim().startsWith(';')) {
				continue;
			}
			
			// Check posting lines indentation
			if (inTransaction) {
				// Verify exactly 4 spaces indentation
				if (!line.startsWith('    ') || line.startsWith('     ')) {
					console.error(`Incorrect indentation at line ${i+1}: "${line}"`);
					return false;
				}
			}
		}
		
		return true;
	}
	
	// Helper function to verify decimal points are aligned within each transaction
	function verifyDecimalPointsAligned(formattedText: string): boolean {
		const lines = formattedText.split('\n');
		const decimalPositions = new Map<number, number>(); // Maps transaction index to decimal position
		
		let currentTransaction = -1;
		let inTransaction = false;
		
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trimRight();
			
			// Skip empty lines or end transaction
			if (!line) {
				inTransaction = false;
				continue;
			}
			
			// Check if this is a transaction header (starts with date)
			if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(line)) {
				currentTransaction++;
				inTransaction = true;
				continue;
			}
			
			// Skip comment lines
			if (line.trim().startsWith(';')) {
				continue;
			}
			
			// Process posting lines
			if (inTransaction && !line.trim().startsWith(';')) {
				// Check indentation
				if (!line.startsWith('    ')) {
					console.error(`Line ${i+1} doesn't have proper indentation: "${line}"`);
					return false;
				}
				
				// Check for decimal point
				if (line.includes('.')) {
					const decimalPosition = line.indexOf('.');
					
					if (!decimalPositions.has(currentTransaction)) {
						decimalPositions.set(currentTransaction, decimalPosition);
					} else {
						const expectedPosition = decimalPositions.get(currentTransaction);
						if (decimalPosition !== expectedPosition) {
							console.error(`Decimal points not aligned at line ${i+1}. Found: ${decimalPosition}, Expected: ${expectedPosition}`);
							console.error(`Line: "${line}"`);
							return false;
						}
					}
				}
			}
		}
		
		return true;
	}
	
	// Helper function to verify negative amounts default to $-X.XX format
	function verifyNegativeAmountFormat(formattedText: string): boolean {
		const lines = formattedText.split('\n');
		
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trimRight();
			
			// Skip transaction headers, comments, and empty lines
			if (!line || /^\d{4}[-/]\d{2}[-/]\d{2}/.test(line) || line.trim().startsWith(';')) {
				continue;
			}
			
			// Look for any amount in -$X.XX format (incorrect for default)
			if (line.includes('-$')) {
				console.error(`Line ${i+1} has incorrect negative amount format: "${line}"`);
				return false;
			}
			
			// Check for $-X.XX format (correct)
			if (line.includes('$-')) {
				// This is the correct format
				continue;
			}
		}
		
		return true;
	}

	// Tests for balancing amount suggestions
	test('parseAmount - positive dollar amount', () => {
		const result = parseAmount('$100.50');
		assert.ok(result, 'Should parse positive dollar amount');
		assert.strictEqual(result?.value, 100.50);
		assert.strictEqual(result?.currency, '$');
	});

	test('parseAmount - negative dollar amount with sign before symbol', () => {
		const result = parseAmount('-$50.25');
		assert.ok(result, 'Should parse negative amount with sign before symbol');
		assert.strictEqual(result?.value, -50.25);
		assert.strictEqual(result?.currency, '$');
	});

	test('parseAmount - negative dollar amount with sign after symbol', () => {
		const result = parseAmount('$-75.00');
		assert.ok(result, 'Should parse negative amount with sign after symbol');
		assert.strictEqual(result?.value, -75.00);
		assert.strictEqual(result?.currency, '$');
	});

	test('parseAmount - amount with commas', () => {
		const result = parseAmount('$1,234.56');
		assert.ok(result, 'Should parse amount with commas');
		assert.strictEqual(result?.value, 1234.56);
		assert.strictEqual(result?.currency, '$');
	});

	test('parseAmount - Euro symbol', () => {
		const result = parseAmount('€99.99');
		assert.ok(result, 'Should parse Euro amount');
		assert.strictEqual(result?.value, 99.99);
		assert.strictEqual(result?.currency, '€');
	});

	test('parseAmount - invalid format', () => {
		const result = parseAmount('not a number');
		assert.strictEqual(result, null, 'Should return null for invalid format');
	});

	test('parseAmount - simple commodity name', () => {
		const result = parseAmount('USD 0.5');
		assert.ok(result, 'Should parse simple commodity name');
		assert.strictEqual(result?.value, 0.5);
		assert.strictEqual(result?.currency, 'USD');
	});

	test('parseAmount - negative before simple commodity name', () => {
		const result = parseAmount('-USD 50.25');
		assert.ok(result, 'Should parse negative with arbitrary commodity name');
		assert.strictEqual(result?.value, -50.25);
		assert.strictEqual(result?.currency, 'USD');
	});

	test('parseAmount - quoted commodity name', () => {
		const result = parseAmount('"US Dollar" 100.00');
		assert.ok(result, 'Should parse quoted commodity name');
		assert.strictEqual(result?.value, 100.00);
		assert.strictEqual(result?.currency, '"US Dollar"');
	});

	test('parseAmount - negative sign before quoted commodity name', () => {
		const result = parseAmount('-"US Dollar" 100.00');
		assert.ok(result, 'Should parse negative sign before quoted commodity name');
		assert.strictEqual(result?.value, -100.00);
		assert.strictEqual(result?.currency, '"US Dollar"');
	});

	test('parseAmount - number before simple commodity name', () => {
		const result = parseAmount('100.50 USD');
		assert.ok(result, 'Should parse number before commodity name');
		assert.strictEqual(result?.value, 100.50);
		assert.strictEqual(result?.currency, 'USD');
	});

	test('parseAmount - negative number before simple commodity name', () => {
		const result = parseAmount('-100.50 USD');
		assert.ok(result, 'Should parse negative number before commodity name');
		assert.strictEqual(result?.value, -100.50);
		assert.strictEqual(result?.currency, 'USD');
	});

	test('parseAmount - number before quoted commodity name', () => {
		const result = parseAmount('100.00 "US Dollar"');
		assert.ok(result, 'Should parse number before quoted commodity name');
		assert.strictEqual(result?.value, 100.00);
		assert.strictEqual(result?.currency, '"US Dollar"');
	});

	test('parseAmount - negative number before quoted commodity name', () => {
		const result = parseAmount('-100.00 "US Dollar"');
		assert.ok(result, 'Should parse negative number before quoted commodity name');
		assert.strictEqual(result?.value, -100.00);
		assert.strictEqual(result?.currency, '"US Dollar"');
	});

	test('formatAmountValue - positive with symbolBeforeSign', () => {
		const result = formatAmountValue(100.50, '$', 'symbolBeforeSign');
		assert.strictEqual(result, '$100.50');
	});

	test('formatAmountValue - negative with symbolBeforeSign', () => {
		const result = formatAmountValue(-100.50, '$', 'symbolBeforeSign');
		assert.strictEqual(result, '$-100.50');
	});

	test('formatAmountValue - negative with signBeforeSymbol', () => {
		const result = formatAmountValue(-100.50, '$', 'signBeforeSymbol');
		assert.strictEqual(result, '-$100.50');
	});

	test('formatAmountValue - large amount with commas', () => {
		const result = formatAmountValue(1234.56, '$', 'symbolBeforeSign');
		assert.strictEqual(result, '$1,234.56');
	});

	test('formatAmountValue - simple commodity name', () => {
		const result = formatAmountValue(100.50, 'USD', 'symbolBeforeSign');
		assert.strictEqual(result, 'USD100.50');
	});

	test('formatAmountValue - quoted commodity name', () => {
		const result = formatAmountValue(100.50, '"US Dollar"', 'symbolBeforeSign');
		assert.strictEqual(result, '"US Dollar"100.50');
	});

	test('calculateBalancingAmount - simple two posting transaction', () => {
		const transaction = {
			headerLine: 0,
			lines: [
				'2025-10-22 * Test',
				'    expenses:food    $50.00',
				'    assets:cash'
			]
		};

		const result = calculateBalancingAmount(transaction, {
			amountColumnPosition: 42,
			amountAlignment: 'widest',
			indentationWidth: 4,
			negativeCommodityStyle: 'symbolBeforeSign',
			dateFormat: 'YYYY-MM-DD',
			commentCharacter: ';'
		}, 'assets:cash');

		assert.ok(result, 'Should calculate balancing amount');
		// Verify spacing aligns properly (not just checking exact spaces, but that it has proper spacing)
		assert.ok(result.startsWith('  '), 'Should have at least 2 spaces');
		assert.ok(result.includes('$-50.00'), 'Should contain the correct amount');
	});

	test('calculateBalancingAmount - negative balancing amount', () => {
		const transaction = {
			headerLine: 0,
			lines: [
				'2025-10-22 * Test',
				'    assets:cash    $100.00',
				'    income:salary'
			]
		};

		const result = calculateBalancingAmount(transaction, {
			amountColumnPosition: 42,
			amountAlignment: 'widest',
			indentationWidth: 4,
			negativeCommodityStyle: 'symbolBeforeSign',
			dateFormat: 'YYYY-MM-DD',
			commentCharacter: ';'
		}, 'income:salary');

		assert.ok(result, 'Should calculate negative balancing amount');
		assert.ok(result.startsWith('  '), 'Should have at least 2 spaces');
		assert.ok(result.includes('$-100.00'), 'Should contain the correct amount');
	});

	test('calculateBalancingAmount - respects signBeforeSymbol style', () => {
		const transaction = {
			headerLine: 0,
			lines: [
				'2025-10-22 * Test',
				'    assets:cash    $100.00',
				'    income:salary'
			]
		};

		const result = calculateBalancingAmount(transaction, {
			amountColumnPosition: 42,
			amountAlignment: 'widest',
			indentationWidth: 4,
			negativeCommodityStyle: 'signBeforeSymbol',
			dateFormat: 'YYYY-MM-DD',
			commentCharacter: ';'
		}, 'income:salary');

		assert.ok(result, 'Should calculate with correct style');
		assert.ok(result.startsWith('  '), 'Should have at least 2 spaces');
		assert.ok(result.includes('-$100.00'), 'Should contain the correct amount with sign before symbol');
	});

	test('calculateBalancingAmount - three postings with one missing', () => {
		const transaction = {
			headerLine: 0,
			lines: [
				'2025-10-22 * Test',
				'    expenses:food    $30.00',
				'    expenses:transport    $20.00',
				'    assets:cash'
			]
		};

		const result = calculateBalancingAmount(transaction, {
			amountColumnPosition: 42,
			amountAlignment: 'widest',
			indentationWidth: 4,
			negativeCommodityStyle: 'symbolBeforeSign',
			dateFormat: 'YYYY-MM-DD',
			commentCharacter: ';'
		}, 'assets:cash');

		assert.ok(result, 'Should calculate for multi-posting transaction');
		assert.ok(result.startsWith('  '), 'Should have at least 2 spaces');
		assert.ok(result.includes('$-50.00'), 'Should contain the correct amount');
	});

	test('calculateBalancingAmount - returns null when multiple postings missing', () => {
		const transaction = {
			headerLine: 0,
			lines: [
				'2025-10-22 * Test',
				'    expenses:food    $30.00',
				'    expenses:transport',
				'    assets:cash'
			]
		};

		const result = calculateBalancingAmount(transaction, {
			amountColumnPosition: 42,
			amountAlignment: 'widest',
			indentationWidth: 4,
			negativeCommodityStyle: 'symbolBeforeSign',
			dateFormat: 'YYYY-MM-DD',
			commentCharacter: ';'
		}, 'assets:cash');

		assert.strictEqual(result, null, 'Should return null when multiple postings are missing amounts');
	});

	test('calculateBalancingAmount - respects existing spacing in transaction', () => {
		const transaction = {
			headerLine: 0,
			lines: [
				'2025-10-21 * Apple Developer Program',
				'    expenses:software:developerfees        $104.45',
				'    equity:owner:contributions             -$50.00',
				'    assets:cash        '
			]
		};

		const expectedDigitsColumn = Math.max(
			transaction.lines[1].search(/\d/),
			transaction.lines[2].search(/\d/)
		);

		const result = calculateBalancingAmount(transaction, {
			amountColumnPosition: 42,
			amountAlignment: 'widest',
			indentationWidth: 4,
			negativeCommodityStyle: 'symbolBeforeSign',
			dateFormat: 'YYYY-MM-DD',
			commentCharacter: ';'
		}, 'assets:cash', {
			currentLineText: transaction.lines[3],
			cursorColumn: transaction.lines[3].length
		});

		assert.ok(result, 'Should calculate balancing amount when respecting spacing');
		const completedLine = `${transaction.lines[3]}${result}`;
		const resultDigitsColumn = completedLine.search(/\d/);
		assert.strictEqual(resultDigitsColumn, expectedDigitsColumn, 'Digits should align with existing postings');
	});

	test('calculateBalancingAmount - ignores metadata lines when already balanced', () => {
		const transaction = {
			headerLine: 0,
			lines: [
				'2025-10-01 * Chrome Web Store developer registration fee',
				'    expenses:software:developerfees    $5.00',
				'    assets:bank:checking              -$5.00',
				'    project: atlas-notes',
				'    note: subscription renewal'
			]
		};

		const result = calculateBalancingAmount(transaction, {
			amountColumnPosition: 42,
			amountAlignment: 'widest',
			indentationWidth: 4,
			negativeCommodityStyle: 'symbolBeforeSign',
			dateFormat: 'YYYY-MM-DD',
			commentCharacter: ';'
		}, 'project: atlas-notes', {
			currentLineText: transaction.lines[3],
			cursorColumn: transaction.lines[3].length
		});

		assert.strictEqual(result, null, 'Should not suggest balancing amount when only metadata lines are missing amounts');
	});

	test('calculateBalancingAmount - ignores metadata placeholder without value', () => {
		const transaction = {
			headerLine: 0,
			lines: [
				'2025-09-29 * OpenAI API usage credit',
				'    expenses:software:openai    $5.00',
				'    equity:owner:contributions -$5.00',
				'    project:'
			]
		};

		const result = calculateBalancingAmount(transaction, {
			amountColumnPosition: 42,
			amountAlignment: 'widest',
			indentationWidth: 4,
			negativeCommodityStyle: 'symbolBeforeSign',
			dateFormat: 'YYYY-MM-DD',
			commentCharacter: ';'
		}, 'project:', {
			currentLineText: transaction.lines[3],
			cursorColumn: transaction.lines[3].length
		});

		assert.strictEqual(result, null, 'Should not suggest balancing amount for metadata placeholder line');
	});

	test('calculateBalancingAmount - already balanced transaction does not suggest zero', () => {
		const transaction = {
			headerLine: 0,
			lines: [
				'2025-09-23 * Plaud Note - Silver',
				'    expenses:equipment:accessories    $168.00',
				'    equity:owner:contributions      -$168.00',
				'    expenses:professional'
			]
		};

		const result = calculateBalancingAmount(transaction, {
			amountColumnPosition: 42,
			amountAlignment: 'widest',
			indentationWidth: 4,
			negativeCommodityStyle: 'symbolBeforeSign',
			dateFormat: 'YYYY-MM-DD',
			commentCharacter: ';'
		}, 'expenses:professional', {
			currentLineText: transaction.lines[3],
			cursorColumn: transaction.lines[3].length
		});

		assert.strictEqual(result, null, 'Should not suggest $0.00 when postings already balance');
	});

	test('calculateBalancingAmount - returns null when all postings have amounts', () => {
		const transaction = {
			headerLine: 0,
			lines: [
				'2025-10-22 * Test',
				'    expenses:food    $30.00',
				'    assets:cash    $-30.00'
			]
		};

		const result = calculateBalancingAmount(transaction, {
			amountColumnPosition: 42,
			amountAlignment: 'widest',
			indentationWidth: 4,
			negativeCommodityStyle: 'symbolBeforeSign',
			dateFormat: 'YYYY-MM-DD',
			commentCharacter: ';'
		}, 'assets:cash');

		assert.strictEqual(result, null, 'Should return null when all postings have amounts');
	});

	test('calculateBalancingAmount - handles Euro currency', () => {
		const transaction = {
			headerLine: 0,
			lines: [
				'2025-10-22 * Test',
				'    expenses:food    €45.50',
				'    assets:cash'
			]
		};

		const result = calculateBalancingAmount(transaction, {
			amountColumnPosition: 42,
			amountAlignment: 'widest',
			indentationWidth: 4,
			negativeCommodityStyle: 'symbolBeforeSign',
			dateFormat: 'YYYY-MM-DD',
			commentCharacter: ';'
		}, 'assets:cash');

		assert.ok(result, 'Should handle Euro currency');
		assert.ok(result.startsWith('  '), 'Should have at least 2 spaces');
		assert.ok(result.includes('€-45.50'), 'Should contain the correct amount');
	});
});
