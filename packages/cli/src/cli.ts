import * as fs from 'fs';
import { Command } from 'commander';
import {
	formatHledgerJournal,
	sortHledgerJournal,
	type FormatterOptions
} from '@hledger-fmt/formatter';

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

const program = new Command();

program
	.name('hledger-fmt')
	.description('Format and sort hledger journal files')
	.version(readVersion());

program
	.command('format')
	.description('Format a journal file')
	.argument('[file]', 'journal file to format (reads stdin if omitted)')
	.option('--alignment <mode>', 'amount alignment mode (fixedColumn or widest)', 'widest')
	.option('--column <n>', 'column position for fixed alignment', '42')
	.option('--indent <width>', 'indentation width (2 or 4)', '4')
	.option('--negative-style <style>', 'negative amount style (signBeforeSymbol or symbolBeforeSign)', 'symbolBeforeSign')
	.option('--date-format <fmt>', 'date format (YYYY-MM-DD, YYYY/MM/DD, or YYYY.MM.DD)', 'YYYY-MM-DD')
	.option('--comment-char <char>', 'comment character (; # or *)', ';')
	.option('-i, --in-place', 'modify file in place (requires file argument)')
	.action((file: string | undefined, opts: Record<string, string | boolean | undefined>) => {
		if (opts.inPlace && !file) {
			console.error('Error: --in-place requires a file argument.');
			process.exit(1);
		}

		const input = readInput(file);

		const options: Partial<FormatterOptions> = {
			amountAlignment: opts.alignment as FormatterOptions['amountAlignment'],
			amountColumnPosition: parseInt(opts.column as string, 10),
			indentationWidth: parseInt(opts.indent as string, 10),
			negativeCommodityStyle: opts.negativeStyle as FormatterOptions['negativeCommodityStyle'],
			dateFormat: opts.dateFormat as FormatterOptions['dateFormat'],
			commentCharacter: opts.commentChar as FormatterOptions['commentCharacter']
		};

		const result = formatHledgerJournal(input, options);
		writeOutput(result, file, !!opts.inPlace);
	});

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
