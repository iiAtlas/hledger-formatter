import { describe, it, expect } from 'vitest';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const exec = promisify(execFile);

function runWithStdin(args: string[], input: string): Promise<{ stdout: string; stderr: string; code: number | null }> {
	return new Promise((resolve, reject) => {
		const child = spawn('node', args, { stdio: ['pipe', 'pipe', 'pipe'] });
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (d: Buffer) => { stdout += d; });
		child.stderr.on('data', (d: Buffer) => { stderr += d; });
		child.on('error', reject);
		child.on('close', (code) => resolve({ stdout, stderr, code }));
		child.stdin.end(input);
	});
}

const CLI = path.resolve(__dirname, '../bin/hledger-fmt.js');
const FIXTURES = path.resolve(__dirname, '../../formatter/test/test_journals');

function fixture(name: string): string {
	return path.join(FIXTURES, name);
}

function readFixture(name: string): string {
	return fs.readFileSync(fixture(name), 'utf8');
}

function normalize(text: string): string {
	return text.split('\n').map(l => l.trimEnd()).join('\n').trim();
}

describe('CLI', () => {
	describe('format', () => {
		it('formats a file argument', async () => {
			const { stdout } = await exec('node', [CLI, 'format', fixture('test_1_in.journal')]);
			const expected = readFixture('test_1_out.journal');
			expect(normalize(stdout)).toBe(normalize(expected));
		});

		it('formats stdin via pipe', async () => {
			const input = readFixture('test_1_in.journal');
			const { stdout } = await runWithStdin([CLI, 'format'], input);
			const expected = readFixture('test_1_out.journal');
			expect(normalize(stdout)).toBe(normalize(expected));
		});

		it('formats with --indent 2', async () => {
			const { stdout } = await exec('node', [CLI, 'format', '--indent', '2', fixture('test_1_in.journal')]);
			// With indent 2, posting lines should start with 2 spaces
			const lines = stdout.split('\n').filter(l => l.match(/^\s+\S/));
			for (const line of lines) {
				if (line.trimStart().startsWith(';')) continue; // skip comments
				expect(line).toMatch(/^ {2}\S/);
			}
		});

		it('formats with --negative-style signBeforeSymbol', async () => {
			const { stdout } = await exec('node', [CLI, 'format', '--negative-style', 'signBeforeSymbol', fixture('sample_in.journal')]);
			// negative amounts should appear as -$X.XX not $-X.XX
			const negativeAmounts = stdout.match(/-\$[\d.]+/g);
			expect(negativeAmounts).toBeTruthy();
			expect(negativeAmounts!.length).toBeGreaterThan(0);
		});

		it('formats in-place with -i flag', async () => {
			const tmp = path.join(os.tmpdir(), `hledger-fmt-test-${Date.now()}.journal`);
			try {
				fs.copyFileSync(fixture('test_1_in.journal'), tmp);
				await exec('node', [CLI, 'format', '-i', tmp]);
				const result = fs.readFileSync(tmp, 'utf8');
				const expected = readFixture('test_1_out.journal');
				expect(normalize(result)).toBe(normalize(expected));
			} finally {
				fs.unlinkSync(tmp);
			}
		});

		it('fails with --in-place and no file', async () => {
			await expect(exec('node', [CLI, 'format', '-i'])).rejects.toMatchObject({
				code: 1,
				stderr: expect.stringContaining('--in-place requires a file argument'),
			});
		});

		it('loads formatter options from config file', async () => {
			const cfg = path.join(os.tmpdir(), `hledger-fmt-config-${Date.now()}.json`);
			try {
				fs.writeFileSync(cfg, JSON.stringify({
					format: {
						dateFormat: 'YYYY/MM/DD',
						negativeStyle: 'signBeforeSymbol'
					}
				}), 'utf8');

				const { stdout } = await exec('node', [CLI, 'format', '--config', cfg, fixture('test_1_in.journal')]);
				expect(stdout).toContain('2025/03/04 * Fastmail subscription');
				expect(stdout).toContain('-$38.99');
			} finally {
				fs.unlinkSync(cfg);
			}
		});

		it('warns and ignores invalid config file', async () => {
			const cfg = path.join(os.tmpdir(), `hledger-fmt-invalid-config-${Date.now()}.json`);
			try {
				fs.writeFileSync(cfg, JSON.stringify({
					format: {
						alignment: 'not-a-real-mode'
					}
				}), 'utf8');

				const { stdout, stderr } = await exec('node', [CLI, 'format', '--config', cfg, fixture('test_1_in.journal')]);
				const expected = readFixture('test_1_out.journal');
				expect(stderr).toContain('invalid config');
				expect(normalize(stdout)).toBe(normalize(expected));
			} finally {
				fs.unlinkSync(cfg);
			}
		});

		it('applies env options and CLI options with correct precedence', async () => {
			const cfg = path.join(os.tmpdir(), `hledger-fmt-precedence-${Date.now()}.json`);
			try {
				fs.writeFileSync(cfg, JSON.stringify({
					format: {
						dateFormat: 'YYYY.MM.DD'
					}
				}), 'utf8');

				const { stdout } = await exec(
					'node',
					[CLI, 'format', '--config', cfg, '--date-format', 'YYYY-MM-DD', fixture('test_1_in.journal')],
					{
						env: {
							...process.env,
							HLEDGER_FMT_DATE_FORMAT: 'YYYY/MM/DD'
						}
					}
				);

				expect(stdout).toContain('2025-03-04 * Fastmail subscription');
				expect(stdout).not.toContain('2025/03/04 * Fastmail subscription');
				expect(stdout).not.toContain('2025.03.04 * Fastmail subscription');
			} finally {
				fs.unlinkSync(cfg);
			}
		});
	});

	describe('sort', () => {
		it('sorts a file by date', async () => {
			const { stdout } = await exec('node', [CLI, 'sort', fixture('sort_in.journal')]);
			const expected = readFixture('sort_out.journal');
			expect(normalize(stdout)).toBe(normalize(expected));
		});

		it('sorts stdin via pipe', async () => {
			const input = readFixture('sort_in.journal');
			const { stdout } = await runWithStdin([CLI, 'sort'], input);
			const expected = readFixture('sort_out.journal');
			expect(normalize(stdout)).toBe(normalize(expected));
		});

		it('sorts in-place with -i flag', async () => {
			const tmp = path.join(os.tmpdir(), `hledger-fmt-sort-test-${Date.now()}.journal`);
			try {
				fs.copyFileSync(fixture('sort_in.journal'), tmp);
				await exec('node', [CLI, 'sort', '-i', tmp]);
				const result = fs.readFileSync(tmp, 'utf8');
				const expected = readFixture('sort_out.journal');
				expect(normalize(result)).toBe(normalize(expected));
			} finally {
				fs.unlinkSync(tmp);
			}
		});
	});

	describe('general', () => {
		it('shows version with --version', async () => {
			const { stdout } = await exec('node', [CLI, '--version']);
			expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
		});

		it('shows help with --help', async () => {
			const { stdout } = await exec('node', [CLI, '--help']);
			expect(stdout).toContain('Format and sort hledger journal files');
			expect(stdout).toContain('format');
			expect(stdout).toContain('sort');
		});

		it('exits with error for unknown command', async () => {
			await expect(exec('node', [CLI, 'bogus'])).rejects.toMatchObject({
				code: 1,
			});
		});
	});

	describe('init', () => {
		it('creates a default config file', async () => {
			const dir = path.join(os.tmpdir(), `hledger-fmt-init-${Date.now()}`);
			const cfg = path.join(dir, '.hledger-fmt.json');
			try {
				await exec('node', [CLI, 'init', '--path', cfg]);
				const content = fs.readFileSync(cfg, 'utf8');
				const parsed = JSON.parse(content);
				expect(parsed).toEqual({
					format: {
						alignment: 'widest',
						column: 42,
						indent: 4,
						negativeStyle: 'symbolBeforeSign',
						dateFormat: 'YYYY-MM-DD',
						commentChar: ';'
					}
				});
			} finally {
				fs.rmSync(dir, { recursive: true, force: true });
			}
		});

		it('fails if config already exists without --force', async () => {
			const dir = path.join(os.tmpdir(), `hledger-fmt-init-existing-${Date.now()}`);
			const cfg = path.join(dir, '.hledger-fmt.json');
			try {
				fs.mkdirSync(dir, { recursive: true });
				fs.writeFileSync(cfg, '{"format":{"indent":2}}\n', 'utf8');
				await expect(exec('node', [CLI, 'init', '--path', cfg])).rejects.toMatchObject({
					code: 1,
					stderr: expect.stringContaining('already exists'),
				});
			} finally {
				fs.rmSync(dir, { recursive: true, force: true });
			}
		});

		it('overwrites config when --force is provided', async () => {
			const dir = path.join(os.tmpdir(), `hledger-fmt-init-force-${Date.now()}`);
			const cfg = path.join(dir, '.hledger-fmt.json');
			try {
				fs.mkdirSync(dir, { recursive: true });
				fs.writeFileSync(cfg, '{"format":{"indent":2}}\n', 'utf8');
				await exec('node', [CLI, 'init', '--path', cfg, '--force']);
				const parsed = JSON.parse(fs.readFileSync(cfg, 'utf8'));
				expect(parsed.format.indent).toBe(4);
				expect(parsed.format.alignment).toBe('widest');
			} finally {
				fs.rmSync(dir, { recursive: true, force: true });
			}
		});
	});
});
