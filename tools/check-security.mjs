import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(projectRoot, "manifest.json");
const contentScriptPath = path.join(projectRoot, "content.js");

function fail(message) {
	console.error(`❌ ${message}`);
	process.exitCode = 1;
}

function ok(message) {
	console.log(`✅ ${message}`);
}

async function readJson(filePath) {
	const raw = await fs.readFile(filePath, "utf8");
	return JSON.parse(raw);
}

async function checkManifest() {
	const manifest = await readJson(manifestPath);

	if (manifest.manifest_version !== 3) {
		fail("manifest_version must be 3");
	} else {
		ok("manifest_version is 3");
	}

	const allowedPermissions = ["system.display"];
	const perms = manifest.permissions || [];

	const unexpectedPerms = perms.filter((p) => !allowedPermissions.includes(p));
	if (unexpectedPerms.length > 0) {
		fail(`Unexpected permissions in manifest: ${unexpectedPerms.join(", ")}`);
	} else {
		ok("Only expected permissions are requested (system.display)");
	}

	if (manifest.host_permissions && manifest.host_permissions.length > 0) {
		fail("host_permissions should not be used unless absolutely necessary");
	} else {
		ok("No host_permissions defined");
	}

	const csp = manifest.content_security_policy && manifest.content_security_policy.extension_pages;
	if (csp) {
		if (csp.includes("unsafe-eval")) {
			fail("CSP must not include 'unsafe-eval'");
		}
		if (csp.includes("http:") || csp.includes("https:")) {
			fail("CSP should not reference remote script sources");
		}
		ok("Content Security Policy looks strict");
	} else {
		ok("No custom CSP (Chrome MV3 default applies)");
	}
}

async function checkContentScript() {
	const code = await fs.readFile(contentScriptPath, "utf8");

	if (code.includes("eval(")) {
		fail("content.js must not use eval()");
	}

	if (code.includes("new Function(")) {
		fail("content.js must not use new Function()");
	}

	ok("content.js does not use eval() or new Function()");
}

async function main() {
	await checkManifest();
	await checkContentScript();

	if (process.exitCode && process.exitCode !== 0) {
		console.error("Security checks failed.");
		process.exitCode = 1;
	} else {
		ok("All automated security checks passed.");
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

