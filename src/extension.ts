// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

type AmountAlignment = 'fixedColumn' | 'widest';
type NegativeCommodityStyle = 'signBeforeSymbol' | 'symbolBeforeSign';
type DateFormatStyle = 'YYYY-MM-DD' | 'YYYY/MM/DD' | 'YYYY.MM.DD';
type CommentCharacter = ';' | '#' | '*';

export interface FormatterOptions {
	amountColumnPosition: number;
	amountAlignment: AmountAlignment;
	indentationWidth: number;
	negativeCommodityStyle: NegativeCommodityStyle;
	dateFormat: DateFormatStyle;
	commentCharacter: CommentCharacter;
}

const DEFAULT_FORMATTER_OPTIONS: FormatterOptions = {
	amountColumnPosition: 42,
	amountAlignment: 'widest',
	indentationWidth: 4,
	negativeCommodityStyle: 'symbolBeforeSign',
	dateFormat: 'YYYY-MM-DD',
	commentCharacter: ';'
};

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

function normalizeFormatterOptions(optionsOrColumn?: number | Partial<FormatterOptions>): FormatterOptions {
	const merged: Partial<FormatterOptions> = typeof optionsOrColumn === 'number'
		? { ...DEFAULT_FORMATTER_OPTIONS, amountColumnPosition: optionsOrColumn }
		: { ...DEFAULT_FORMATTER_OPTIONS, ...(optionsOrColumn ?? {}) };

	const amountColumnPosition = typeof merged.amountColumnPosition === 'number'
		? Math.max(0, Math.floor(merged.amountColumnPosition))
		: DEFAULT_FORMATTER_OPTIONS.amountColumnPosition;

	const indentationWidth = typeof merged.indentationWidth === 'number'
		? Math.max(0, Math.floor(merged.indentationWidth))
		: DEFAULT_FORMATTER_OPTIONS.indentationWidth;

	const amountAlignment: AmountAlignment = merged.amountAlignment === 'widest' ? 'widest' : 'fixedColumn';
	const negativeCommodityStyle: NegativeCommodityStyle = merged.negativeCommodityStyle === 'symbolBeforeSign'
		? 'symbolBeforeSign'
		: 'signBeforeSymbol';
	const dateFormat: DateFormatStyle = merged.dateFormat === 'YYYY/MM/DD'
		? 'YYYY/MM/DD'
		: merged.dateFormat === 'YYYY.MM.DD'
			? 'YYYY.MM.DD'
			: 'YYYY-MM-DD';
	const commentCharacter: CommentCharacter = merged.commentCharacter === '#'
		? '#'
		: merged.commentCharacter === '*'
			? '*'
			: ';';

	return {
		amountColumnPosition,
		amountAlignment,
		indentationWidth,
		negativeCommodityStyle,
		dateFormat,
		commentCharacter
	};
}

/**
 * Checks if a line is a comment (starts with #, ;, or *)
 * @param line The line to check (should be trimmed)
 * @returns true if the line is a comment
 */
function isCommentLine(line: string): boolean {
	const trimmed = line.trim();
	return trimmed.startsWith(';') || trimmed.startsWith('#') || trimmed.startsWith('*');
}

function isMetadataPostingLine(trimmedLine: string): boolean {
	if (!trimmedLine) {
		return false;
	}

	// Ignore actual postings which always separate account and amount with two spaces or tabs
	if (/\s{2,}|\t/.test(trimmedLine)) {
		return false;
	}

	// Treat key/value metadata (e.g., "project: xyz" or "note: something") as metadata.
	// Matches keys made of word characters, dots, or hyphens, followed by a colon and optional value that
	// either ends immediately or starts with single whitespace (no amount-style spacing).
	return /^[A-Za-z0-9_.-]+:(\s+.*)?$/.test(trimmedLine);
}

function isMetadataPostingAccount(account: string | null | undefined): boolean {
	if (!account) {
		return false;
	}
	const trimmedAccount = account.trim();
	return trimmedAccount.endsWith(':') || /:\s/.test(trimmedAccount);
}

/**
 * Checks if a line starts a comment block
 * @param line The line to check (should be trimmed)
 * @returns true if the line starts a comment block
 */
function isCommentBlockStart(line: string): boolean {
	return line.trim() === 'comment';
}

/**
 * Checks if a line ends a comment block
 * @param line The line to check (should be trimmed)
 * @returns true if the line ends a comment block
 */
function isCommentBlockEnd(line: string): boolean {
	return line.trim() === 'end comment';
}

/**
 * Extracts the comment character and content from a comment line
 * @param line The comment line
 * @returns An object with the comment character, leading whitespace, and content, or null if not a comment
 */
function parseCommentLine(line: string): { char: CommentCharacter; leadingWhitespace: string; content: string } | null {
	const match = line.match(/^(\s*)([#;*])\s?(.*)$/);
	if (!match) {
		return null;
	}

	const [, leadingWhitespace, char, content] = match;
	return {
		char: char as CommentCharacter,
		leadingWhitespace,
		content
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
 * Formats a hledger journal text by aligning account names and amounts
 * @param text The original journal text
 * @param optionsOrColumn Optional formatter options or an amount column position for backward compatibility
 * @returns The formatted journal text
 */
export function formatHledgerJournal(text: string, optionsOrColumn?: number | Partial<FormatterOptions>): string {
	const options = normalizeFormatterOptions(optionsOrColumn);
	const lines = text.split('\n');
	const formattedLines: string[] = [];

	let inTransaction = false;
	let transactionLines: string[] = [];
	let lastWasTransaction = false;
	let hasContent = false;
	let inCommentBlock = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		// Handle comment blocks
		if (isCommentBlockStart(trimmed)) {
			inCommentBlock = true;
			if (inTransaction) {
				formattedLines.push(...formatTransaction(transactionLines, options));
				transactionLines = [];
				inTransaction = false;
			}
			formattedLines.push(line);
			lastWasTransaction = false;
			hasContent = true;
			continue;
		}

		if (inCommentBlock) {
			formattedLines.push(line);
			if (isCommentBlockEnd(trimmed)) {
				inCommentBlock = false;
			}
			continue;
		}

		if (!trimmed) {
			if (inTransaction) {
				formattedLines.push(...formatTransaction(transactionLines, options));
				transactionLines = [];
				inTransaction = false;
				lastWasTransaction = true;
				hasContent = true;
				formattedLines.push('');
			} else if (!lastWasTransaction && hasContent) {
				formattedLines.push(line);
			}
			continue;
		}

		if (isCommentLine(trimmed)) {
			if (inTransaction) {
				transactionLines.push(line);
			} else {
				formattedLines.push(line);
				lastWasTransaction = false;
				hasContent = true;
			}
			continue;
		}

		if (isTransactionHeaderLine(trimmed)) {
			if (inTransaction) {
				formattedLines.push(...formatTransaction(transactionLines, options));
				formattedLines.push('');
				transactionLines = [];
			}

			inTransaction = true;
			transactionLines.push(line);
			lastWasTransaction = false;
			hasContent = true;
		} else if (inTransaction) {
			transactionLines.push(line);
		} else {
			formattedLines.push(line);
			lastWasTransaction = false;
			hasContent = true;
		}
	}

	if (inTransaction && transactionLines.length > 0) {
		formattedLines.push(...formatTransaction(transactionLines, options));
		formattedLines.push('');
	}

	while (formattedLines.length > 0 && formattedLines[0] === '') {
		formattedLines.shift();
	}

	while (formattedLines.length > 1 && formattedLines[formattedLines.length - 1] === '' && formattedLines[formattedLines.length - 2] === '') {
		formattedLines.pop();
	}

	return formattedLines.join('\n');
}

/**
 * Formats a single transaction by aligning account names and amounts
 * @param lines Lines of a transaction including header and postings
 * @param options Formatter options to drive indentation and amount alignment
 * @returns Formatted transaction lines
 */
function formatTransaction(lines: string[], options: FormatterOptions): string[] {
	if (lines.length <= 1) {
		return lines;
	}

	const headerLine = lines[0];
	const formattedHeader = formatTransactionHeader(headerLine, options);

	const formattedLines: string[] = [formattedHeader];
	const postingLines: string[] = [];

	for (let i = 1; i < lines.length; i++) {
		if (!isCommentLine(lines[i])) {
			postingLines.push(lines[i]);
		} else {
			formattedLines.push(lines[i]);
		}
	}

	if (postingLines.length === 0) {
		return formattedLines;
	}

	const indentWidth = Math.max(0, options.indentationWidth);
	const indentStr = ' '.repeat(indentWidth);
	const postingDetails = postingLines.map(extractPostingDetail);
	const preparedPostings = postingDetails.map(detail => {
		if (!detail.account) {
			return {
				detail,
				formattedAmount: null as string | null,
				digitsPrefixLength: 0
			};
		}

		const { formatted: amount } = formatAmountWithStyle(
			detail.amount && detail.amount.length > 0 ? detail.amount : null,
			options.negativeCommodityStyle
		);

		if (!amount) {
			return {
				detail,
				formattedAmount: null,
				digitsPrefixLength: 0
			};
		}

		const normalizedAmount = amount.trim();
		return {
			detail,
			formattedAmount: normalizedAmount,
			digitsPrefixLength: getDigitsPrefixLength(normalizedAmount)
		};
	});

	const referenceAccountLength = preparedPostings.reduce((max, prepared) => {
		const account = prepared.detail.account;
		if (account) {
			return Math.max(max, account.length);
		}
		return max;
	}, 0);

	let baseDigitsColumn: number;
	if (options.amountAlignment === 'widest') {
		const digitColumnCandidates = preparedPostings
			.filter(prepared => prepared.detail.account && prepared.formattedAmount)
			.map(prepared => indentWidth + (prepared.detail.account as string).length + prepared.digitsPrefixLength + 2);
		const fallbackColumn = indentWidth + referenceAccountLength + 2;
		baseDigitsColumn = digitColumnCandidates.length > 0 ? Math.max(fallbackColumn, ...digitColumnCandidates) : fallbackColumn;
	} else {
		baseDigitsColumn = options.amountColumnPosition;
	}

	for (const prepared of preparedPostings) {
		const detail = prepared.detail;
		if (!detail.account) {
			formattedLines.push(`${indentStr}${detail.trimmed}`);
			continue;
		}

		const amount = prepared.formattedAmount;

		if (!amount) {
			formattedLines.push(`${indentStr}${detail.trimmed}`);
			continue;
		}

		const digitsPrefixLength = prepared.digitsPrefixLength;
		const paddingTarget = baseDigitsColumn - (indentWidth + detail.account.length) - digitsPrefixLength;
		const paddingNeeded = Math.max(2, paddingTarget);
		formattedLines.push(`${indentStr}${detail.account}${' '.repeat(paddingNeeded)}${amount}`);
	}

	return formattedLines;
}

interface PostingDetail {
	trimmed: string;
	account: string | null;
	amount: string | null;
}

function extractPostingDetail(line: string): PostingDetail {
	const trimmed = line.trim();
	if (!trimmed) {
		return { trimmed, account: null, amount: null };
	}

	const accountAmountSeparator = /\s{2,}|\t+/;
	const parts = trimmed.split(accountAmountSeparator);

	if (parts.length >= 2) {
		return {
			trimmed,
			account: parts[0].trim(),
			amount: parts.slice(1).join(' ').trim()
		};
	}

	const fallbackMatch = trimmed.match(/^(\S+(?:\s+\S+)*?)(?:\s*)(\$-?\d+(?:,\d+)*(?:\.\d+)?|\-\$\d+(?:,\d+)*(?:\.\d+)?|\d+(?:,\d+)*(?:\.\d+)?)(.*)$/);
	if (fallbackMatch) {
		const account = fallbackMatch[1].trim();
		const numericPart = fallbackMatch[2].trim();
		const rest = fallbackMatch[3] ?? '';
		const amount = `${numericPart}${rest}`.trim();
		return { trimmed, account, amount };
	}

	return { trimmed, account: trimmed, amount: null };
}

function formatAmountWithStyle(amount: string | null, style: NegativeCommodityStyle): { formatted: string | null } {
	if (!amount) {
		return { formatted: null };
	}

	let formatted = amount;
	if (style === 'signBeforeSymbol') {
		const symbolLeadingRegex = /^(\$|€|£|¥)-(\d+(?:,\d+)*(?:\.\d+)?)(.*)$/;
		formatted = formatted.replace(symbolLeadingRegex, '-$1$2$3');
	} else {
		const signLeadingRegex = /^-(\$|€|£|¥)(\d+(?:,\d+)*(?:\.\d+)?)(.*)$/;
		formatted = formatted.replace(signLeadingRegex, '$1-$2$3');
	}

	return { formatted };
}

function getDigitsPrefixLength(amount: string): number {
	const trimmedAmount = amount.trimStart();
	const matchIndex = trimmedAmount.search(/[0-9]/);
	return matchIndex === -1 ? trimmedAmount.length : matchIndex;
}

/**
 * Formats a transaction header by normalizing spaces between date, status marker, and description
 * @param headerLine The transaction header line
 * @returns Formatted transaction header line
 */
const TRANSACTION_DATE_PREFIX = /^(\d{4})([-/.])(\d{1,2})\2(\d{1,2})/;

interface DateComponents {
	year: number;
	month: number;
	day: number;
}

function extractDateComponents(text: string): { components: DateComponents; raw: string } | null {
	const match = text.match(TRANSACTION_DATE_PREFIX);
	if (!match) {
		return null;
	}

	const year = Number(match[1]);
	const month = Number(match[3]);
	const day = Number(match[4]);

	if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
		return null;
	}

	if (month < 1 || month > 12 || day < 1 || day > 31) {
		return null;
	}

	return {
		components: { year, month, day },
		raw: match[0]
	};
}

function formatDate(components: DateComponents, format: DateFormatStyle): string {
	const year = components.year.toString().padStart(4, '0');
	const month = components.month.toString().padStart(2, '0');
	const day = components.day.toString().padStart(2, '0');

	switch (format) {
		case 'YYYY/MM/DD':
			return `${year}/${month}/${day}`;
		case 'YYYY.MM.DD':
			return `${year}.${month}.${day}`;
		case 'YYYY-MM-DD':
		default:
			return `${year}-${month}-${day}`;
	}
}

function toIsoDate(components: DateComponents): string {
	const year = components.year.toString().padStart(4, '0');
	const month = components.month.toString().padStart(2, '0');
	const day = components.day.toString().padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function isTransactionHeaderLine(line: string): boolean {
	const trimmed = line.trim();
	return extractDateComponents(trimmed) !== null;
}

function formatTransactionHeader(headerLine: string, options: FormatterOptions): string {
	const commentRegex = /\s*;.*$/;
	const commentIndex = headerLine.search(commentRegex);
	const commentPart = commentIndex !== -1 ? headerLine.slice(commentIndex) : '';
	const headerWithoutComment = commentIndex !== -1 ? headerLine.slice(0, commentIndex) : headerLine;
	const trimmedHeader = headerWithoutComment.trim();
	if (!trimmedHeader) {
		return headerLine;
	}

	const dateInfo = extractDateComponents(trimmedHeader);
	if (!dateInfo) {
		return headerLine;
	}

	const { components, raw } = dateInfo;
	let remainder = trimmedHeader.slice(raw.length).trimStart();
	let status = '';
	if (remainder.startsWith('*') || remainder.startsWith('!')) {
		status = remainder.charAt(0);
		remainder = remainder.slice(1).trimStart();
	}

	let code = '';
	if (remainder.startsWith('(')) {
		const codeMatch = remainder.match(/^\([^)]*\)/);
		if (codeMatch) {
			code = codeMatch[0];
			remainder = remainder.slice(codeMatch[0].length).trimStart();
		}
	}

	const description = remainder;
	const formattedDate = formatDate(components, options.dateFormat);
	const segments: string[] = [formattedDate];
	if (status) {
		segments.push(status);
	}
	if (code) {
		segments.push(code);
	}
	if (description) {
		segments.push(description);
	}

	// Transaction headers should always start at column 0 (no leading whitespace)
	const baseHeader = segments.join(' ');
	if (!commentPart) {
		return baseHeader;
	}

	return commentPart.startsWith(';') ? `${baseHeader}${commentPart}` : `${baseHeader}${commentPart}`;
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
		const trimmed = line.trim();
		const dateInfo = extractDateComponents(trimmed);
		
		if (dateInfo) {
			hasSeenTransaction = true;
			// If we had a previous transaction, save it
			if (inTransaction && currentTransaction.length > 0) {
				transactions.push({
					date: currentDate,
					content: currentTransaction.join('\n')
				});
			}
			
			// Start new transaction
			currentDate = toIsoDate(dateInfo.components);
			currentTransaction = [line];
			inTransaction = true;
		} else if (inTransaction) {
			// Check if this is an empty line
			if (!line.trim()) {
				// Empty line might end the transaction
				// But we need to check if the next non-empty line is a new transaction
				let nextTransactionFound = false;
				for (let j = i + 1; j < lines.length; j++) {
					const lookaheadTrimmed = lines[j].trim();
					if (lookaheadTrimmed) {
						if (isTransactionHeaderLine(lookaheadTrimmed)) {
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
 * @param optionsOrColumn Optional formatter options or an amount column position for backward compatibility
 * @returns The text with comments toggled on the specified lines
 */
export function toggleCommentLines(text: string, startLine: number, endLine: number, optionsOrColumn?: number | Partial<FormatterOptions>): string {
	const options = normalizeFormatterOptions(optionsOrColumn);
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
		const parsedComment = parseCommentLine(lineText);

		if (!parsedComment) {
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
		const parsedComment = parseCommentLine(lineText);

		if (hasUncommentedLines) {
			// Comment all lines (including already commented ones)
			if (!parsedComment) {
				// Line is not commented, so comment it
				const leadingWhitespace = lineText.match(/^\s*/)?.[0] || '';
				const restOfLine = lineText.substring(leadingWhitespace.length);
				// Use configured comment character and add a space after it
				lines[lineNumber] = `${leadingWhitespace}${options.commentCharacter} ${restOfLine}`;
			}
			// If line is already commented, leave it as-is
		} else {
			// Uncomment all lines (all lines should be commented at this point)
			if (parsedComment) {
				// Uncomment: restore original whitespace and content
				lines[lineNumber] = `${parsedComment.leadingWhitespace}${parsedComment.content}`;
			}
		}
	}

	return lines.join('\n');
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

/**
 * Calculates the balancing amount for a transaction
 * @param transaction Transaction info with lines
 * @param options Formatter options for styling
 * @param currentLineAccountName The account name on the current line (where suggestion will appear)
 * @returns Formatted balancing amount with proper spacing or null if cannot calculate
 */
export function calculateBalancingAmount(
	transaction: { headerLine: number; lines: string[] },
	options: FormatterOptions,
	currentLineAccountName: string,
	context?: { currentLineText?: string; cursorColumn?: number }
): string | null {
	const postingLines = transaction.lines.slice(1); // Skip header
	const indentWidth = Math.max(0, options.indentationWidth);
	const currentLineText = context?.currentLineText ?? '';

	// Parse all postings
	const postings: Array<{
		line: string;
		hasAmount: boolean;
		amount: number | null;
		currency: string | null;
		account: string | null;
	}> = [];

	for (const line of postingLines) {
		const trimmed = line.trim();

		// Skip empty lines and comments
		if (!trimmed || isCommentLine(trimmed)) {
			continue;
		}

		// Skip metadata lines (e.g., project:, note:)
		if (isMetadataPostingLine(trimmed)) {
			continue;
		}

		// Extract posting detail
		const detail = extractPostingDetail(line);
		if (!detail.account) {
			continue;
		}

		if (isMetadataPostingAccount(detail.account)) {
			continue;
		}

		if (detail.amount) {
			// Parse amount
			const parsed = parseAmount(detail.amount);
			if (parsed) {
				postings.push({
					line,
					hasAmount: true,
					amount: parsed.value,
					currency: parsed.currency,
					account: detail.account
				});
			} else {
				postings.push({
					line,
					hasAmount: false,
					amount: null,
					currency: null,
					account: detail.account
				});
			}
		} else {
			postings.push({
				line,
				hasAmount: false,
				amount: null,
				currency: null,
				account: detail.account
			});
		}
	}

	// Only suggest if exactly one posting is missing an amount
	const postingsWithoutAmount = postings.filter(p => !p.hasAmount);
	if (postingsWithoutAmount.length !== 1) {
		return null;
	}

	// Calculate sum of all amounts (should balance to zero)
	const amountsByCurrency = new Map<string, number>();
	for (const posting of postings) {
		if (posting.hasAmount && posting.amount !== null && posting.currency !== null) {
			const current = amountsByCurrency.get(posting.currency) || 0;
			amountsByCurrency.set(posting.currency, current + posting.amount);
		}
	}

	// Only support single currency for now
	if (amountsByCurrency.size !== 1) {
		return null;
	}

	const [currency, sum] = Array.from(amountsByCurrency.entries())[0];
	const balancingValue = -sum;

	// If the transaction already balances, don't suggest an amount
	if (Math.abs(balancingValue) < 1e-8) {
		return null;
	}

	// Format the amount
	const formattedAmount = formatAmountValue(balancingValue, currency, options.negativeCommodityStyle);

	// Calculate proper spacing based on alignment settings
	// This mirrors the logic in formatTransaction()
	const digitsPrefixLength = getDigitsPrefixLength(formattedAmount);

	const currentIndentLength = currentLineText
		? getLeadingWhitespaceLength(currentLineText)
		: indentWidth;
	const accountEndColumn = currentLineText
		? findAccountEndColumn(currentLineText, currentLineAccountName, currentIndentLength)
		: currentIndentLength + currentLineAccountName.length;
	const cursorColumn = context?.cursorColumn ?? accountEndColumn;
	const minimumDigitsColumn = accountEndColumn + 2 + digitsPrefixLength;
	const cursorDigitsColumn = Math.max(minimumDigitsColumn, cursorColumn + digitsPrefixLength);

	let baseDigitsColumn: number;
	if (options.amountAlignment === 'widest') {
		// Calculate max column position from existing amounts
		const postingsWithAmounts = postings.filter(p => p.hasAmount && p.account);
		const digitColumnCandidates = postingsWithAmounts
			.map(p => {
				const posting = p as { account: string; line: string };
				const detail = extractPostingDetail(posting.line);
				if (!detail.amount) {
					return null;
				}

				const postingIndentLength = getLeadingWhitespaceLength(posting.line);
				const accountEnd = findAccountEndColumn(posting.line, posting.account, postingIndentLength);
				const existingDigitsColumn = findDigitsColumnInLine(posting.line, accountEnd);

				if (existingDigitsColumn !== null) {
					return existingDigitsColumn;
				}

				const { formatted } = formatAmountWithStyle(detail.amount, options.negativeCommodityStyle);
				const postingDigitsPrefix = formatted ? getDigitsPrefixLength(formatted.trim()) : 0;
				return postingIndentLength + posting.account.length + postingDigitsPrefix + 2;
			})
			.filter((value): value is number => value !== null);

		// Get the widest account length as fallback
		const referenceAccountLength = Math.max(
			...postings.map(p => p.account?.length || 0),
			currentLineAccountName.length
		);
		const fallbackIndent = currentLineText ? currentIndentLength : indentWidth;
		const fallbackColumn = fallbackIndent + referenceAccountLength + digitsPrefixLength + 2;

		baseDigitsColumn = digitColumnCandidates.length > 0
			? Math.max(fallbackColumn, cursorDigitsColumn, ...digitColumnCandidates)
			: Math.max(fallbackColumn, cursorDigitsColumn);
	} else {
		// Fixed column mode
		const cursorDigitsColumnFixed = Math.max(
			minimumDigitsColumn,
			cursorColumn + digitsPrefixLength
		);
		baseDigitsColumn = Math.max(options.amountColumnPosition, cursorDigitsColumnFixed);
	}

	// Calculate padding needed (only add additional spaces beyond what already exists)
	const existingSpacing = Math.max(0, cursorColumn - accountEndColumn);
	const basePadding = Math.max(2, baseDigitsColumn - accountEndColumn - digitsPrefixLength);
	const paddingNeeded = Math.max(0, basePadding - existingSpacing);

	return ' '.repeat(paddingNeeded) + formattedAmount;
}

function getLeadingWhitespaceLength(value: string): number {
	return value.length - value.trimStart().length;
}

function findAccountEndColumn(line: string, account: string, indentLength: number): number {
	const accountIndex = line.indexOf(account, indentLength);
	if (accountIndex !== -1) {
		return accountIndex + account.length;
	}
	return indentLength + account.length;
}

function findDigitsColumnInLine(line: string, startIndex: number): number | null {
	for (let i = startIndex; i < line.length; i++) {
		const char = line[i];
		if (char === ';') {
			break;
		}
		const code = line.charCodeAt(i);
		if (code >= 48 && code <= 57) {
			return i;
		}
	}
	return null;
}

function parseNumber(numStr: string): number {
	// Handle European format with comma as decimal separator
	if (numStr.includes(',') && !numStr.includes('.')) {
		return parseFloat(numStr.replace(',', '.'));
	}

	return parseFloat(numStr.replace(/,/g, ''));
}

/**
 * Parses an amount string and extracts value and currency
 * @param amountStr Amount string (e.g., "$100.50", "-$50.00", "100.50 USD")
 * @returns Parsed amount or null if invalid
 */
export function parseAmount(amountStr: string): { value: number; currency: string } | null {
	const trimmed = amountStr.trim();

	// Try to match currency before number: $100, -$100, $-100, "US Dollar" 100, USD 100
	const currencyFirstMatch = trimmed.match(/^(-)?("[^"]+"|[^\d\-+.@*;\t "{}=]+)\s*(-)?(\d+(?:,\d+)*(?:\.\d+)?)(.*)$/);
	if (currencyFirstMatch) {
		const sign1 = currencyFirstMatch[1];
		const currency = currencyFirstMatch[2];
		const sign2 = currencyFirstMatch[3];
		const numericPart = currencyFirstMatch[4];

		// Determine sign
		const isNegative = sign1 === '-' || sign2 === '-';

		// Parse numeric value (remove commas)
		const value = parseNumber(numericPart);
		if (isNaN(value)) {
			return null;
		}

		return {
			value: isNegative ? -value : value,
			currency
		};
	}

	// Try to match plain number before currency: 100.50 USD, -100.50 "US Dollar", 100 €
	const numberFirstMatch = trimmed.match(/^(-)?(\d+(?:,\d+)*(?:\.\d+)?)\s*("[^"]+"|[^\d\-+.@*;\t "{}=]+)?$/);
	if (numberFirstMatch) {
		const isNegative = numberFirstMatch[1] === '-';
		const numericPart = numberFirstMatch[2];
		const quotedCurrency = numberFirstMatch[3];
		const unquotedCurrency = numberFirstMatch[4];
		const currency = quotedCurrency || unquotedCurrency || '$'; // Default to $

		const value = parseNumber(numericPart);
		if (isNaN(value)) {
			return null;
		}

		return {
			value: isNegative ? -value : value,
			currency
		};
	}

	return null;
}

/**
 * Formats an amount value with currency
 * @param value Numeric value
 * @param currency Currency symbol or code
 * @param style Negative commodity style
 * @returns Formatted amount string
 */
export function formatAmountValue(value: number, currency: string, style: NegativeCommodityStyle): string {
	const absValue = Math.abs(value);
	const isNegative = value < 0;

	// Format number with 2 decimal places and commas
	const formattedNumber = absValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

	// Apply currency and sign based on style
	if (style === 'signBeforeSymbol') {
		// -$100.00
		return isNegative ? `-${currency}${formattedNumber}` : `${currency}${formattedNumber}`;
	} else {
		// $-100.00 or $100.00
		return isNegative ? `${currency}-${formattedNumber}` : `${currency}${formattedNumber}`;
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
