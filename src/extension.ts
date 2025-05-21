// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "hledger-formatter" is now active!');

	// Format hledger journal command
	const formatCommand = vscode.commands.registerCommand('hledger-formatter.formatDocument', () => {
		const editor = vscode.window.activeTextEditor;
		
		if (!editor) {
			vscode.window.showInformationMessage('No active editor found.');
			return;
		}
		
		const document = editor.document;
		
		// Check if this is a hledger journal file
		if (!document.fileName.endsWith('.journal') && 
			!document.fileName.endsWith('.hledger') && 
			!document.fileName.endsWith('.ledger')) {
			vscode.window.showInformationMessage('Not a hledger journal file.');
			return;
		}

		const text = document.getText();
		const formattedText = formatHledgerJournal(text);
		
		editor.edit((editBuilder) => {
			const fullRange = new vscode.Range(
				document.positionAt(0),
				document.positionAt(text.length)
			);
			editBuilder.replace(fullRange, formattedText);
		}).then(success => {
			if (success) {
				vscode.window.showInformationMessage('Hledger journal formatted successfully.');
			} else {
				vscode.window.showErrorMessage('Failed to format hledger journal.');
			}
		});
	});

	// Format on save
	const formatOnSaveDisposable = vscode.workspace.onWillSaveTextDocument((event) => {
		const document = event.document;
		
		// Check if this is a hledger journal file and if format on save is enabled
		if ((document.fileName.endsWith('.journal') || 
			 document.fileName.endsWith('.hledger') || 
			 document.fileName.endsWith('.ledger')) && 
			vscode.workspace.getConfiguration('hledger-formatter').get('formatOnSave', true)) {
			
			const text = document.getText();
			const formattedText = formatHledgerJournal(text);
			
			event.waitUntil(Promise.resolve([
				new vscode.TextEdit(
					new vscode.Range(
						document.positionAt(0),
						document.positionAt(text.length)
					),
					formattedText
				)
			]));
		}
	});

	// Register formatter provider
	const formatterProvider = vscode.languages.registerDocumentFormattingEditProvider(
		[{ language: 'plaintext', pattern: '**/*.{journal,hledger,ledger}' }],
		{
			provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
				const text = document.getText();
				const formattedText = formatHledgerJournal(text);
				
				return [
					new vscode.TextEdit(
						new vscode.Range(
							document.positionAt(0),
							document.positionAt(text.length)
						),
						formattedText
					)
				];
			}
		}
	);

	context.subscriptions.push(formatCommand, formatOnSaveDisposable, formatterProvider);
}

/**
 * Formats a hledger journal text by aligning account names and amounts
 * @param text The original journal text
 * @returns The formatted journal text
 */
export function formatHledgerJournal(text: string): string {
	// Split the text into transactions
	const lines = text.split('\n');
	const formattedLines: string[] = [];
	
	let inTransaction = false;
	let transactionLines: string[] = [];
	
	// Process line by line
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		
		// Skip empty lines or keep them as-is
		if (!line.trim()) {
			if (inTransaction) {
				// End of transaction
				formattedLines.push(...formatTransaction(transactionLines));
				transactionLines = [];
				inTransaction = false;
			}
			formattedLines.push(line);
			continue;
		}
		
		// Comment lines
		if (line.trim().startsWith(';')) {
			if (inTransaction) {
				// Comments within transactions are part of the transaction
				transactionLines.push(line);
			} else {
				formattedLines.push(line);
			}
			continue;
		}
		
		// Check if this is a transaction header (date at the beginning)
		const isTransactionHeader = /^\d{4}[/-]\d{2}[/-]\d{2}/.test(line.trim());
		
		if (isTransactionHeader) {
			if (inTransaction) {
				// End previous transaction and format it
				formattedLines.push(...formatTransaction(transactionLines));
				transactionLines = [];
			}
			
			// Start new transaction
			inTransaction = true;
			transactionLines.push(line);
		} else if (inTransaction) {
			// Posting line within transaction
			transactionLines.push(line);
		} else {
			// Neither transaction header nor posting, keep as-is
			formattedLines.push(line);
		}
	}
	
	// Format the last transaction if any
	if (inTransaction && transactionLines.length > 0) {
		formattedLines.push(...formatTransaction(transactionLines));
	}
	
	return formattedLines.join('\n');
}

/**
 * Formats a single transaction by aligning account names and amounts
 * @param lines Lines of a transaction including header and postings
 * @returns Formatted transaction lines
 */
function formatTransaction(lines: string[]): string[] {
	if (lines.length <= 1) {
		return lines;
	}

	const formattedLines: string[] = [lines[0]]; // Keep the header line as is
	const postingLines: string[] = [];
	
	// Find posting lines (non-comment lines after header)
	for (let i = 1; i < lines.length; i++) {
		if (!lines[i].trim().startsWith(';')) {
			postingLines.push(lines[i]);
		} else {
			// Keep comment lines as-is
			formattedLines.push(lines[i]);
		}
	}
	
	if (postingLines.length === 0) {
		return formattedLines;
	}
	
	// Fixed column position for all amounts (42 characters from the left)
	const fixedAmountColumn = 42;
	
	// Process each posting line
	for (const line of postingLines) {
		// Always use exactly 2 spaces for indentation
		const indentStr = '  ';
		
		// Extract account and amount
		const trimmed = line.trim();
		const match = trimmed.match(/^([^;$€£¥\s][^$€£¥]*?)(?:\s\s+|\t+)([-+]?[$€£¥]?[\d,\.]+(?:\s+[$€£¥])?(?:\s+[@=][\s\S]*)?(?:\s*;[\s\S]*)?)?$/);
		
		if (match) {
			// Line has clear separation between account and amount
			const account = match[1].trim();
			const amount = match[2].trim();
			
			// Find position of decimal point in the amount
			const decimalIndex = amount.indexOf('.');
			
			// Count characters before decimal point (including currency symbol and negative sign)
			const charsBeforeDecimal = decimalIndex > 0 ? decimalIndex : amount.length;
			
			// For amounts with negative signs, add one less padding to align decimal points
			const isNegative = amount.startsWith('-');
			
			// Calculate padding needed to align the amount at the fixed column
			// Adjust for negative numbers to align decimal points
			const paddingNeeded = Math.max(1, fixedAmountColumn - (indentStr.length + account.length + (isNegative ? 1 : 0)));
			
			formattedLines.push(`${indentStr}${account}${' '.repeat(paddingNeeded)}${amount}`);
		} else {
			// Line might have just an account with no amount, or unusual formatting
			formattedLines.push(`${indentStr}${trimmed}`);
		}
	}
	
	return formattedLines;
}

// This method is called when your extension is deactivated
export function deactivate() {}


