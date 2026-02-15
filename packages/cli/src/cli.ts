import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import {
	formatHledgerJournal,
	sortHledgerJournal,
	DEFAULT_FORMATTER_OPTIONS,
	type FormatterOptions
} from '@hledger-fmt/formatter';

interface FormatConfigShape {
	format?: {
		alignment?: string;
		column?: number;
		indent?: number;
		negativeStyle?: string;
		dateFormat?: string;
		commentChar?: string;
	};
}

interface FormatCommandOptions {
	alignment?: string;
	column?: string;
	indent?: string;
	negativeStyle?: string;
	dateFormat?: string;
	commentChar?: string;
	config?: string;
	inPlace?: boolean;
}

interface InitCommandOptions {
	path?: string;
	force?: boolean;
}

const VALID_ALIGNMENTS = new Set<FormatterOptions['amountAlignment']>(['fixedColumn', 'widest']);
const VALID_NEGATIVE_STYLES = new Set<FormatterOptions['negativeCommodityStyle']>(['signBeforeSymbol', 'symbolBeforeSign']);
const VALID_DATE_FORMATS = new Set<FormatterOptions['dateFormat']>(['YYYY-MM-DD', 'YYYY/MM/DD', 'YYYY.MM.DD']);
const VALID_COMMENT_CHARS = new Set<FormatterOptions['commentCharacter']>([';', '#', '*']);

function readVersion(): string {
	try {
		const pkg = JSON.parse(fs.readFileSync(require.resolve('../package.json'), 'utf8'));
		return pkg.version ?? '0.0.0';
	} catch {
		return '0.0.0';
	}
}

function readInput(filePath: string | undefined): string {
	if (filePath) {
		return fs.readFileSync(filePath, 'utf8');
	}
	if (process.stdin.isTTY) {
		console.error('Error: no input file specified and stdin is a terminal.');
		console.error('Usage: hledger-fmt format [options] [file]');
		console.error('       cat file.journal | hledger-fmt format');
		process.exit(1);
	}
	return fs.readFileSync(0, 'utf8');
}

function writeOutput(result: string, filePath: string | undefined, inPlace: boolean): void {
	if (inPlace && filePath) {
		fs.writeFileSync(filePath, result, 'utf8');
	} else {
		process.stdout.write(result);
	}
}

function warn(message: string): void {
	console.error(`Warning: ${message}`);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseInteger(value: unknown): number | null {
	if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
		return value;
	}
	return null;
}

function configPathFromOptions(configOption: string | undefined): string | null {
	if (configOption) {
		return path.resolve(process.cwd(), configOption);
	}

	const discoveredPath = path.resolve(process.cwd(), '.hledger-fmt.json');
	return fs.existsSync(discoveredPath) ? discoveredPath : null;
}

function validateConfigShape(raw: unknown, sourcePath: string): FormatConfigShape | null {
	if (!isObjectRecord(raw)) {
		warn(`invalid config at ${sourcePath}; root must be a JSON object. Ignoring config file.`);
		return null;
	}

	const allowedRootKeys = new Set(['format']);
	for (const key of Object.keys(raw)) {
		if (!allowedRootKeys.has(key)) {
			warn(`invalid config at ${sourcePath}; unknown key "${key}". Ignoring config file.`);
			return null;
		}
	}

	const formatValue = raw.format;
	if (formatValue === undefined) {
		return {};
	}

	if (!isObjectRecord(formatValue)) {
		warn(`invalid config at ${sourcePath}; "format" must be an object. Ignoring config file.`);
		return null;
	}

	const allowedFormatKeys = new Set(['alignment', 'column', 'indent', 'negativeStyle', 'dateFormat', 'commentChar']);
	for (const key of Object.keys(formatValue)) {
		if (!allowedFormatKeys.has(key)) {
			warn(`invalid config at ${sourcePath}; unknown format key "${key}". Ignoring config file.`);
			return null;
		}
	}

	const alignment = formatValue.alignment;
	if (alignment !== undefined && (typeof alignment !== 'string' || !VALID_ALIGNMENTS.has(alignment as FormatterOptions['amountAlignment']))) {
		warn(`invalid config at ${sourcePath}; format.alignment must be "fixedColumn" or "widest". Ignoring config file.`);
		return null;
	}

	const column = formatValue.column;
	if (column !== undefined && parseInteger(column) === null) {
		warn(`invalid config at ${sourcePath}; format.column must be a non-negative integer. Ignoring config file.`);
		return null;
	}

	const indent = formatValue.indent;
	if (indent !== undefined && parseInteger(indent) === null) {
		warn(`invalid config at ${sourcePath}; format.indent must be a non-negative integer. Ignoring config file.`);
		return null;
	}

	const negativeStyle = formatValue.negativeStyle;
	if (negativeStyle !== undefined && (typeof negativeStyle !== 'string' || !VALID_NEGATIVE_STYLES.has(negativeStyle as FormatterOptions['negativeCommodityStyle']))) {
		warn(`invalid config at ${sourcePath}; format.negativeStyle must be "signBeforeSymbol" or "symbolBeforeSign". Ignoring config file.`);
		return null;
	}

	const dateFormat = formatValue.dateFormat;
	if (dateFormat !== undefined && (typeof dateFormat !== 'string' || !VALID_DATE_FORMATS.has(dateFormat as FormatterOptions['dateFormat']))) {
		warn(`invalid config at ${sourcePath}; format.dateFormat must be one of YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD. Ignoring config file.`);
		return null;
	}

	const commentChar = formatValue.commentChar;
	if (commentChar !== undefined && (typeof commentChar !== 'string' || !VALID_COMMENT_CHARS.has(commentChar as FormatterOptions['commentCharacter']))) {
		warn(`invalid config at ${sourcePath}; format.commentChar must be one of ;, #, *. Ignoring config file.`);
		return null;
	}

	return {
		format: {
			alignment: alignment as string | undefined,
			column: parseInteger(column) ?? undefined,
			indent: parseInteger(indent) ?? undefined,
			negativeStyle: negativeStyle as string | undefined,
			dateFormat: dateFormat as string | undefined,
			commentChar: commentChar as string | undefined
		}
	};
}

function loadFormatOptionsFromConfig(configOption: string | undefined): Partial<FormatterOptions> {
	const resolvedConfigPath = configPathFromOptions(configOption);
	if (!resolvedConfigPath) {
		return {};
	}

	if (!fs.existsSync(resolvedConfigPath)) {
		warn(`invalid config at ${resolvedConfigPath}; file does not exist. Ignoring config file.`);
		return {};
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(fs.readFileSync(resolvedConfigPath, 'utf8')) as unknown;
	} catch {
		warn(`invalid config at ${resolvedConfigPath}; failed to parse JSON. Ignoring config file.`);
		return {};
	}

	const validated = validateConfigShape(parsed, resolvedConfigPath);
	if (!validated?.format) {
		return {};
	}

	const format = validated.format;
	return {
		amountAlignment: format.alignment as FormatterOptions['amountAlignment'] | undefined,
		amountColumnPosition: format.column,
		indentationWidth: format.indent,
		negativeCommodityStyle: format.negativeStyle as FormatterOptions['negativeCommodityStyle'] | undefined,
		dateFormat: format.dateFormat as FormatterOptions['dateFormat'] | undefined,
		commentCharacter: format.commentChar as FormatterOptions['commentCharacter'] | undefined
	};
}

function parseIntegerString(value: string | undefined, sourceDescription: string): number | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (!/^\d+$/.test(value)) {
		warn(`${sourceDescription} must be a non-negative integer. Ignoring value.`);
		return undefined;
	}

	return parseInt(value, 10);
}

function loadFormatOptionsFromEnv(): Partial<FormatterOptions> {
	const result: Partial<FormatterOptions> = {};

	const envAlignment = process.env.HLEDGER_FMT_ALIGNMENT;
	if (envAlignment !== undefined) {
		if (VALID_ALIGNMENTS.has(envAlignment as FormatterOptions['amountAlignment'])) {
			result.amountAlignment = envAlignment as FormatterOptions['amountAlignment'];
		} else {
			warn('invalid HLEDGER_FMT_ALIGNMENT value. Ignoring value.');
		}
	}

	const envColumn = parseIntegerString(process.env.HLEDGER_FMT_COLUMN, 'HLEDGER_FMT_COLUMN');
	if (envColumn !== undefined) {
		result.amountColumnPosition = envColumn;
	}

	const envIndent = parseIntegerString(process.env.HLEDGER_FMT_INDENT, 'HLEDGER_FMT_INDENT');
	if (envIndent !== undefined) {
		result.indentationWidth = envIndent;
	}

	const envNegativeStyle = process.env.HLEDGER_FMT_NEGATIVE_STYLE;
	if (envNegativeStyle !== undefined) {
		if (VALID_NEGATIVE_STYLES.has(envNegativeStyle as FormatterOptions['negativeCommodityStyle'])) {
			result.negativeCommodityStyle = envNegativeStyle as FormatterOptions['negativeCommodityStyle'];
		} else {
			warn('invalid HLEDGER_FMT_NEGATIVE_STYLE value. Ignoring value.');
		}
	}

	const envDateFormat = process.env.HLEDGER_FMT_DATE_FORMAT;
	if (envDateFormat !== undefined) {
		if (VALID_DATE_FORMATS.has(envDateFormat as FormatterOptions['dateFormat'])) {
			result.dateFormat = envDateFormat as FormatterOptions['dateFormat'];
		} else {
			warn('invalid HLEDGER_FMT_DATE_FORMAT value. Ignoring value.');
		}
	}

	const envCommentChar = process.env.HLEDGER_FMT_COMMENT_CHAR;
	if (envCommentChar !== undefined) {
		if (VALID_COMMENT_CHARS.has(envCommentChar as FormatterOptions['commentCharacter'])) {
			result.commentCharacter = envCommentChar as FormatterOptions['commentCharacter'];
		} else {
			warn('invalid HLEDGER_FMT_COMMENT_CHAR value. Ignoring value.');
		}
	}

	return result;
}

function loadFormatOptionsFromCli(opts: FormatCommandOptions): Partial<FormatterOptions> {
	const result: Partial<FormatterOptions> = {};

	if (opts.alignment !== undefined) {
		if (VALID_ALIGNMENTS.has(opts.alignment as FormatterOptions['amountAlignment'])) {
			result.amountAlignment = opts.alignment as FormatterOptions['amountAlignment'];
		} else {
			warn('invalid --alignment value. Ignoring value.');
		}
	}

	const cliColumn = parseIntegerString(opts.column, '--column');
	if (cliColumn !== undefined) {
		result.amountColumnPosition = cliColumn;
	}

	const cliIndent = parseIntegerString(opts.indent, '--indent');
	if (cliIndent !== undefined) {
		result.indentationWidth = cliIndent;
	}

	if (opts.negativeStyle !== undefined) {
		if (VALID_NEGATIVE_STYLES.has(opts.negativeStyle as FormatterOptions['negativeCommodityStyle'])) {
			result.negativeCommodityStyle = opts.negativeStyle as FormatterOptions['negativeCommodityStyle'];
		} else {
			warn('invalid --negative-style value. Ignoring value.');
		}
	}

	if (opts.dateFormat !== undefined) {
		if (VALID_DATE_FORMATS.has(opts.dateFormat as FormatterOptions['dateFormat'])) {
			result.dateFormat = opts.dateFormat as FormatterOptions['dateFormat'];
		} else {
			warn('invalid --date-format value. Ignoring value.');
		}
	}

	if (opts.commentChar !== undefined) {
		if (VALID_COMMENT_CHARS.has(opts.commentChar as FormatterOptions['commentCharacter'])) {
			result.commentCharacter = opts.commentChar as FormatterOptions['commentCharacter'];
		} else {
			warn('invalid --comment-char value. Ignoring value.');
		}
	}

	return result;
}

function resolveFormatterOptions(opts: FormatCommandOptions): Partial<FormatterOptions> {
	const configOptions = loadFormatOptionsFromConfig(opts.config);
	const envOptions = loadFormatOptionsFromEnv();
	const cliOptions = loadFormatOptionsFromCli(opts);

	return {
		amountAlignment: DEFAULT_FORMATTER_OPTIONS.amountAlignment,
		amountColumnPosition: DEFAULT_FORMATTER_OPTIONS.amountColumnPosition,
		indentationWidth: DEFAULT_FORMATTER_OPTIONS.indentationWidth,
		negativeCommodityStyle: DEFAULT_FORMATTER_OPTIONS.negativeCommodityStyle,
		dateFormat: DEFAULT_FORMATTER_OPTIONS.dateFormat,
		commentCharacter: DEFAULT_FORMATTER_OPTIONS.commentCharacter,
		...configOptions,
		...envOptions,
		...cliOptions
	};
}

function getDefaultConfigContents(): string {
	return `${JSON.stringify({
		format: {
			alignment: DEFAULT_FORMATTER_OPTIONS.amountAlignment,
			column: DEFAULT_FORMATTER_OPTIONS.amountColumnPosition,
			indent: DEFAULT_FORMATTER_OPTIONS.indentationWidth,
			negativeStyle: DEFAULT_FORMATTER_OPTIONS.negativeCommodityStyle,
			dateFormat: DEFAULT_FORMATTER_OPTIONS.dateFormat,
			commentChar: DEFAULT_FORMATTER_OPTIONS.commentCharacter
		}
	}, null, 2)}\n`;
}

const program = new Command();

program
	.name('hledger-fmt')
	.description('Format and sort hledger journal files')
	.version(readVersion());

const formatCommand = program
	.command('format')
	.description('Format a journal file')
	.argument('[file]', 'journal file to format (reads stdin if omitted)')
	.option('--config <path>', 'path to JSON config file (defaults to .hledger-fmt.json in current directory)')
	.option('--alignment <mode>', 'amount alignment mode (fixedColumn or widest)')
	.option('--column <n>', 'column position for fixed alignment')
	.option('--indent <width>', 'indentation width')
	.option('--negative-style <style>', 'negative amount style (signBeforeSymbol or symbolBeforeSign)')
	.option('--date-format <fmt>', 'date format (YYYY-MM-DD, YYYY/MM/DD, or YYYY.MM.DD)')
	.option('--comment-char <char>', 'comment character (; # or *)')
	.option('-i, --in-place', 'modify file in place (requires file argument)')
	.action((file: string | undefined, opts: FormatCommandOptions) => {
		if (opts.inPlace && !file) {
			console.error('Error: --in-place requires a file argument.');
			process.exit(1);
		}

		const input = readInput(file);
		const options = resolveFormatterOptions(opts);
		const result = formatHledgerJournal(input, options);
		writeOutput(result, file, !!opts.inPlace);
	});

formatCommand.addHelpText('after', `
Config:
  Reads config from --config <path> or .hledger-fmt.json in the current directory.
  Precedence: CLI flags > env vars > config file > built-in defaults.
  Env vars: HLEDGER_FMT_ALIGNMENT, HLEDGER_FMT_COLUMN, HLEDGER_FMT_INDENT,
            HLEDGER_FMT_NEGATIVE_STYLE, HLEDGER_FMT_DATE_FORMAT,
            HLEDGER_FMT_COMMENT_CHAR
`);

const initCommand = program
	.command('init')
	.description('Create a default .hledger-fmt.json config file')
	.option('--path <path>', 'path to write config file (defaults to .hledger-fmt.json in current directory)')
	.option('-f, --force', 'overwrite existing config file')
	.action((opts: InitCommandOptions) => {
		const targetPath = path.resolve(process.cwd(), opts.path ?? '.hledger-fmt.json');

		if (fs.existsSync(targetPath) && !opts.force) {
			console.error(`Error: config file already exists at ${targetPath}. Use --force to overwrite.`);
			process.exit(1);
		}

		fs.mkdirSync(path.dirname(targetPath), { recursive: true });
		fs.writeFileSync(targetPath, getDefaultConfigContents(), 'utf8');
		process.stdout.write(`Wrote config file: ${targetPath}\n`);
	});

initCommand.addHelpText('after', `
Allowed values (.hledger-fmt.json):
  format.alignment: fixedColumn | widest
  format.column: non-negative integer
  format.indent: non-negative integer
  format.negativeStyle: signBeforeSymbol | symbolBeforeSign
  format.dateFormat: YYYY-MM-DD | YYYY/MM/DD | YYYY.MM.DD
  format.commentChar: ; | # | *
`);

program
	.command('sort')
	.description('Sort journal entries by date')
	.argument('[file]', 'journal file to sort (reads stdin if omitted)')
	.option('-i, --in-place', 'modify file in place (requires file argument)')
	.action((file: string | undefined, opts: Record<string, string | boolean | undefined>) => {
		if (opts.inPlace && !file) {
			console.error('Error: --in-place requires a file argument.');
			process.exit(1);
		}

		const input = readInput(file);
		const result = sortHledgerJournal(input);
		writeOutput(result, file, !!opts.inPlace);
	});

program.parse();
