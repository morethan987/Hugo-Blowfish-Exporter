import { describe, it, expect, vi, beforeEach } from "vitest";
import { mimeFromExt, escapeHTML, texToSvg, copyImageFile } from "./utils";
import type { App } from "obsidian";
import type { HugoBlowfishExporterSettings } from "types/settings";
import * as fs from "fs";

vi.mock("fs", () => ({
	existsSync: vi.fn(),
	mkdirSync: vi.fn(),
	writeFileSync: vi.fn(),
}));

vi.mock("obsidian", () => ({
	Notice: vi.fn(),
}));

interface MockTFile {
	name: string;
	path: string;
	basename: string;
	extension: string;
}

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
		expect(escapeHTML("5 < 10 & 3 > 2")).toBe("5 &lt; 10 &amp; 3 &gt; 2");
	});

	it("handles consecutive special chars", () => {
		expect(escapeHTML("<<&&>>")).toBe("&lt;&lt;&amp;&amp;&gt;&gt;");
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

describe("copyImageFile", () => {
	const mockSettings: HugoBlowfishExporterSettings = {
		exportPath: "/home/user/hugo-site/content",
		exportPathWindows: "C:\\hugo-site\\content",
		exportPathLinux: "/home/user/hugo-site/content",
		imageExportPath: "img",
		translatedExportPath: "",
		translatedExportPathWindows: "",
		translatedExportPathLinux: "",
		secretId: "api-key",
		BaseURL: "",
		ModelName: "",
		directExportAfterTranslation: false,
		targetLanguage: "",
		translatedFilePrefix: "",
		blogPath: "posts",
		coverPath: ".featured",
		useDefaultExportName: false,
		defaultExportName_zh_cn: "",
		defaultExportName_en: "",
		useDefaultDispName: false,
		defaultDispName_zh_cn: "",
		defaultDispName_en: "",
	};

	const createMockApp = (
		attachmentFile: MockTFile | null,
		imageData: ArrayBuffer = new ArrayBuffer(8),
	): App => {
		return {
			metadataCache: {
				getFirstLinkpathDest: vi.fn().mockReturnValue(attachmentFile),
			},
			vault: {
				readBinary: vi.fn().mockResolvedValue(imageData),
			},
		} as unknown as App;
	};

	const createMockTFile = (name: string): MockTFile => {
		return {
			name,
			path: `attachments/${name}`,
			basename: name.replace(/\.[^.]+$/, ""),
			extension: name.split(".").pop() || "",
		};
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns false when image file is not found in vault", async () => {
		const mockApp = createMockApp(null);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		const getFirstLinkpathDestMock =
			mockApp.metadataCache.getFirstLinkpathDest;

		const result = await copyImageFile(
			mockApp,
			"nonexistent.png",
			mockSettings,
			"test-slug",
		);

		expect(result).toBe(false);
		expect(getFirstLinkpathDestMock).toHaveBeenCalledWith(
			"nonexistent.png",
			"",
		);
	});

	it("creates image directory if it does not exist", async () => {
		const mockTFile = createMockTFile("test-image.png");
		const mockApp = createMockApp(mockTFile);
		vi.mocked(fs.existsSync).mockReturnValue(false);

		await copyImageFile(mockApp, "test-image.png", mockSettings, "my-post");

		expect(fs.mkdirSync).toHaveBeenCalledWith(
			expect.stringContaining("my-post"),
			{ recursive: true },
		);
	});

	it("does not create directory if it already exists", async () => {
		const mockTFile = createMockTFile("test-image.png");
		const mockApp = createMockApp(mockTFile);
		vi.mocked(fs.existsSync).mockReturnValue(true);

		await copyImageFile(mockApp, "test-image.png", mockSettings, "my-post");

		expect(fs.mkdirSync).not.toHaveBeenCalled();
	});

	it("writes image file to correct target path", async () => {
		const mockTFile = createMockTFile("GRU.png");
		const mockImageData = new Uint8Array([1, 2, 3, 4]).buffer;
		const mockApp = createMockApp(mockTFile, mockImageData);
		vi.mocked(fs.existsSync).mockReturnValue(true);

		await copyImageFile(mockApp, "GRU.png", mockSettings, "deep-learning");

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			expect.stringMatching(/deep-learning.*img.*GRU\.png$/),
			expect.any(Buffer),
		);
	});

	it("returns true on successful copy", async () => {
		const mockTFile = createMockTFile("success.jpg");
		const mockApp = createMockApp(mockTFile);
		vi.mocked(fs.existsSync).mockReturnValue(true);

		const result = await copyImageFile(
			mockApp,
			"success.jpg",
			mockSettings,
			"test-post",
		);

		expect(result).toBe(true);
	});

	it("returns false when vault.readBinary throws error", async () => {
		const mockTFile = createMockTFile("error.png");
		const mockApp = {
			metadataCache: {
				getFirstLinkpathDest: vi.fn().mockReturnValue(mockTFile),
			},
			vault: {
				readBinary: vi.fn().mockRejectedValue(new Error("Read failed")),
			},
		} as unknown as App;

		const result = await copyImageFile(
			mockApp,
			"error.png",
			mockSettings,
			"test-slug",
		);

		expect(result).toBe(false);
	});

	it("returns false when fs.writeFileSync throws error", async () => {
		const mockTFile = createMockTFile("write-error.png");
		const mockApp = createMockApp(mockTFile);
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.writeFileSync).mockImplementation(() => {
			throw new Error("Write failed");
		});

		const result = await copyImageFile(
			mockApp,
			"write-error.png",
			mockSettings,
			"test-slug",
		);

		expect(result).toBe(false);
	});

	it("constructs correct path with blogPath and imageExportPath", async () => {
		const mockTFile = createMockTFile("diagram.svg");
		const mockApp = createMockApp(mockTFile);
		vi.mocked(fs.existsSync).mockReturnValue(false);

		const customSettings: HugoBlowfishExporterSettings = {
			...mockSettings,
			exportPath: "/content",
			blogPath: "blog/articles",
			imageExportPath: "images",
		};

		await copyImageFile(
			mockApp,
			"diagram.svg",
			customSettings,
			"my-article",
		);

		expect(fs.mkdirSync).toHaveBeenCalledWith(
			expect.stringContaining("blog/articles"),
			expect.any(Object),
		);
		expect(fs.mkdirSync).toHaveBeenCalledWith(
			expect.stringContaining("my-article"),
			expect.any(Object),
		);
		expect(fs.mkdirSync).toHaveBeenCalledWith(
			expect.stringContaining("images"),
			expect.any(Object),
		);
	});

	it("uses attachmentFile.name for target filename, not input imageFile", async () => {
		const mockTFile = createMockTFile("actual-file-name.png");
		const mockApp = createMockApp(mockTFile);
		vi.mocked(fs.existsSync).mockReturnValue(true);

		await copyImageFile(
			mockApp,
			"some/path/to/image.png",
			mockSettings,
			"test-slug",
		);

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			expect.stringContaining("actual-file-name.png"),
			expect.any(Buffer),
		);
	});
});
