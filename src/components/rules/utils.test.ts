import { describe, it, expect } from "vitest";
import { mimeFromExt, escapeHTML, texToSvg } from "./utils";

describe("mimeFromExt", () => {
	it("returns image/png for 'png'", () => {
		expect(mimeFromExt("png")).toBe("image/png");
	});

	it("returns image/png for 'PNG' (case insensitive)", () => {
		expect(mimeFromExt("PNG")).toBe("image/png");
	});

	it("returns image/jpeg for 'jpg'", () => {
		expect(mimeFromExt("jpg")).toBe("image/jpeg");
	});

	it("returns image/jpeg for 'jpeg'", () => {
		expect(mimeFromExt("jpeg")).toBe("image/jpeg");
	});

	it("returns image/jpeg for 'JPG' (case insensitive)", () => {
		expect(mimeFromExt("JPG")).toBe("image/jpeg");
	});

	it("returns image/jpeg for 'JPEG' (case insensitive)", () => {
		expect(mimeFromExt("JPEG")).toBe("image/jpeg");
	});

	it("returns image/gif for 'gif'", () => {
		expect(mimeFromExt("gif")).toBe("image/gif");
	});

	it("returns image/gif for 'GIF' (case insensitive)", () => {
		expect(mimeFromExt("GIF")).toBe("image/gif");
	});

	it("returns image/webp for 'webp'", () => {
		expect(mimeFromExt("webp")).toBe("image/webp");
	});

	it("returns image/webp for 'WEBP' (case insensitive)", () => {
		expect(mimeFromExt("WEBP")).toBe("image/webp");
	});

	it("returns image/svg+xml for 'svg'", () => {
		expect(mimeFromExt("svg")).toBe("image/svg+xml");
	});

	it("returns image/svg+xml for 'SVG' (case insensitive)", () => {
		expect(mimeFromExt("SVG")).toBe("image/svg+xml");
	});

	it("returns image/bmp for 'bmp'", () => {
		expect(mimeFromExt("bmp")).toBe("image/bmp");
	});

	it("returns image/bmp for 'BMP' (case insensitive)", () => {
		expect(mimeFromExt("BMP")).toBe("image/bmp");
	});

	it("returns application/octet-stream for unknown extension", () => {
		expect(mimeFromExt("xyz")).toBe("application/octet-stream");
	});

	it("returns application/octet-stream for empty string", () => {
		expect(mimeFromExt("")).toBe("application/octet-stream");
	});

	it("returns application/octet-stream for random unknown extension", () => {
		expect(mimeFromExt("doc")).toBe("application/octet-stream");
	});
});

describe("escapeHTML", () => {
	it("escapes & to &amp;", () => {
		expect(escapeHTML("&")).toBe("&amp;");
	});

	it("escapes < to &lt;", () => {
		expect(escapeHTML("<")).toBe("&lt;");
	});

	it("escapes > to &gt;", () => {
		expect(escapeHTML(">")).toBe("&gt;");
	});

	it("escapes all special chars in one string", () => {
		expect(escapeHTML("<div>&</div>")).toBe("&lt;div&gt;&amp;&lt;/div&gt;");
	});

	it("returns empty string unchanged", () => {
		expect(escapeHTML("")).toBe("");
	});

	it("returns text without special chars unchanged", () => {
		expect(escapeHTML("Hello World")).toBe("Hello World");
	});

	it("handles multiple ampersands", () => {
		expect(escapeHTML("A & B & C")).toBe("A &amp; B &amp; C");
	});

	it("handles nested HTML tags", () => {
		expect(escapeHTML("<h1><span>Text</span></h1>")).toBe(
			"&lt;h1&gt;&lt;span&gt;Text&lt;/span&gt;&lt;/h1&gt;",
		);
	});

	it("escapes mixed content", () => {
		expect(escapeHTML("5 < 10 & 3 > 2")).toBe(
			"5 &lt; 10 &amp; 3 &gt; 2",
		);
	});

	it("handles consecutive special chars", () => {
		expect(escapeHTML("<<&&>>")).toBe(
			"&lt;&lt;&amp;&amp;&gt;&gt;",
		);
	});
});

describe("texToSvg", () => {
	it("returns SVG string for simple inline formula", () => {
		const result = texToSvg("x = 1");
		expect(result).toContain("<svg");
	});

	it("returns SVG string for simple block formula", () => {
		const result = texToSvg("x = 1", true);
		expect(result).toContain("<svg");
	});

	it("output contains <svg element", () => {
		const result = texToSvg("a + b = c");
		expect(result).toMatch(/<svg[^>]*>/);
	});

	it("default block parameter is false", () => {
		const inlineResult = texToSvg("x");
		const blockResult = texToSvg("x", false);
		expect(inlineResult).toBe(blockResult);
	});

	it("handles complex mathematical formula", () => {
		const result = texToSvg("\\frac{x}{y}");
		expect(result).toContain("<svg");
		expect(result).toMatch(/<svg[^>]*>/);
	});

	it("handles Greek letters", () => {
		const result = texToSvg("\\alpha + \\beta");
		expect(result).toContain("<svg");
	});
});
