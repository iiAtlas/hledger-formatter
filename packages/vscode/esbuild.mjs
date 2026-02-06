import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const options = {
	entryPoints: [path.resolve(__dirname, 'src/extension.ts')],
	bundle: true,
	platform: 'node',
	target: 'node18',
	format: 'cjs',
	outfile: path.resolve(__dirname, 'dist/extension.js'),
	external: ['vscode'],
	sourcemap: !production,
	minify: production,
	nodePaths: [path.resolve(__dirname, '../../node_modules')],
};

if (watch) {
	const ctx = await esbuild.context(options);
	await ctx.watch();
	console.log('Watching for changes...');
} else {
	await esbuild.build(options);
}
