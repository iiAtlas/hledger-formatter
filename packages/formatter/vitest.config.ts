import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Only run .test.ts files under test/ — avoids picking up
		// stale .js files from tsc output or other directories.
		include: ['test/*.test.ts'],
	},
});
