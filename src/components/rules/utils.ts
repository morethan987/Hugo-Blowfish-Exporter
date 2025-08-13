import { App, Notice, TFile } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';


export function getSlugByName(app: App, file_name: string): string {
    const file = this.app.metadataCache.getFirstLinkpathDest(file_name, '');
    if (!file) {
        new Notice(`❌ 未找到文件: ${file_name}`);
        return "";
    }

    const metadata = this.app.metadataCache.getFileCache(file);
    if (!metadata?.frontmatter?.slug) {
        new Notice(`⚠️ 警告: ${file.basename} 缺少slug属性\n请在文件frontmatter中添加slug字段`, 20000);
        return "";
    }

    return metadata.frontmatter.slug
}

export function getLangByName(app: App, file_name: string): string {
    const file = this.app.metadataCache.getFirstLinkpathDest(file_name, '');
    if (!file) {
        new Notice(`❌ 未找到文件: ${file_name}`);
        return "";
    }

    const metadata = this.app.metadataCache.getFileCache(file);
    if (!metadata?.frontmatter?.language) {
        new Notice(`⚠️ 警告: ${file.basename} 缺少language属性\n请在文件frontmatter中添加language字段`, 20000);
        return "";
    }

    return metadata.frontmatter.language
}

export function getFrontmatterByName(app: App, file_name: string): Record<string, any> | null {
    const file = this.app.metadataCache.getFirstLinkpathDest(file_name, '');
    if (!file) {
        new Notice(`❌ 未找到文件: ${file_name}`);
        return null;
    }

    const metadata = this.app.metadataCache.getFileCache(file);
    if (!metadata?.frontmatter) {
        new Notice(`⚠️ 警告: ${file.basename} 缺少frontmatter属性`, 20000);
        return null;
    }

    return metadata.frontmatter;
}

// 批量复制图片辅助函数
export async function copyImagesAfterAst(app: App, imageFiles: string[], settings: any, slug: string) {
    for (const fileName of imageFiles) {
        // 用 app.metadataCache.getFirstLinkpathDest 定位 TFile
        const tfile = app.metadataCache.getFirstLinkpathDest(fileName, '');
        if (tfile) {
            await copyImageFile(app, tfile, settings, slug);
        }
    }
}

export async function copyImageFile(app: App, attachmentFile: TFile, settings: any, slug: string): Promise<boolean> {
    try {
        // 获取相对于vault根目录的路径
        const relativePath = attachmentFile.path.replace(/\\/g, '/');
        
        // 构建目标路径
        const exportDir = path.resolve(settings.exportPath);
        const imagesDir = path.join(
            exportDir,
            settings.blogPath,
            slug,
            settings.imageExportPath
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
        console.error(`Failed to copy image file ${attachmentFile.name}:`, error);
        return false;
    }
}

// 图片转base64
export async function imageToBase64(app: App, imageFile: string) {
    // 用 app.metadataCache.getFirstLinkpathDest 定位 TFile
    const tfile = app.metadataCache.getFirstLinkpathDest(imageFile, '');
    if (!tfile) {
        new Notice(`❌ 未找到文件: ${imageFile}`);
        return "";
    }

    const imageData = await app.vault.readBinary(tfile);
    const base64 = Buffer.from(imageData).toString('base64');
    return `<img src="data:${mimeFromExt(tfile.extension)};base64,${base64}">`;
}

/** 常见扩展名到 MIME 的简单映射 */
function mimeFromExt(ext: string): string {
  const e = ext.toLowerCase();
  if (e === 'png') return 'image/png';
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
  if (e === 'gif') return 'image/gif';
  if (e === 'webp') return 'image/webp';
  if (e === 'svg') return 'image/svg+xml';
  if (e === 'bmp') return 'image/bmp';
  return 'application/octet-stream';
}

// 数学公式转svg
export function texToSvg(texSrc: string, block = false): string {
    const adaptor = liteAdaptor();
    RegisterHTMLHandler(adaptor);
    const tex = new TeX();
    const svg = new SVG({ fontCache: 'none' });
    const html = mathjax.document('', { InputJax: tex, OutputJax: svg });
    const node = html.convert(texSrc);
    return adaptor.outerHTML(node);
}

/**
 * 返回只有代码块标签的 HTML 字符串(不含任何 CSS)
 * 使用 Obsidian 内置 Prism
 */
export function getCodeBlock(code: string, lang: string): string {
  const w = globalThis as any;

  // 使用 Prism
  let highlighted = '';
  if (w?.Prism?.highlight) {
    const Prism = w.Prism;
    const grammar = Prism.languages[lang];
    highlighted = grammar
    ? Prism.highlight(code, grammar, lang)
    : escapeHTML(code); // 未知语言时不做语法染色
    // 只返回代码块相关标签
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
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}