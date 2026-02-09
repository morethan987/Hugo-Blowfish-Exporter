import { App, Notice, Component, MarkdownRenderer } from "obsidian";
import * as path from "path";
import * as fs from "fs";
import { HugoBlowfishExporterSettings } from "types/settings";
import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { Buffer } from "buffer";

export function getSlugByName(app: App, file_name: string): string {
	const file = app.metadataCache.getFirstLinkpathDest(file_name, "");
	if (!file) {
		new Notice(`❌ 未找到文件: ${file_name}`);
		return "";
	}

	const metadata = app.metadataCache.getFileCache(file);
	if (!metadata?.frontmatter?.slug) {
		new Notice(
			`⚠️ 警告: ${file.basename} 缺少slug属性\n请在文件frontmatter中添加slug字段`,
			20000,
		);
		return "";
	}

	return metadata.frontmatter.slug as string;
}

export function getLangByName(app: App, file_name: string): string {
	const file = app.metadataCache.getFirstLinkpathDest(file_name, "");
	if (!file) {
		new Notice(`❌ 未找到文件: ${file_name}`);
		return "";
	}

	const metadata = app.metadataCache.getFileCache(file);
	if (!metadata?.frontmatter?.language) {
		new Notice(
			`⚠️ 警告: ${file.basename} 缺少language属性\n请在文件frontmatter中添加language字段`,
			20000,
		);
		return "";
	}

	return metadata.frontmatter.language as string;
}

export function getFrontmatterByName(
	app: App,
	file_name: string,
): Record<string, unknown> | null {
	const file = app.metadataCache.getFirstLinkpathDest(file_name, "");
	if (!file) {
		new Notice(`❌ 未找到文件: ${file_name}`);
		return null;
	}

	const metadata = app.metadataCache.getFileCache(file);
	if (!metadata?.frontmatter) {
		new Notice(`⚠️ 警告: ${file.basename} 缺少frontmatter属性`, 20000);
		return null;
	}

	return metadata.frontmatter;
}

// 复制图片辅助函数
export async function copyImageFile(
	app: App,
	imageFile: string,
	settings: HugoBlowfishExporterSettings,
	slug: string,
): Promise<boolean> {
	try {
		const attachmentFile = app.metadataCache.getFirstLinkpathDest(
			imageFile,
			"",
		);
		if (!attachmentFile) {
			new Notice(`❌ 未找到文件: ${imageFile}`);
			return false;
		}

		// 构建目标路径
		const exportDir = path.resolve(settings.exportPath);
		const imagesDir = path.join(
			exportDir,
			settings.blogPath,
			slug,
			settings.imageExportPath,
		);

		// 确保图片导出目录存在
		if (!fs.existsSync(imagesDir)) {
			fs.mkdirSync(imagesDir, { recursive: true });
		}

		// 获取文件内容并复制
		const imageData = await app.vault.readBinary(attachmentFile);
		const targetPath = path.join(imagesDir, attachmentFile.name);
		fs.writeFileSync(targetPath, Buffer.from(imageData));

		return true;
	} catch (error) {
		console.error(`Failed to copy image file ${imageFile}:`, error);
		return false;
	}
}

// 图片转base64
export async function imageToBase64(app: App, imageFile: string) {
	// 用 app.metadataCache.getFirstLinkpathDest 定位 TFile
	const tfile = app.metadataCache.getFirstLinkpathDest(imageFile, "");
	if (!tfile) {
		new Notice(`❌ 未找到文件: ${imageFile}`);
		return "";
	}

	const imageData = await app.vault.readBinary(tfile);
	const base64 = Buffer.from(imageData).toString("base64");
	return `data:${mimeFromExt(tfile.extension)};base64,${base64}`;
}

/** 常见扩展名到 MIME 的简单映射 */
function mimeFromExt(ext: string): string {
	const e = ext.toLowerCase();
	if (e === "png") return "image/png";
	if (e === "jpg" || e === "jpeg") return "image/jpeg";
	if (e === "gif") return "image/gif";
	if (e === "webp") return "image/webp";
	if (e === "svg") return "image/svg+xml";
	if (e === "bmp") return "image/bmp";
	return "application/octet-stream";
}

// 数学公式转svg
export function texToSvg(texSrc: string, block = false): string {
	const adaptor = liteAdaptor();
	RegisterHTMLHandler(adaptor);
	const tex = new TeX();
	const svg = new SVG({ fontCache: "none" });
	const html = mathjax.document("", { InputJax: tex, OutputJax: svg });
	const node = html.convert(texSrc, { block }) as unknown;
	return adaptor.outerHTML(node as Parameters<typeof adaptor.outerHTML>[0]);
}

/**
 * 返回只有代码块标签的 HTML 字符串(不含任何 CSS)
 * 使用 Obsidian 内置 MarkdownRenderer 来渲染代码高亮，确保 Prism 被加载
 */
export async function getCodeBlock(
	app: App,
	code: string,
	lang: string,
): Promise<string> {
	// 创建临时元素用于渲染
	const tempEl = document.createElement("div");

	// 构建 Markdown 代码块字符串
	const mdCodeBlock = `\`\`\`${lang}\n${code}\n\`\`\``;

	// 使用 MarkdownRenderer 渲染代码块（这会触发 Prism 加载如果需要）
	const tempComponent = new Component();
	await MarkdownRenderer.render(app, mdCodeBlock, tempEl, "", tempComponent);

	// 提取高亮的 code 元素 innerHTML
	const codeEl = tempEl.querySelector("pre > code");
	let highlighted = "";
	if (codeEl) {
		highlighted = codeEl.innerHTML;
	} else {
		// Fallback: 如果渲染失败，使用简单转义
		highlighted = escapeHTML(code);
	}

	return `
<pre class="codebox">
  <span class="mac">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 130">
      <ellipse cx="50" cy="65" rx="50" ry="52" stroke="#dc3c36" stroke-width="2" fill="#ed6c60"/>
      <ellipse cx="225" cy="65" rx="50" ry="52" stroke="#da9721" stroke-width="2" fill="#f7c151"/>
      <ellipse cx="400" cy="65" rx="50" ry="52" stroke="#1ba125" stroke-width="2" fill="#64c856"/>
    </svg>
  </span>
  <code class="language-${lang}">${highlighted}</code>
</pre>
`;
}

// 简单 HTML 转义
function escapeHTML(s: string) {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
