import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await esbuild.build({
	entryPoints: [path.resolve(__dirname, 'src/cli.ts')],
	bundle: true,
	platform: 'node',
	target: 'node18',
	format: 'cjs',
	outfile: path.resolve(__dirname, 'dist/cli.js'),
	sourcemap: true,
	nodePaths: [path.resolve(__dirname, '../../node_modules')],
});
