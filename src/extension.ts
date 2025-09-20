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
		const config = vscode.workspace.getConfiguration('hledger-formatter');
		const amountColumnPosition = config.get('amountColumnPosition', 42);
		const formattedText = formatHledgerJournal(text, amountColumnPosition);
		
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
		
		// Check if this is a hledger journal file
		if (document.fileName.endsWith('.journal') || 
			document.fileName.endsWith('.hledger') || 
			document.fileName.endsWith('.ledger')) {
			
			const config = vscode.workspace.getConfiguration('hledger-formatter');
			const formatOnSave = config.get('formatOnSave', true);
			const sortOnSave = config.get('sortOnSave', true);
			
			if (formatOnSave || sortOnSave) {
				let text = document.getText();
				
				// Apply sorting first if enabled
				if (sortOnSave) {
					text = sortHledgerJournal(text);
				}
				
				// Apply formatting if enabled
				if (formatOnSave) {
					const amountColumnPosition = config.get('amountColumnPosition', 42);
					text = formatHledgerJournal(text, amountColumnPosition);
				}
				
				event.waitUntil(Promise.resolve([
					new vscode.TextEdit(
						new vscode.Range(
							document.positionAt(0),
							document.positionAt(document.getText().length)
						),
						text
					)
				]));
			}
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
				const config = vscode.workspace.getConfiguration('hledger-formatter');
				const amountColumnPosition = config.get('amountColumnPosition', 42);
				const formattedText = formatHledgerJournal(text, amountColumnPosition);
				
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
				const config = vscode.workspace.getConfiguration('hledger-formatter');
				const amountColumnPosition = config.get('amountColumnPosition', 42);
				const formattedText = formatHledgerJournal(text, amountColumnPosition);

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

	// Create new journal file command
	const newFileCommand = vscode.commands.registerCommand('hledger-formatter.newFile', async () => {
		const today = new Date();
		const currentMonth = today.getMonth() + 1; // 0-indexed to 1-indexed
		const currentYear = today.getFullYear();
		const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
		
		// Prompt user for month or use current month
		const monthInput = await vscode.window.showInputBox({
			prompt: 'Enter month (1-12) or press Enter for current month',
			value: currentMonth.toString(),
			validateInput: (value) => {
				const num = parseInt(value);
				if (isNaN(num) || num < 1 || num > 12) {
					return 'Please enter a valid month number (1-12)';
				}
				return null;
			}
		});

		if (!monthInput) {
			return; // User cancelled
		}

		const selectedMonth = parseInt(monthInput);
		const monthName = monthNames[selectedMonth - 1];
		const paddedMonth = selectedMonth.toString().padStart(2, '0');
		
		// Create filename: e.g., "09-sep.journal"
		const fileName = `${paddedMonth}-${monthName}.journal`;
		
		// Get the workspace folder
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
			return;
		}
		
		const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, fileName);
		
		// Check if file already exists
		try {
			await vscode.workspace.fs.stat(fileUri);
			const overwrite = await vscode.window.showWarningMessage(
				`File ${fileName} already exists. Do you want to open it?`,
				'Open',
				'Cancel'
			);
			
			if (overwrite === 'Open') {
				const document = await vscode.workspace.openTextDocument(fileUri);
				await vscode.window.showTextDocument(document);
			}
			return;
		} catch {
			// File doesn't exist, proceed to create it
		}
		
		// Create initial content with header comment
		const year = selectedMonth < currentMonth ? currentYear : currentYear;
		const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
		const initialContent = `; ${monthNameCapitalized} ${year} Journal\n;\n; Created on ${today.toISOString().split('T')[0]}\n\n`;
		
		// Create and open the file
		await vscode.workspace.fs.writeFile(fileUri, Buffer.from(initialContent, 'utf8'));
		const document = await vscode.workspace.openTextDocument(fileUri);
		await vscode.window.showTextDocument(document);
		
		vscode.window.showInformationMessage(`Created new journal file: ${fileName}`);
	});

	// Sort journal entries command
	const sortCommand = vscode.commands.registerCommand('hledger-formatter.sortEntries', () => {
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
		const sortedText = sortHledgerJournal(text);

		editor.edit((editBuilder) => {
			const fullRange = new vscode.Range(
				document.positionAt(0),
				document.positionAt(text.length)
			);
			editBuilder.replace(fullRange, sortedText);
		}).then(success => {
			if (success) {
				vscode.window.showInformationMessage('Journal entries sorted by date.');
			} else {
				vscode.window.showErrorMessage('Failed to sort journal entries.');
			}
		});
	});

	context.subscriptions.push(formatCommand, formatOnSaveDisposable, formatterProvider, rangeFormatterProvider, toggleCommentCommand, newFileCommand, sortCommand);
}

/**
 * Formats a hledger journal text by aligning account names and amounts
 * @param text The original journal text
 * @param amountColumnPosition The column position for aligning amounts (default: 42)
 * @returns The formatted journal text
 */
export function formatHledgerJournal(text: string, amountColumnPosition: number = 42): string {
	// Split the text into transactions
	const lines = text.split('\n');
	const formattedLines: string[] = [];
	
	let inTransaction = false;
	let transactionLines: string[] = [];
	let lastWasTransaction = false;
	let hasContent = false; // Track if we've seen any non-empty content
	
	// Process line by line
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		
		// Skip empty lines or keep them as-is
		if (!line.trim()) {
			if (inTransaction) {
				// End of transaction
				formattedLines.push(...formatTransaction(transactionLines, amountColumnPosition));
				transactionLines = [];
				inTransaction = false;
				lastWasTransaction = true;
				hasContent = true;
				// Add exactly one blank line after transaction
				formattedLines.push('');
			} else if (!lastWasTransaction && hasContent) {
				// Only keep empty lines that are not at the start and not between transactions
				formattedLines.push(line);
			}
			// Skip empty lines at the start or that come after we just added one
			continue;
		}
		
		// Comment lines
		if (line.trim().startsWith(';')) {
			if (inTransaction) {
				// Comments within transactions are part of the transaction
				transactionLines.push(line);
			} else {
				formattedLines.push(line);
				lastWasTransaction = false;
				hasContent = true;
			}
			continue;
		}
		
		// Check if this is a transaction header (date at the beginning)
		const isTransactionHeader = /^\d{4}[/-]\d{2}[/-]\d{2}/.test(line.trim());
		
		if (isTransactionHeader) {
			if (inTransaction) {
				// End previous transaction and format it
				formattedLines.push(...formatTransaction(transactionLines, amountColumnPosition));
				// Add exactly one blank line between transactions
				formattedLines.push('');
				transactionLines = [];
			}
			
			// Start new transaction
			inTransaction = true;
			transactionLines.push(line);
			lastWasTransaction = false;
			hasContent = true;
		} else if (inTransaction) {
			// Posting line within transaction
			transactionLines.push(line);
		} else {
			// Neither transaction header nor posting, keep as-is
			formattedLines.push(line);
			lastWasTransaction = false;
			hasContent = true;
		}
	}
	
	// Format the last transaction if any
	if (inTransaction && transactionLines.length > 0) {
		formattedLines.push(...formatTransaction(transactionLines, amountColumnPosition));
		// Add one blank line at the end after the last transaction
		formattedLines.push('');
	}
	
	// Remove any leading blank lines
	while (formattedLines.length > 0 && formattedLines[0] === '') {
		formattedLines.shift();
	}
	
	// Remove any trailing empty lines beyond one
	while (formattedLines.length > 1 && formattedLines[formattedLines.length - 1] === '' && formattedLines[formattedLines.length - 2] === '') {
		formattedLines.pop();
	}
	
	return formattedLines.join('\n');
}

/**
 * Formats a single transaction by aligning account names and amounts
 * @param lines Lines of a transaction including header and postings
 * @param amountColumnPosition The column position for aligning amounts
 * @returns Formatted transaction lines
 */
function formatTransaction(lines: string[], amountColumnPosition: number): string[] {
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
	
	// Use the configurable column position for all amounts
	const fixedAmountColumn = amountColumnPosition;
	
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
 * Sorts journal entries by date
 * @param text The original journal text
 * @returns The journal text with entries sorted by date
 */
export function sortHledgerJournal(text: string): string {
	const parsed = parseTransactionsWithLeading(text);
	
	// Sort transactions by date
	parsed.transactions.sort((a, b) => {
		if (a.date < b.date) { return -1; }
		if (a.date > b.date) { return 1; }
		return 0;
	});
	
	// Rebuild the text from sorted transactions
	const result: string[] = [];
	
	// Add leading content if any
	if (parsed.leadingContent) {
		result.push(parsed.leadingContent);
		if (parsed.transactions.length > 0) {
			result.push(''); // Add empty line between leading content and transactions
		}
	}
	
	// Add sorted transactions
	for (let i = 0; i < parsed.transactions.length; i++) {
		result.push(parsed.transactions[i].content);
		
		// Add empty line between transactions, but not after the last one
		if (i < parsed.transactions.length - 1 && !parsed.transactions[i].content.endsWith('\n\n')) {
			result.push('');
		}
	}
	
	// Handle case where original text ended with a newline
	let finalText = result.join('\n');
	if (text.endsWith('\n') && !finalText.endsWith('\n')) {
		finalText += '\n';
	}
	
	return finalText;
}

/**
 * Parses journal text into individual transactions with their dates
 * Also returns leading content (comments/empty lines before first transaction)
 * @param text The journal text to parse
 * @returns Object with leading content and array of transactions
 */
function parseTransactionsWithLeading(text: string): { 
	leadingContent: string; 
	transactions: Array<{ date: string; content: string }> 
} {
	const lines = text.split('\n');
	const transactions: Array<{ date: string; content: string }> = [];
	
	let currentTransaction: string[] = [];
	let currentDate = '';
	let leadingLines: string[] = [];
	let inTransaction = false;
	let hasSeenTransaction = false;
	
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		
		// Check if this is a transaction header (date at the beginning)
		const dateMatch = line.match(/^(\d{4}[/-]\d{2}[/-]\d{2})/);
		
		if (dateMatch) {
			hasSeenTransaction = true;
			// If we had a previous transaction, save it
			if (inTransaction && currentTransaction.length > 0) {
				transactions.push({
					date: currentDate,
					content: currentTransaction.join('\n')
				});
			}
			
			// Start new transaction
			currentDate = dateMatch[1];
			currentTransaction = [line];
			inTransaction = true;
		} else if (inTransaction) {
			// Check if this is an empty line
			if (!line.trim()) {
				// Empty line might end the transaction
				// But we need to check if the next non-empty line is a new transaction
				let nextTransactionFound = false;
				for (let j = i + 1; j < lines.length; j++) {
					if (lines[j].trim()) {
						// Found next non-empty line
						if (/^\d{4}[/-]\d{2}[/-]\d{2}/.test(lines[j])) {
							nextTransactionFound = true;
						}
						break;
					}
				}
				
				if (nextTransactionFound) {
					// End current transaction
					transactions.push({
						date: currentDate,
						content: currentTransaction.join('\n')
					});
					currentTransaction = [];
					inTransaction = false;
				} else {
					// Empty line is part of the transaction
					currentTransaction.push(line);
				}
			} else {
				// Part of the current transaction
				currentTransaction.push(line);
			}
		} else if (!hasSeenTransaction) {
			// Not in a transaction and haven't seen any transactions yet
			// These are leading lines to preserve at the beginning
			leadingLines.push(line);
		}
	}
	
	// Save the last transaction if any
	if (inTransaction && currentTransaction.length > 0) {
		transactions.push({
			date: currentDate,
			content: currentTransaction.join('\n')
		});
	}
	
	// Remove trailing empty lines from leading content
	while (leadingLines.length > 0 && !leadingLines[leadingLines.length - 1].trim()) {
		leadingLines.pop();
	}
	
	return {
		leadingContent: leadingLines.join('\n'),
		transactions
	};
}

/**
 * Helper function for backwards compatibility
 */
function parseTransactions(text: string): Array<{ date: string; content: string }> {
	return parseTransactionsWithLeading(text).transactions;
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

	// First pass: Analyze the selection to determine action
	let hasUncommentedLines = false;

	for (let lineNumber = startLine; lineNumber <= endLine && lineNumber < lines.length; lineNumber++) {
		const lineText = lines[lineNumber];

		// Skip empty lines in analysis
		if (!lineText.trim()) {
			continue;
		}

		// Check if line is commented (with preserved indentation)
		const commentMatch = lineText.match(/^(\s*); (.*)$/);

		if (!commentMatch) {
			// Found an uncommented non-empty line
			hasUncommentedLines = true;
			break;
		}
	}

	// Second pass: Apply consistent action to all lines
	for (let lineNumber = startLine; lineNumber <= endLine && lineNumber < lines.length; lineNumber++) {
		const lineText = lines[lineNumber];

		// Skip empty lines
		if (!lineText.trim()) {
			continue;
		}

		// Check if line is commented (with preserved indentation)
		const commentMatch = lineText.match(/^(\s*); (.*)$/);

		if (hasUncommentedLines) {
			// Comment all lines (including already commented ones)
			if (!commentMatch) {
				// Line is not commented, so comment it
				const leadingWhitespace = lineText.match(/^\s*/)?.[0] || '';
				const restOfLine = lineText.substring(leadingWhitespace.length);
				lines[lineNumber] = `${leadingWhitespace}; ${restOfLine}`;
			}
			// If line is already commented, leave it as-is
		} else {
			// Uncomment all lines (all lines should be commented at this point)
			if (commentMatch) {
				// Uncomment: restore original whitespace and content
				const [, leadingWhitespace, content] = commentMatch;
				lines[lineNumber] = `${leadingWhitespace}${content}`;
			}
		}
	}

	return lines.join('\n');
}

// This method is called when your extension is deactivated
export function deactivate() {}


