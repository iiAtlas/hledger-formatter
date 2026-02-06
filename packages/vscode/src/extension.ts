// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import {
	type AmountAlignment,
	type NegativeCommodityStyle,
	type DateFormatStyle,
	type CommentCharacter,
	type FormatterOptions,
	DEFAULT_FORMATTER_OPTIONS,
	isCommentLine,
	isMetadataPostingLine,
	isMetadataPostingAccount,
	isTransactionHeaderLine,
	extractPostingDetail,
	formatHledgerJournal,
	sortHledgerJournal,
	toggleCommentLines,
	parseAmount,
	formatAmountValue,
	calculateBalancingAmount
} from '@hledger-fmt/formatter';

function getFormatterOptionsFromConfiguration(config?: vscode.WorkspaceConfiguration): FormatterOptions {
	const sourceConfig = config ?? vscode.workspace.getConfiguration('hledger-formatter');
	return {
		amountColumnPosition: sourceConfig.get<number>('amountColumnPosition', DEFAULT_FORMATTER_OPTIONS.amountColumnPosition),
		amountAlignment: sourceConfig.get<AmountAlignment>('amountAlignment', DEFAULT_FORMATTER_OPTIONS.amountAlignment),
		indentationWidth: sourceConfig.get<number>('indentationWidth', DEFAULT_FORMATTER_OPTIONS.indentationWidth),
		negativeCommodityStyle: sourceConfig.get<NegativeCommodityStyle>('negativeCommodityStyle', DEFAULT_FORMATTER_OPTIONS.negativeCommodityStyle),
		dateFormat: sourceConfig.get<DateFormatStyle>('dateFormat', DEFAULT_FORMATTER_OPTIONS.dateFormat),
		commentCharacter: sourceConfig.get<CommentCharacter>('commentCharacter', DEFAULT_FORMATTER_OPTIONS.commentCharacter)
	};
}

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
		const formatterOptions = getFormatterOptionsFromConfiguration(config);
		const formattedText = formatHledgerJournal(text, formatterOptions);

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
			const formatOnSave = config.get('formatOnSave', false);
			const sortOnSave = config.get('sortOnSave', false);

			if (formatOnSave || sortOnSave) {
				let text = document.getText();

				// Apply sorting first if enabled
				if (sortOnSave) {
					text = sortHledgerJournal(text);
				}

				// Apply formatting if enabled
				if (formatOnSave) {
					const formatterOptions = getFormatterOptionsFromConfiguration(config);
					text = formatHledgerJournal(text, formatterOptions);
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
				const formatterOptions = getFormatterOptionsFromConfiguration(config);
				const formattedText = formatHledgerJournal(text, formatterOptions);

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
				const formatterOptions = getFormatterOptionsFromConfiguration(config);
				const formattedText = formatHledgerJournal(text, formatterOptions);

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

		const config = vscode.workspace.getConfiguration('hledger-formatter');
		const formatterOptions = getFormatterOptionsFromConfiguration(config);
		const modifiedText = toggleCommentLines(text, startLine, endLine, formatterOptions);

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

	// Register account autocomplete provider
	const accountCompletionProvider = vscode.languages.registerCompletionItemProvider(
		[
			{ scheme: 'file', pattern: '**/*.journal' },
			{ scheme: 'file', pattern: '**/*.hledger' },
			{ scheme: 'file', pattern: '**/*.ledger' }
		],
		new HledgerAccountCompletionProvider(),
		':' // Trigger on colon for hierarchical accounts
	);

	// Register inline completion provider for balancing amounts
	const balancingAmountProvider = vscode.languages.registerInlineCompletionItemProvider(
		[
			{ scheme: 'file', pattern: '**/*.journal' },
			{ scheme: 'file', pattern: '**/*.hledger' },
			{ scheme: 'file', pattern: '**/*.ledger' }
		],
		new HledgerBalancingAmountProvider()
	);

	context.subscriptions.push(formatCommand, formatOnSaveDisposable, formatterProvider, rangeFormatterProvider, toggleCommentCommand, newFileCommand, sortCommand, accountCompletionProvider, balancingAmountProvider);
}

/**
 * Completion provider for hledger account names
 */
class HledgerAccountCompletionProvider implements vscode.CompletionItemProvider {
	// Standard hledger top-level account categories (base forms in lowercase)
	private readonly standardAccountsBase = [
		'assets',
		'liabilities',
		'equity',
		'revenues',
		'income',
		'expenses'
	];

	private accountCache: Set<string> = new Set();
	private lastCacheUpdate: number = 0;
	private readonly cacheExpiryMs = 5000; // Refresh cache every 5 seconds

	async provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
		context: vscode.CompletionContext
	): Promise<vscode.CompletionItem[]> {
		const linePrefix = document.lineAt(position).text.substring(0, position.character);

		// Only provide completions for posting lines (lines that start with whitespace)
		// or at the beginning of an account name
		const isPostingLine = /^\s+/.test(linePrefix);
		if (!isPostingLine) {
			return [];
		}

		// Update account cache if needed
		await this.updateAccountCache();

		// Get the current word being typed
		const wordRange = document.getWordRangeAtPosition(position, /[\w:]+/);
		const currentWord = wordRange ? document.getText(wordRange) : '';

		// Build completion items
		const completionItems: vscode.CompletionItem[] = [];

		// Read configuration for default account categories
		const config = vscode.workspace.getConfiguration('hledger-formatter');
		const defaultCategoriesConfig = config.get<string>('defaultAccountCategories', 'lowercase');

		// Track standard accounts for case-insensitive deduplication
		const standardAccountsLowercase = new Set<string>();

		// Add standard accounts based on configuration
		if (defaultCategoriesConfig !== 'none') {
			const standardAccounts = this.applyAccountCasing(this.standardAccountsBase, defaultCategoriesConfig);
			for (const account of standardAccounts) {
				const item = new vscode.CompletionItem(account, vscode.CompletionItemKind.Field);
				item.detail = 'Standard account category';
				item.sortText = `0_${account}`; // Sort standard accounts first
				if (wordRange) {
					item.range = wordRange;
				}
				completionItems.push(item);

				// Track lowercase version for deduplication
				standardAccountsLowercase.add(account.toLowerCase());
			}
		}

		// Add accounts from cache (skip duplicates of standard accounts)
		for (const account of this.accountCache) {
			// Skip if this account matches a standard account (case-insensitive)
			if (standardAccountsLowercase.has(account.toLowerCase())) {
				continue;
			}

			const item = new vscode.CompletionItem(account, vscode.CompletionItemKind.Field);
			item.detail = 'Existing account';
			item.sortText = `1_${account}`; // Sort existing accounts after standard ones
			if (wordRange) {
				item.range = wordRange;
			}
			completionItems.push(item);
		}

		return completionItems;
	}

	/**
	 * Applies casing to account names based on configuration
	 */
	private applyAccountCasing(accounts: string[], casing: string): string[] {
		switch (casing) {
			case 'lowercase':
				return accounts.map(a => a.toLowerCase());
			case 'uppercase':
				return accounts.map(a => a.toUpperCase());
			case 'capitalize':
				return accounts.map(a => a.charAt(0).toUpperCase() + a.slice(1).toLowerCase());
			default:
				return accounts;
		}
	}

	/**
	 * Updates the account cache by scanning all journal files in the workspace
	 */
	private async updateAccountCache(): Promise<void> {
		const now = Date.now();
		if (now - this.lastCacheUpdate < this.cacheExpiryMs) {
			return; // Cache is still fresh
		}

		this.accountCache.clear();
		this.lastCacheUpdate = now;

		// Find all journal files in the workspace
		const journalFiles = await vscode.workspace.findFiles(
			'**/*.{journal,hledger,ledger}',
			'**/node_modules/**',
			1000 // Limit to 1000 files
		);

		// Track visited files to avoid circular includes
		const visitedFiles = new Set<string>();

		// Extract accounts from each file (including included files)
		for (const fileUri of journalFiles) {
			try {
				await this.processJournalFile(fileUri, visitedFiles);
			} catch (error) {
				// Skip files that can't be read
				console.error(`Failed to read file ${fileUri.fsPath}:`, error);
			}
		}
	}

	/**
	 * Processes a journal file and its includes recursively
	 */
	private async processJournalFile(fileUri: vscode.Uri, visitedFiles: Set<string>): Promise<void> {
		const filePath = fileUri.fsPath;

		// Avoid circular includes
		if (visitedFiles.has(filePath)) {
			return;
		}
		visitedFiles.add(filePath);

		try {
			const document = await vscode.workspace.openTextDocument(fileUri);
			const text = document.getText();

			// Extract accounts from this file
			const accounts = this.extractAccountsFromDocument(text);
			accounts.forEach(account => this.accountCache.add(account));

			// Extract and process included files
			const includedFiles = this.extractIncludedFiles(text, fileUri);
			for (const includedUri of includedFiles) {
				await this.processJournalFile(includedUri, visitedFiles);
			}
		} catch (error) {
			// Skip files that can't be read
			console.error(`Failed to process file ${filePath}:`, error);
		}
	}

	/**
	 * Extracts included file paths from journal text
	 */
	private extractIncludedFiles(text: string, parentFileUri: vscode.Uri): vscode.Uri[] {
		const includedFiles: vscode.Uri[] = [];
		const lines = text.split('\n');

		for (const line of lines) {
			const trimmed = line.trim();

			// Match include directives: "!include path" or "include path"
			const includeMatch = trimmed.match(/^!?include\s+(.+)$/);
			if (includeMatch) {
				const includePath = includeMatch[1].trim();

				try {
					// Resolve path relative to parent file
					const parentDir = vscode.Uri.joinPath(parentFileUri, '..');
					const resolvedUri = vscode.Uri.joinPath(parentDir, includePath);
					includedFiles.push(resolvedUri);
				} catch (error) {
					console.error(`Failed to resolve include path: ${includePath}`, error);
				}
			}
		}

		return includedFiles;
	}

	/**
	 * Extracts account names from journal text
	 */
	private extractAccountsFromDocument(text: string): Set<string> {
		const accounts = new Set<string>();
		const lines = text.split('\n');

		for (const line of lines) {
			const trimmed = line.trim();

			// Skip empty lines and comments
			if (!trimmed || trimmed.startsWith(';')) {
				continue;
			}

			// Skip transaction header lines (lines that start with a date)
			if (/^\d{4}[/-]\d{2}[/-]\d{2}/.test(trimmed)) {
				continue;
			}

			// Check if this is a posting line (starts with whitespace)
			if (!/^\s+/.test(line)) {
				continue;
			}

			// Extract account name (everything before two or more spaces, or before tab)
			const match = trimmed.match(/^([^\s]+(?:\s+[^\s]+)*?)(?:\s{2,}|\t)/);
			if (match) {
				const account = match[1].trim();
				if (account && !account.startsWith(';')) {
					accounts.add(account);

					// Also add parent accounts for hierarchical completions
					const parts = account.split(':');
					for (let i = 1; i < parts.length; i++) {
						const parentAccount = parts.slice(0, i).join(':');
						accounts.add(parentAccount);
					}
				}
			} else {
				// Line might be an account without an amount
				const accountOnly = trimmed.match(/^([^\s;]+(?::[^\s;]+)*)/);
				if (accountOnly) {
					const account = accountOnly[1].trim();
					if (account) {
						accounts.add(account);

						// Also add parent accounts
						const parts = account.split(':');
						for (let i = 1; i < parts.length; i++) {
							const parentAccount = parts.slice(0, i).join(':');
							accounts.add(parentAccount);
						}
					}
				}
			}
		}

		return accounts;
	}
}

/**
 * Inline completion provider for balancing amounts
 */
class HledgerBalancingAmountProvider implements vscode.InlineCompletionItemProvider {
	async provideInlineCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<vscode.InlineCompletionItem[] | undefined> {
		// Check if feature is enabled
		const config = vscode.workspace.getConfiguration('hledger-formatter');
		const enabled = config.get<boolean>('suggestBalancingAmounts', true);
		if (!enabled) {
			return undefined;
		}

		// Get the current line
		const currentLine = document.lineAt(position.line);
		const lineText = currentLine.text;
		const trimmed = lineText.trim();

		// Only provide suggestions for posting lines (lines that start with whitespace)
		if (!/^\s+/.test(lineText)) {
			return undefined;
		}

		// Skip transaction header lines even if user temporarily indents them
		if (isTransactionHeaderLine(trimmed)) {
			return undefined;
		}

		// Don't suggest if line is a comment
		if (trimmed.startsWith(';')) {
			return undefined;
		}

		// Don't suggest for metadata lines (e.g., project:, note:)
		if (isMetadataPostingLine(trimmed)) {
			return undefined;
		}

		// Don't suggest if line already has an amount
		// Check if there's already two spaces or a tab followed by a potential amount
		const hasAmount = /\s{2,}|\t/.test(trimmed) && /[\d$€£¥-]/.test(trimmed.split(/\s{2,}|\t/)[1] || '');
		if (hasAmount) {
			return undefined;
		}

		// Extract account name from current line
		const detail = extractPostingDetail(lineText);
		if (!detail.account) {
			return undefined;
		}

		if (isMetadataPostingAccount(detail.account)) {
			return undefined;
		}

		// Parse the current transaction
		const transaction = parseCurrentTransaction(document, position.line);
		if (!transaction) {
			return undefined;
		}

		// Get formatter options for amount formatting
		const formatterOptions = getFormatterOptionsFromConfiguration(config);

		// Calculate balancing amount with proper spacing
		const balancingAmount = calculateBalancingAmount(transaction, formatterOptions, detail.account, {
			currentLineText: lineText,
			cursorColumn: position.character
		});
		if (!balancingAmount) {
			return undefined;
		}

		// Create inline completion item
		const item = new vscode.InlineCompletionItem(balancingAmount);
		// Insert at the end of the current line text (after account name)
		item.range = new vscode.Range(position, position);

		return [item];
	}
}

/**
 * Parses the current transaction and returns transaction info
 * @param document The text document
 * @param currentLine The line number where cursor is positioned
 * @returns Transaction info or null if not in a transaction
 */
function parseCurrentTransaction(document: vscode.TextDocument, currentLine: number): {
	headerLine: number;
	lines: string[];
} | null {
	const lines = document.getText().split('\n');

	// Find the start of the transaction (look backwards for date line)
	let headerLine = -1;
	for (let i = currentLine; i >= 0; i--) {
		const line = lines[i].trim();
		if (isTransactionHeaderLine(line)) {
			headerLine = i;
			break;
		}
		// If we hit an empty line or another transaction, we're not in a transaction
		if (line === '' && i < currentLine) {
			return null;
		}
	}

	if (headerLine === -1) {
		return null;
	}

	// Find the end of the transaction (look forwards for empty line or next transaction)
	let endLine = currentLine;
	for (let i = currentLine + 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (line === '' || isTransactionHeaderLine(line)) {
			endLine = i - 1;
			break;
		}
		endLine = i;
	}

	// Extract transaction lines
	const transactionLines = lines.slice(headerLine, endLine + 1);

	return {
		headerLine,
		lines: transactionLines
	};
}

// This method is called when your extension is deactivated
export function deactivate() {}
