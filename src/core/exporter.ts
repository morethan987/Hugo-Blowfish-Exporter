import { App, Editor, MarkdownView, Notice, TFile } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import HugoBlowfishExporter from './plugin';
import { ConfirmationModal } from 'src/utils/confirmationModal';
import { BatchExportModal } from 'src/utils/batchExportModal';
import { ExportNameModal } from 'src/utils/exportNameModal';
import { ASTProcessor, NodeType } from 'src/components/ast/main';
import { calloutRule } from 'src/components/exporters/calloutExporter';
import { mathRule } from 'src/components/exporters/mathExporter';
import { mermaidRule } from 'src/components/exporters/mermaidExporter';
import { imageRule } from 'src/components/exporters/imageExporter';
import { wikiLinkRule } from 'src/components/exporters/wikiLinkExporter';

export class Exporter {
    constructor(
        private app: App,
        private plugin: HugoBlowfishExporter
    ) {}

    async exportToHugo() {
        new ConfirmationModal(this.app, async () => {
            try {
                const batchExporter = new BatchExportModal(
                    this.app, 
                    this.plugin.settings, 
                    this.modifyContent.bind(this)
                );
                await batchExporter.export();
            } catch (error) {
                new Notice(`导出失败: ${error.message}`);
                console.error('Export error:', error);
            }
        }).open();
    }

    async exportCurrentNote(editor: Editor, view: MarkdownView) {
        try {
            const currentFile = view.file;
            if (!currentFile) {
                new Notice('没有打开的文件');
                return;
            }

            // 获取文件的元数据
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
            const modifiedContent = await this.modifyContent(content, 'single');

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

    async exportCurrentNote_AST(editor: Editor, view: MarkdownView) {
        try {
            const currentFile = view.file;
            if (!currentFile) {
                new Notice('没有打开的文件');
                return;
            }

            // 获取文件的元数据
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
            const modifiedContent = await this.modifyContent_AST(content, 'single');

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

    async modifyContent(content: string, mode: 'batch' | 'single' = 'single'): Promise<string> {
        try {
            let modifiedContent = content;

            const activeFile = this.app.workspace.getActiveFile();
            const metadata = activeFile ? this.app.metadataCache.getFileCache(activeFile) : null;
            const slug = metadata?.frontmatter?.slug;

            // 转换数学公式
            modifiedContent = this.plugin.mathExporter.transformMath(modifiedContent);

            // 转换 Callouts
            modifiedContent = this.plugin.calloutExporter.transformCallouts(modifiedContent);

            // 转换所有 wiki 链接
            modifiedContent = await this.plugin.wikiLinkExporter.transformWikiLinks(
                modifiedContent, 
                mode, 
                this.plugin.settings
            );

            // 转换图片链接
            if (slug) {
                modifiedContent = await this.plugin.imageExporter.transformImages(
                    modifiedContent,
                    mode,
                    this.plugin.settings,
                    slug
                );
            }

            // 转换 Mermaid 图表
            modifiedContent = this.plugin.mermaidExporter.transformMermaid(modifiedContent);

            return modifiedContent;
        } catch (error) {
            console.error('Error modifying content:', error);
            return content;
        }
    }

    async modifyContent_AST(content: string, mode: 'batch' | 'single' = 'single'): Promise<string> {
        try {
            // 构造 context
            const activeFile = this.app.workspace.getActiveFile();
            const metadata = activeFile ? this.app.metadataCache.getFileCache(activeFile) : null;
            const slug = metadata?.frontmatter?.slug;
            const lang = metadata?.frontmatter?.language;
            const fileName = activeFile ? activeFile.basename : '未知文件';
            if (!slug) {
                if (mode === 'single') {
                    new Notice(`⚠️ 警告: ${fileName} 缺少 slug 属性\n请在文件 frontmatter 中添加 slug 字段`, 20000);
                } else {
                    console.warn(`文件 ${fileName} 缺少 slug 属性`);
                }
                return content;
            }
            if (!lang) {
                if (mode === 'single') {
                    new Notice(`⚠️ 警告: ${fileName} 缺少 language 属性\n请在文件 frontmatter 中添加 language 字段`, 20000);
                } else {
                    console.warn(`文件 ${fileName} 缺少 language 属性`);
                }
                return content;
            }
            // 1. 先创建 context（不带 processor）
            const context: any = {
                data: { app: this.app, settings: this.plugin.settings, slug, lang, imageFiles: [] }
            };
            // 2. 创建 processor 实例
            const processor = new ASTProcessor(context);
            // 3. 将 processor 挂载到 context.processor
            context.processor = processor;
            processor.addRules([
                calloutRule,
                ...mathRule,
                imageRule,
                ...wikiLinkRule,
                mermaidRule,
            ]);
            // 4. 处理 AST，传递 context
            const ast = processor.process(content, context);
            const result = processor.astToString(ast);
            // AST处理后统一复制图片
            const { copyImagesAfterAst } = await import('src/components/exporters/imageExporter');
            await copyImagesAfterAst(this.app, context.data.imageFiles, this.plugin.settings, slug);
            return result;
        } catch (error) {
            console.error('Error modifying content:', error);
            return content;
        }
    }
}