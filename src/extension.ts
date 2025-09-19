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

	// Register formatter provider for hledger file types
	const formatterProvider = vscode.languages.registerDocumentFormattingEditProvider(
		[
			{ scheme: 'file', pattern: '**/*.journal' },
			{ scheme: 'file', pattern: '**/*.hledger' },
			{ scheme: 'file', pattern: '**/*.ledger' }
		],
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

	// Register range formatter as well for selection formatting
	const rangeFormatterProvider = vscode.languages.registerDocumentRangeFormattingEditProvider(
		[
			{ scheme: 'file', pattern: '**/*.journal' },
			{ scheme: 'file', pattern: '**/*.hledger' },
			{ scheme: 'file', pattern: '**/*.ledger' }
		],
		{
			provideDocumentRangeFormattingEdits(
				document: vscode.TextDocument,
				range: vscode.Range
			): vscode.TextEdit[] {
				// For simplicity, we'll format the entire document
				// A more advanced implementation could format just the selected transactions
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

	// Toggle comment command for hledger files
	const toggleCommentCommand = vscode.commands.registerCommand('hledger-formatter.toggleComment', () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			return;
		}

		const document = editor.document;

		// Check if this is a hledger journal file
		if (!document.fileName.endsWith('.journal') &&
			!document.fileName.endsWith('.hledger') &&
			!document.fileName.endsWith('.ledger')) {
			return;
		}

		const selection = editor.selection;
		const startLine = selection.start.line;
		const endLine = selection.end.line;
		const text = document.getText();

		const modifiedText = toggleCommentLines(text, startLine, endLine);

		editor.edit((editBuilder) => {
			const fullRange = new vscode.Range(
				document.positionAt(0),
				document.positionAt(text.length)
			);
			editBuilder.replace(fullRange, modifiedText);
		});
	});

	context.subscriptions.push(formatCommand, formatOnSaveDisposable, formatterProvider, rangeFormatterProvider, toggleCommentCommand);
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

	// Format header line to normalize spaces
	const headerLine = lines[0];
	const formattedHeader = formatTransactionHeader(headerLine);
	
	const formattedLines: string[] = [formattedHeader]; // Use formatted header
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
		
		// Enhanced regex to better handle various amount formats including $-85.50
		const accountAmountSeparator = /\s{2,}|\t+/; // Two or more spaces or tabs
		const parts = trimmed.split(accountAmountSeparator);
		
		if (parts.length >= 2) {
			// We have an account and amount with clear separation
			const account = parts[0].trim();
			let amount = parts.slice(1).join(' ').trim(); // Join in case there were multiple parts
			
			// Check if this is a negative amount (either $- format or -$ format)
			const isNegative = amount.match(/^\$-/) || amount.match(/^-\$/);
			
			// Transform $-X.XX to -$X.XX format
			const currencyNegativeRegex = /^(\$|€|£|¥)-(\d+(?:,\d+)*(?:\.\d+)?)/;
			amount = amount.replace(currencyNegativeRegex, '-$1$2');
			
			// Calculate padding needed to align all amounts at the fixed column
			// Subtract 1 from padding for negative amounts to maintain alignment
			const paddingNeeded = Math.max(1, fixedAmountColumn - (indentStr.length + account.length) - (isNegative ? 1 : 0));
			
			formattedLines.push(`${indentStr}${account}${' '.repeat(paddingNeeded)}${amount}`);
		} else {
			// Fallback: Try to extract account and amount with a regex pattern
			// This handles cases where there might not be clear spacing
			const fallbackMatch = trimmed.match(/^(\S+(?:\s+\S+)*?)(?:\s*)(\$-?\d+(?:\.\d+)?|\-\$\d+(?:\.\d+)?|\d+(?:\.\d+)?)$/);
			
			if (fallbackMatch) {
				const account = fallbackMatch[1].trim();
				let amount = fallbackMatch[2].trim();
				
				// Check if this is a negative amount (either $- format or -$ format)
				const isNegative = amount.match(/^\$-/) || amount.match(/^-\$/);
				
				// Transform $-X.XX to -$X.XX format
				const currencyNegativeRegex = /^(\$|€|£|¥)-(\d+(?:,\d+)*(?:\.\d+)?)/;
				amount = amount.replace(currencyNegativeRegex, '-$1$2');
				
				// Calculate padding needed to align all amounts at the fixed column
				// Subtract 1 from padding for negative amounts to maintain alignment
				const paddingNeeded = Math.max(1, fixedAmountColumn - (indentStr.length + account.length) - (isNegative ? 1 : 0));
				
				formattedLines.push(`${indentStr}${account}${' '.repeat(paddingNeeded)}${amount}`);
			} else {
				// Line might have just an account with no amount, or unusual formatting
				formattedLines.push(`${indentStr}${trimmed}`);
			}
		}
	}
	
	return formattedLines;
}

/**
 * Formats a transaction header by normalizing spaces between date, status marker, and description
 * @param headerLine The transaction header line
 * @returns Formatted transaction header line
 */
function formatTransactionHeader(headerLine: string): string {
	// Match date, optional status marker (*,!), and description
	const headerMatch = headerLine.match(/^(\d{4}[/-]\d{2}[/-]\d{2})(?:\s+)([*!])?(?:\s*)(.*)$/);
	
	if (headerMatch) {
		const date = headerMatch[1];
		const statusMarker = headerMatch[2] || '';
		const description = headerMatch[3];
		
		// Create properly formatted header with single spaces
		if (statusMarker) {
			return `${date} ${statusMarker} ${description}`;
		} else {
			return `${date} ${description}`;
		}
	}
	
	// If no match, return the original line
	return headerLine;
}

/**
 * Toggles comments on specified lines of hledger journal text
 * @param text The original journal text
 * @param startLine Zero-based start line number
 * @param endLine Zero-based end line number
 * @returns The text with comments toggled on the specified lines
 */
export function toggleCommentLines(text: string, startLine: number, endLine: number): string {
	const lines = text.split('\n');

	for (let lineNumber = startLine; lineNumber <= endLine && lineNumber < lines.length; lineNumber++) {
		const lineText = lines[lineNumber];

		// Check if line is commented (with preserved indentation)
		const commentMatch = lineText.match(/^(\s*); (.*)$/);

		if (commentMatch) {
			// Uncomment: restore original whitespace and content
			const [, leadingWhitespace, content] = commentMatch;
			lines[lineNumber] = `${leadingWhitespace}${content}`;
		} else if (lineText.trim()) {
			// Comment: preserve leading whitespace and add "; " after it
			const leadingWhitespace = lineText.match(/^\s*/)?.[0] || '';
			const restOfLine = lineText.substring(leadingWhitespace.length);
			lines[lineNumber] = `${leadingWhitespace}; ${restOfLine}`;
		}
	}

	return lines.join('\n');
}

// This method is called when your extension is deactivated
export function deactivate() {}


