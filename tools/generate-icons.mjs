import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const iconsDir = path.join(projectRoot, "icons");
const sourceSvg = path.join(iconsDir, "fullscreenr.svg");

const SIZES = [16, 48, 128];

async function ensureIconsDir() {
	await fs.mkdir(iconsDir, { recursive: true });
}

function roundedMaskSvg(size, radius) {
	return Buffer.from(
		[
			'<svg xmlns="http://www.w3.org/2000/svg" width="',
			size,
			'" height="',
			size,
			'">',
			'<rect x="0" y="0" width="',
			size,
			'" height="',
			size,
			'" rx="',
			radius,
			'" ry="',
			radius,
			'" fill="#ffffff"/>',
			"</svg>"
		].join("")
	);
}

async function generateIcon(size) {
	const padding = Math.round(size * 0.18);
	const radius = Math.round(size * 0.18);

	const base = sharp({
		create: {
			width: size,
			height: size,
			channels: 4,
			background: { r: 255, g: 255, b: 255, alpha: 1 }
		}
	});

	const iconBuffer = await sharp(sourceSvg)
		.resize(size - padding * 2, size - padding * 2, {
			fit: "contain"
		})
		.toBuffer();

	const mask = roundedMaskSvg(size, radius);

	const output = await base
		.composite([
			{ input: iconBuffer, gravity: "center" },
			{ input: mask, blend: "dest-in" }
		])
		.png()
		.toBuffer();

	const outputPath = path.join(iconsDir, `icon${size}.png`);
	await fs.writeFile(outputPath, output);
}

async function main() {
	await ensureIconsDir();

	try {
		await fs.access(sourceSvg);
	} catch {
		throw new Error(`Source SVG not found at ${sourceSvg}`);
	}

	for (const size of SIZES) {
		console.log(`Generating icon ${size}x${size}`);
		 
		await generateIcon(size);
	}

	console.log("Icon generation complete.");
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

