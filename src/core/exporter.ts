import { App, Editor, MarkdownView, Notice } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import * as juice from 'juice';
import HugoBlowfishExporter from './plugin';
import { ConfirmationModal, BatchExportModal, ExportNameModal, WechatStyleModal } from 'src/modals';
import { ASTProcessor } from 'src/components/ast/main';
import { calloutRuleHugo, imageRuleHugo, mathRuleHugo, wikiLinkRuleHugo, mermaidRuleHugo } from 'src/components/rules/hugo_blowfish';
import { calloutRuleWechat, imageRuleWechat, mathRuleWechat, wikiLinkRuleWechat, mermaidRuleWechat } from 'src/components/rules/wechat_post';


export class Exporter {
    constructor(
        private app: App,
        private plugin: HugoBlowfishExporter
    ) {}

    /////////////////// Hugo Start ///////////////////
    async exportCurrentNote2Hugo(editor: Editor, view: MarkdownView) {
        try {
            const currentFile = view.file;
            if (!currentFile) {
                new Notice('没有打开的文件');
                return;
            }

            // 获取文件的元数据并检测必要字段
            const metadata = this.app.metadataCache.getFileCache(currentFile);
            if (!metadata?.frontmatter?.slug) {
                new Notice('⚠️ 当前文件缺少 slug 属性，请在 frontmatter 中添加 slug 字段');
                return;
            }
            if (!metadata?.frontmatter?.language) {
                new Notice('⚠️ 当前文件缺少 language 属性，请在 frontmatter 中添加 language 字段');
                return;
            }

            // 读取文件内容并修改
            const content = await this.app.vault.read(currentFile);
            const modifiedContent = await this.convertToHugoMd(content, metadata.frontmatter);

            // 根据slug创建目标目录
            let exportDir = path.resolve(this.plugin.settings.exportPath);
            exportDir = path.join(exportDir, this.plugin.settings.blogPath);
            const slugDir = path.join(exportDir, metadata.frontmatter.slug);
            if (!fs.existsSync(slugDir)) {
                fs.mkdirSync(slugDir, { recursive: true });
            }

            let fileName: string;
            if (this.plugin.settings.useDefaultExportName) {
                // 替换文件名中的占位符
                fileName = this.plugin.settings.defaultExportName_zh_cn; // 默认中文名
                if (metadata.frontmatter.language === 'en') {
                    fileName = this.plugin.settings.defaultExportName_en;
                }
                fileName = fileName.replace('{{title}}', currentFile.basename);
            } else {
                // 使用对话框获取文件名
                fileName = await new Promise((resolve) => {
                    new ExportNameModal(this.app, currentFile.basename, (name) => {
                        resolve(name);
                    }).open();
                });
            }

            // 构建完整的输出路径
            const outputPath = path.join(slugDir, `${fileName}.md`);

            // 写入文件
            fs.writeFileSync(outputPath, modifiedContent, 'utf8');

            // 自动选择博客封面
            await this.plugin.coverChooser.chooseCover(this.plugin.settings, slugDir);

            // 显示成功提示
            new Notice(`✅ 导出成功!\n文件已保存至:\n${outputPath}`, 5000);

        } catch (error) {
            new Notice(`❌ 导出失败: ${error.message}`, 5000);
            console.error('Export error:', error);
        }
    }

    async exportAllNotesToHugo() {
        new ConfirmationModal(this.app, async () => {
            try {
                const batchExporter = new BatchExportModal(
                    this.app, 
                    this.plugin.settings, 
                    this.convertToHugoMd.bind(this)
                );
                await batchExporter.export();
            } catch (error) {
                new Notice(`导出失败: ${error.message}`);
                console.error('Export error:', error);
            }
        }).open();
    }

    async convertToHugoMd(content: string, frontmatter: Record<string, any>): Promise<string> {
        try {
            // 构造 context
            const slug = frontmatter.slug as string;
            const lang = frontmatter.language as string;
            // 1. 先创建 context（不带 processor）
            const context: any = {
                data: { app: this.app, settings: this.plugin.settings, slug, lang, imageFiles: [] }
            };
            // 2. 创建 processor 实例
            const processor = new ASTProcessor(context);
            // 3. 将 processor 挂载到 context.processor
            context.processor = processor;
            processor.addRules([
                calloutRuleHugo,
                ...mathRuleHugo,
                imageRuleHugo,
                ...wikiLinkRuleHugo,
                mermaidRuleHugo,
            ]);
            // 4. 处理 AST，传递 context
            const ast = processor.process(content, context);
            // AST处理后统一复制图片
            const { copyImagesAfterAst } = await import('src/components/rules/utils');
            await copyImagesAfterAst(this.app, context.data.imageFiles, this.plugin.settings, slug);
            return processor.astToString(ast);
        } catch (error) {
            console.error('Error modifying content:', error);
            return content;
        }
    }
    /////////////////// Hugo End ///////////////////

    /////////////////// Wechat Start ///////////////////
    async exportCurrentNote2Wechat(editor: Editor, view: MarkdownView) {
        try {
            const currentFile = view.file;
            if (!currentFile) {
                new Notice('没有打开的文件');
                return;
            }

            // 获取文件的元数据并检测必要字段
            const metadata = this.app.metadataCache.getFileCache(currentFile);
            if (!metadata?.frontmatter?.slug) {
                new Notice('⚠️ 当前文件缺少 slug 属性，请在 frontmatter 中添加 slug 字段');
                return;
            }
            if (!metadata?.frontmatter?.language) {
                new Notice('⚠️ 当前文件缺少 language 属性，请在 frontmatter 中添加 language 字段');
                return;
            }

            // 读取文件内容并转换为HTML
            // const content = await this.app.vault.read(currentFile);
            // const htmlContent = await this.convertToWechatHtml(content, metadata.frontmatter);

            const htmlContent = `
<article class="md-doc">
  <!-- Front-matter：可选渲染成信息卡，或直接隐藏 -->
  <section class="frontmatter">
title: 我的笔记标题
date: 2025-08-10
tags: [obsidian, 导出, demo]
  </section>

  <!-- Heading（建议保留 id 以支持锚点） -->
  <h1 id="intro">Obsidian → HTML 导出演示</h1>

  <!-- 段落 / 内联元素 -->
  <p>
    这是一段普通文本，包含 <em>强调</em>、<strong>加粗</strong>、
    <code>inline code</code>、<mark>高亮</mark>、
    <a href="https://example.com">外链</a> 与
    <a class="wikilink" data-target="本地词条">WikiLink</a>。
    内联公式 <span class="math-inline">\\( E=mc^2 \\)</span>。
    脚注引用<sup class="footnote-ref" id="fnref-1"><a href="#fn-1">[1]</a></sup>。
  </p>

  <!-- Callout（data-callout: info | tip | warning | danger | note） -->
  <div class="callout info">
    <p class="callout-title">💡 信息</p>
    <p>这是一个信息提示 Callout，支持多段落与列表。</p>
    <ul>
      <li>要点 A</li>
      <li>要点 B</li>
    </ul>
  </div>

  <!-- Blockquote -->
  <blockquote>
    <p>这是一段引用文本。可以包含多段落与内联元素。</p>
  </blockquote>

  <!-- 列表（普通） -->
  <h2 id="lists">列表</h2>
  <ul>
    <li>无序 1</li>
    <li>无序 2</li>
  </ul>
  <ol>
    <li>有序 1</li>
    <li>有序 2</li>
  </ol>

  <!-- 任务清单（checkbox 在部分平台可能被过滤，见“公众号安全版”的替代） -->
  <ul>
    <li class="task"><input type="checkbox" checked> 已完成项</li>
    <li class="task"><input type="checkbox"> 待办项</li>
  </ul>

  <hr>

  <!-- 代码块（可选 language-xxx；若要 CSS 行号，请将每一行包 <span>） -->
  <pre class="code-block"><code class="language-ts">
<span>interface User {</span>
<span>  id: string;</span>
<span>  name: string;</span>
<span>}</span>
  </code></pre>

  <!-- 数学块（交给 KaTeX/MathJax 渲染） -->
  <div class="math-block">$$
\int_{-\infty}^{+\infty} e^{-x^2} dx = \sqrt{\pi}
$$</div>

  <!-- 图片 + 标题 -->
  <figure>
    <img src="https://picsum.photos/1200/600" alt="示例图片">
    <figcaption>图 1：示例图片标题</figcaption>
  </figure>

  <!-- 表格（外层包 .table-wrap 以启用横向滚动与圆角） -->
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th align="left">列 A</th>
          <th align="center">列 B</th>
          <th align="right">列 C</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>左对齐</td>
          <td style="text-align:center">中</td>
          <td style="text-align:right">123</td>
        </tr>
        <tr>
          <td>foo</td>
          <td style="text-align:center">bar</td>
          <td style="text-align:right">456</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- 内嵌（Embed） -->
  <figure class="embed" data-src="assets/video.mp4">
    <figcaption>内嵌资源占位（实际渲染由导出器决定）</figcaption>
  </figure>

  <!-- 脚注区（与正文中的 footnote-ref 对应） -->
  <section class="footnotes">
    <ol>
      <li id="fn-1">
        这是脚注内容。<a href="#fnref-1">↩︎</a>
      </li>
    </ol>
  </section>
</article>
`;

            // 打开样式选择模态框
            const styleModal = new WechatStyleModal(
                this.app,
                this.plugin.plugin, // 传递插件实例
                htmlContent,
                async (selectedCss: string) => {
                    try {
                        // 使用juice处理HTML和CSS
                        const result = juice.inlineContent(htmlContent, selectedCss);

                        // 复制到剪贴板
                        const clipData = new ClipboardItem({
                            'text/html': new Blob([result], { type: 'text/html' })
                        });

                        await navigator.clipboard.write([clipData]);
                        new Notice(`✅ 导出成功！已复制到剪贴板`, 5000);

                    } catch (clipboardError) {
                        console.error('Clipboard error:', clipboardError);
                        new Notice(`❌ 复制到剪贴板失败: ${clipboardError.message}`, 5000);
                    }
                }
            );
            
            styleModal.open();

        } catch (error) {
            new Notice(`❌ 导出失败: ${error.message}`, 5000);
            console.error('Export error:', error);
        }
    }

    async convertToWechatHtml(content: string, frontmatter: Record<string, any>): Promise<string> {
        try {
            // 构造 context
            const slug = frontmatter.slug as string;
            const lang = frontmatter.language as string;
            // 1. 先创建 context（不带 processor）
            const context: any = {
                data: { app: this.app, settings: this.plugin.settings, slug, lang, imageFiles: [] }
            };
            // 2. 创建 processor 实例
            const processor = new ASTProcessor(context);
            // 3. 将 processor 挂载到 context.processor
            context.processor = processor;
            processor.addRules([
                calloutRuleHugo,
                ...mathRuleHugo,
                imageRuleHugo,
                ...wikiLinkRuleHugo,
                mermaidRuleHugo,
            ]);
            // 4. 处理 AST，传递 context
            const ast = processor.process(content, context);
            // AST处理后统一复制图片
            const { copyImagesAfterAst } = await import('src/components/rules/utils');
            await copyImagesAfterAst(this.app, context.data.imageFiles, this.plugin.settings, slug);
            return processor.astToString(ast);
        } catch (error) {
            console.error('Error modifying content:', error);
            return content;
        }
    }
    /////////////////// Wechat End ///////////////////
}