import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [tsconfigPaths()],

	resolve: {
		alias: {
			obsidian: new URL("./tests/__mocks__/obsidian.ts", import.meta.url)
				.pathname,
		},
	},

	test: {
		// Test file patterns
		include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
		exclude: ["node_modules", "dist", "exampleVault"],

		// Global setup
		setupFiles: ["./tests/setup.ts"],

		// Environment
		environment: "node",
		globals: true,

		// Coverage configuration
		coverage: {
			provider: "v8",
			enabled: false, // Enable with --coverage flag
			include: ["src/**/*.ts"],
			exclude: [
				"node_modules/",
				"tests/",
				"**/*.test.ts",
				"**/*.d.ts",
				"src/main.ts", // Entry point
				"src/components/ast/test.ts", // Old test file
			],
			reporter: ["text", "html", "lcov"],
			reportsDirectory: "./coverage",
			thresholds: {
				lines: 50,
				functions: 50,
				branches: 50,
				statements: 50,
			},
		},

		// Timeouts
		testTimeout: 10000,

		// Reporter
		reporters: ["verbose"],
	},
});
