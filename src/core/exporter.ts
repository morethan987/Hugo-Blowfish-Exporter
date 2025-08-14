import { App, Editor, MarkdownView, Notice } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import * as juice from 'juice';
import HugoBlowfishExporter from './plugin';
import { ConfirmationModal, BatchExportModal, ExportNameModal, WechatStyleModal } from 'src/modals';
import { ASTProcessor } from 'src/components/ast/main';
import { calloutRuleHugo, imageRuleHugo, mathRuleHugo, wikiLinkRuleHugo, mermaidRuleHugo } from 'src/components/rules/hugo_blowfish';
import { calloutRuleWechat, imageRuleWechat, mathRuleWechat, wikiLinkRuleWechat, mermaidRuleWechat } from 'src/components/rules/wechat_post';
import { texToSvg, imageToBase64, getCodeBlock } from 'src/components/rules/utils';


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

            const inlineSvg = texToSvg('a+b=c', false);   // 行内
            const blockSvg  = texToSvg('E=mc^2', true); // 块级

            const base64Tag = await imageToBase64(this.app, "GRU.png");
            const codeBlock = getCodeBlock("print('Hello, World!')\nprint('Hello, World!')\n", "python");

            const htmlContent = `
<article class="md-doc">

  <blockquote class="callout is-note">
    <p class="callout-title">
      <span class="callout-icon" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-line-icon lucide-pencil-line"><path d="M13 21h8"/><path d="m15 5 4 4"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
      </span>Note
    </p>
    <p class="callout-body">这是一个信息提示 Callout，支持多段落与列表。</p>
    <ul>
      <li>要点 A</li>
      <li>要点 B</li>
    </ul>
  </blockquote>

  <blockquote class="callout is-info">
    <p class="callout-title">
      <span class="callout-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info-icon lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
      </span>信息
    </p>
    <p class="callout-body">这是一个信息提示 Callout，支持多段落与列表。</p>
    <ul>
      <li>要点 A</li>
      <li>要点 B</li>
    </ul>
  </blockquote>

  <blockquote class="callout is-success">
    <p class="callout-title">
      <span class="callout-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-line-icon lucide-check-line"><path d="M20 4L9 15"/><path d="M21 19L3 19"/><path d="M9 15L4 10"/></svg>
      </span>成功
    </p>
    <p class="callout-body">操作已成功完成。</p>
  </blockquote>

  <blockquote class="callout is-warning">
    <p class="callout-title">
      <span class="callout-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
      </span>警告
    </p>
    <p class="callout-body">请注意配置文件中的敏感字段。</p>
  </blockquote>

  <blockquote class="callout is-danger">
    <p class="callout-title">
      <span class="callout-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-x-icon lucide-circle-x"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
      </span>错误
    </p>
    <p class="callout-body">系统发生严重错误。</p>
  </blockquote>

  <blockquote class="callout is-example">
    <p class="callout-title">
      <span class="callout-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-x-icon lucide-circle-x"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
      </span>example
    </p>
    <p class="callout-body">This is an example.</p>
  </blockquote>

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