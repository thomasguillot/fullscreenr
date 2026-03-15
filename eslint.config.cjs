const globals = require("globals");

module.exports = [
	{
		ignores: ["node_modules/", "icons/*.png", "**/package-lock.json", "eslint.config.cjs"],
	},
	// Extension scripts (browser + Chrome API)
	{
		files: ["*.js"],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "script",
			globals: {
				...globals.browser,
				chrome: "readonly",
			},
		},
		rules: {
			indent: ["error", "tab"],
			"no-mixed-spaces-and-tabs": "error",
			"no-trailing-spaces": "error",
			"no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
			"no-console": "off",
		},
	},
	// Tools (Node ESM)
	{
		files: ["tools/**/*.mjs"],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "module",
			globals: {
				...globals.node,
			},
		},
		rules: {
			indent: ["error", "tab"],
			"no-mixed-spaces-and-tabs": "error",
			"no-trailing-spaces": "error",
			"no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
			"no-console": "off",
		},
	},
];
