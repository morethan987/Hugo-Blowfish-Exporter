import { App, MarkdownView, Notice } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import HugoBlowfishExporter from './plugin';

export class Translator {
    constructor(
        private app: App,
        private plugin: HugoBlowfishExporter
    ) {}

    async translateCurrentNote() {
        // 创建一个持续显示的通知
        let notice: Notice | null = null;
        
        try {
            // 检查API密钥是否配置
            if (!process.env.API_KEY) {
                new Notice('请先配置OpenAI API密钥');
                return;
            }

            // 检查API密钥是否配置
            if (!this.plugin.settings.BaseURL) {
                new Notice('请先在设置中配置BaseURL');
                return;
            }

            // 检查API密钥是否配置
            if (!this.plugin.settings.ModelName) {
                new Notice('请先在设置中配置模型名称');
                return;
            }

            // 检查翻译文件导出路径是否配置
            if (!this.plugin.settings.translatedExportPath) {
                new Notice('请先在设置中配置翻译文件导出路径');
                return;
            }

            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!activeView) {
                new Notice('没有打开的文件');
                return;
            }

            const currentFile = activeView.file;
            if (!currentFile) {
                new Notice('无法获取当前文件');
                return;
            }

            // 获取文件的元数据和内容
            const metadata = this.app.metadataCache.getFileCache(currentFile);
            const content = await this.app.vault.read(currentFile);

            notice = new Notice('开始翻译...', 0);

            // 更新通知显示，开始翻译标题
            notice.setMessage('正在翻译标题...');
            const titleCompletion = await this.plugin.client.chat.completions.create({
                model: this.plugin.settings.ModelName,
                messages: [
                    {
                        role: "system",
                        content: `你是一个精准的标题翻译专家。请将以下标题翻译成简洁凝练的${this.plugin.settings.targetLanguage}。`
                    },
                    {
                        role: "user",
                        content: currentFile.basename
                    }
                ],
                temperature: 0.3
            });
            const translatedTitle = titleCompletion.choices[0].message.content || 'Default Title';

            // 更新通知显示，开始翻译内容
            notice.setMessage('正在翻译内容...');
            const contentCompletion = await this.plugin.client.chat.completions.create({
                model: this.plugin.settings.ModelName,
                messages: [
                    {
                        role: "system",
                        content: `你是一个专业的文档翻译助手。请将以下Markdown内容翻译成表达地道、语义流畅流畅的${this.plugin.settings.targetLanguage}，同时严格遵循以下要求：\n1. 保持所有的Markdown格式、链接和图片引用不变；frontmatter部分需要保持格式不变。\n2. 不要翻译文件名和链接。\n3. 代码块中的注释需要翻译。\n4. 只翻译内容，不要添加任何额外的解释或注释。`
                    },
                    {
                        role: "user",
                        content: content
                    }
                ],
                temperature: 0.3
            });
            const translatedContent = contentCompletion.choices[0].message.content || '';

            // 构建翻译文件的保存路径，保持原有目录结构
            const fileName = `${this.plugin.settings.translatedFilePrefix}${translatedTitle}.md`;
            
            const translatedFilePath = path.join(this.plugin.settings.translatedExportPath, fileName);

            // 先导出到目标文件夹中，确保目录存在
            fs.mkdirSync(path.dirname(translatedFilePath), { recursive: true });
            notice.setMessage('正在保存翻译结果...');
            fs.writeFileSync(translatedFilePath, translatedContent, 'utf8');
            
            // 关闭进度通知
            notice.hide();
            new Notice(`✅ 翻译完成！\n文件已保存至:\n${translatedFilePath}`, 4000);

            // 检查是否需要直接导出
            if (this.plugin.settings.directExportAfterTranslation) {
                await this.directExport(translatedContent, metadata, translatedTitle);
            }
        } catch (error) {
            // 确保在出错时关闭进度通知
            if (notice) {
                notice.hide();
            }
            new Notice(`❌ 翻译失败: ${error.message}`, 4000);
            console.error('Translation error:', error);
        }
    }

    private async directExport(translatedContent: string, metadata: any, translatedTitle: string) {
        const notice = new Notice('正在执行直接导出...', 0);

        try {
            // 检测是否有slug属性
            if (!metadata?.frontmatter?.slug) {
                notice.hide();
                new Notice('⚠️ 当前文件缺少 slug 属性，请在 frontmatter 中添加 slug 字段', 4000);
                return;
            }

        // 根据slug创建目标目录
        let exportDir = path.resolve(this.plugin.settings.exportPath);
        exportDir = path.join(exportDir, this.plugin.settings.blogPath);
        const slugDir = path.join(exportDir, metadata.frontmatter.slug);
        if (!fs.existsSync(slugDir)) {
            fs.mkdirSync(slugDir, { recursive: true });
        }

            notice.setMessage('正在处理内容...');
            const modifiedContent = await this.plugin.exporter.modifyContent(translatedContent, 'single');

        let directExportFileName: string;
        if (this.plugin.settings.targetLanguage === '中文') {
            directExportFileName = 'index.zh-cn';
        } else {
            directExportFileName = 'index.en';
        }

        // 构建完整的输出路径
        const outputPath = path.join(slugDir, `${directExportFileName}.md`);

            // 写入文件
            notice.setMessage('正在保存文件...');
            fs.writeFileSync(outputPath, modifiedContent, 'utf8');

            // 自动选择博客封面
            notice.setMessage('正在选择博客封面...');
            await this.plugin.coverChooser.chooseCover(this.plugin.settings, slugDir);

            notice.hide();
            new Notice(`✅ 直接导出成功!\n文件已保存至:\n${outputPath}`, 5000);
        } catch (error) {
            notice.hide();
            new Notice(`❌ 直接导出失败: ${error.message}`, 4000);
            console.error('Direct export error:', error);
        }
    }
}