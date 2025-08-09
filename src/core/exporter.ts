import { App, Editor, MarkdownView, Notice } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import * as juice from 'juice';
import HugoBlowfishExporter from './plugin';
import { ConfirmationModal, BatchExportModal, ExportNameModal, WechatStyleModal } from 'src/modals';
import { ASTProcessor } from 'src/components/ast/main';
import { calloutRuleHugo, imageRuleHugo, mathRuleHugo, wikiLinkRuleHugo, mermaidRuleHugo } from 'src/components/rules/hugo_blowfish';


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
            const htmlContent = `<section class="card">
  <h1 class="title">Hello, Obsidian</h1>
  <p class="desc">
    这是一个 <span class="highlight">带外部样式</span> 的 HTML 片段。666
  </p>
</section>
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