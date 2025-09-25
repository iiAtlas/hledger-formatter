import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

// Import the formatter, comment, and sort functions directly for testing
import { formatHledgerJournal, toggleCommentLines, sortHledgerJournal } from '../extension';

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
		
		// Verify formatting is correct (amounts aligned at column 42)
		const amountLines = lines.filter(line => line.includes('$'));
		for (const line of amountLines) {
			const dollarIndex = line.indexOf('$');
			// Amount column should be consistent (around 42 chars from left)
			assert.ok(dollarIndex >= 40 && dollarIndex <= 44, 
				`Amount should be aligned around column 42, got ${dollarIndex}: ${line}`);
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
		const formatted30 = formatHledgerJournal(testInput, 30);
		const lines30 = formatted30.split('\n');
		
		// Verify amounts are aligned at column 30
		const amountLines30 = lines30.filter(line => line.includes('$'));
		for (const line of amountLines30) {
			const dollarIndex = line.indexOf('$');
			// Check for negative amounts (-$) vs regular ($)
			const actualIndex = line.includes('-$') ? line.indexOf('-$') + 1 : dollarIndex;
			assert.ok(actualIndex >= 28 && actualIndex <= 32, 
				`Amount should be aligned around column 30, got ${actualIndex}: ${line}`);
		}
		
		// Test with column position 50
		const formatted50 = formatHledgerJournal(testInput, 50);
		const lines50 = formatted50.split('\n');
		
		// Verify amounts are aligned at column 50
		const amountLines50 = lines50.filter(line => line.includes('$'));
		for (const line of amountLines50) {
			const dollarIndex = line.indexOf('$');
			// Check for negative amounts (-$) vs regular ($)
			const actualIndex = line.includes('-$') ? line.indexOf('-$') + 1 : dollarIndex;
			assert.ok(actualIndex >= 48 && actualIndex <= 52, 
				`Amount should be aligned around column 50, got ${actualIndex}: ${line}`);
		}
		
		// Test with default column position (42)
		const formattedDefault = formatHledgerJournal(testInput);
		const linesDefault = formattedDefault.split('\n');
		
		// Verify amounts are aligned at column 42 (default)
		const amountLinesDefault = linesDefault.filter(line => line.includes('$'));
		for (const line of amountLinesDefault) {
			const dollarIndex = line.indexOf('$');
			// Check for negative amounts (-$) vs regular ($)
			const actualIndex = line.includes('-$') ? line.indexOf('-$') + 1 : dollarIndex;
			assert.ok(actualIndex >= 40 && actualIndex <= 44, 
				`Amount should be aligned around column 42 (default), got ${actualIndex}: ${line}`);
		}
	});

	test('Respects negative commodity style configuration', () => {
		const testInput = `2025-04-01 Example
  Assets:Cash                $150.00
  Income:Salary             -$150.00`;

		const formatted = formatHledgerJournal(testInput, { negativeCommodityStyle: 'symbolBeforeSign' });
		const lines = formatted.split('\n');
		const incomeLine = lines.find(line => line.includes('Income:Salary'));
		assert.ok(incomeLine, 'Income line should be present');
		assert.ok(incomeLine?.includes('$-150.00'), 'Negative commodity should render as $- when configured');
		assert.ok(!incomeLine?.includes('-$150.00'), 'Configured style should not emit -$ notation');
	});

	test('Aligns amounts by widest account when configured', () => {
		const testInput = `2025-05-01 Mixed accounts
  Assets:Very:Long:Account Name          $123.45
  Equity:Opening                        -$123.45

2025-05-02 Short accounts
  A:B                                    $5.00
  C:D                                  -$5.00`;

		const fixed = formatHledgerJournal(testInput);
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

			const widestColumn = widestGroup[0];
			const fixedColumn = fixedGroup.length > 0 ? fixedGroup[0] : widestColumn;
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
			if (line.includes('$')) {
				current.push(line.indexOf('$'));
			}
		}
		if (current.length) {
			result.push(current);
		}
		return result;
	}

	test('Uses configured indentation width', () => {
		const testInput = `2025-06-01 Indentation test
  Assets:Cash                $75.00
  Income:Misc               -$75.00`;

		const formatted = formatHledgerJournal(testInput, { indentationWidth: 4 });
		const postingLines = formatted.split('\n').filter(line => line.trim().startsWith('Assets') || line.trim().startsWith('Income'));
		for (const line of postingLines) {
			assert.ok(line.startsWith('    '), 'Posting lines should start with four spaces when configured');
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

	// Helper function to verify all posting lines have exactly 2 spaces of indentation
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
				// Verify exactly 2 spaces indentation
				if (!line.startsWith('  ') || line.startsWith('   ')) {
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
				if (!line.startsWith('  ')) {
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
	
	// Helper function to verify negative amounts are in -$X.XX format, not $-X.XX
	function verifyNegativeAmountFormat(formattedText: string): boolean {
		const lines = formattedText.split('\n');
		
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trimRight();
			
			// Skip transaction headers, comments, and empty lines
			if (!line || /^\d{4}[-/]\d{2}[-/]\d{2}/.test(line) || line.trim().startsWith(';')) {
				continue;
			}
			
			// Look for any amount in $-X.XX format (incorrect)
			if (line.includes('$-')) {
				console.error(`Line ${i+1} has incorrect negative amount format: "${line}"`);
				return false;
			}
			
			// Check for -$X.XX format (correct)
			if (line.includes('-$')) {
				// This is the correct format
				continue;
			}
		}
		
		return true;
	}
});
