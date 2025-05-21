import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

// Import the formatter function directly for testing
import { formatHledgerJournal } from '../extension';

suite('Hledger Formatter Tests', () => {
	vscode.window.showInformationMessage('Running hledger formatter tests');

	const samplesPath = path.join(__dirname, '..', '..', 'samples');
	
	// Helper function to read sample files
	function readSampleFile(filename: string): string {
		const filePath = path.join(samplesPath, filename);
		return fs.readFileSync(filePath, 'utf8');
	}

	// Helper function to validate basic formatting (without decimal alignment)
	function validateBasicFormatting(formattedText: string) {
		// Split into lines for validation
		const lines = formattedText.split('\n');
		
		// Track if we're in a transaction
		let inTransaction = false;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trimEnd(); // Remove trailing whitespace
			
			// Skip empty lines
			if (!line) {
				continue;
			}
			
			// Comments outside transactions - no validation needed
			if (line.trim().startsWith(';') && !inTransaction) {
				continue;
			}

			// Check if this is a transaction header (starts with date)
			const isTransactionHeader = /^\d{4}[-/]\d{2}[-/]\d{2}/.test(line);
			
			if (isTransactionHeader) {
				inTransaction = true;
			} else if (inTransaction && !line.trim().startsWith(';')) {
				// This is a posting line - verify indentation
				assert.strictEqual(line.startsWith('  '), true, 
					`Line ${i+1} should start with exactly 2 spaces: "${line}"`);
			}
			
			// Check if we've reached the end of a transaction
			if (inTransaction && !line) {
				inTransaction = false;
			}
		}
	}

	// Helper function to validate precise decimal alignment
	function validateDecimalAlignment(formattedText: string) {
		// Split into lines for validation
		const lines = formattedText.split('\n');
		const decimalIndices = new Map<number, number>(); // Map transaction index to decimal point position
		
		let currentTransaction = -1;
		let inTransaction = false;
		
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trimEnd();
			if (!line) {
				if (inTransaction) {
					inTransaction = false;
				}
				continue;
			}
			
			// Check if this is a transaction header
			if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(line)) {
				currentTransaction++;
				inTransaction = true;
			} else if (inTransaction && line.includes('.') && !line.trim().startsWith(';')) {
				const decimalIndex = line.indexOf('.');
				
				if (!decimalIndices.has(currentTransaction)) {
					decimalIndices.set(currentTransaction, decimalIndex);
				} else {
					const expectedIndex = decimalIndices.get(currentTransaction);
					assert.strictEqual(decimalIndex, expectedIndex,
						`Decimal points should align within transaction. Line: "${line}", Expected index: ${expectedIndex}`);
				}
			}
		}
	}

	test('Basic sample file formatting', () => {
		const sampleText = readSampleFile('sample.journal');
		const formattedText = formatHledgerJournal(sampleText);
		
		// Verify basic formatting
		assert.notStrictEqual(formattedText, sampleText, 'Formatting should change inconsistent spacing');
		validateBasicFormatting(formattedText);
	});

	test('Complex journal file formatting', () => {
		const sampleText = readSampleFile('complex.journal');
		const formattedText = formatHledgerJournal(sampleText);
		
		// Verify complex formatting
		validateBasicFormatting(formattedText);
	});

	test('User format preservation', () => {
		const sampleText = readSampleFile('user_format.journal');
		const formattedText = formatHledgerJournal(sampleText);
		
		// Well-formatted files should remain mostly unchanged except for standardization
		validateBasicFormatting(formattedText);
		validateDecimalAlignment(formattedText);
	});

	test('Inconsistent indentation fixing', () => {
		const sampleText = readSampleFile('inconsistent_indents.journal');
		const formattedText = formatHledgerJournal(sampleText);
		
		// Verify indentation is fixed
		const lines = formattedText.split('\n');
		let inTransaction = false;
		
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trimEnd();
			if (!line) {
				continue;
			}
			
			// Check if this is a transaction header
			if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(line)) {
				inTransaction = true;
			} else if (inTransaction && !line.trim().startsWith(';')) {
				// Verify exactly 2 spaces of indentation for posting lines
				assert.strictEqual(line.startsWith('  ') && line[2] !== ' ', true,
					`Line should have exactly 2 spaces of indentation: "${line}"`);
			}
		}
		
		validateBasicFormatting(formattedText);
		validateDecimalAlignment(formattedText);
	});

	test('Decimal point alignment', () => {
		const sampleText = readSampleFile('decimal_alignment.journal');
		const formattedText = formatHledgerJournal(sampleText);
		
		// Verify decimal points are aligned
		validateBasicFormatting(formattedText);
		validateDecimalAlignment(formattedText);
	});
});
