import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

// Import the formatter function directly for testing
import { formatHledgerJournal } from '../extension';

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
});
