import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import OpenAI from 'openai';
import { MathExporter } from './exporters/mathExporter';
import { MermaidExporter } from './exporters/mermaidExporter';
import { CalloutExporter } from './exporters/calloutExporter';
import { ImageExporter } from './exporters/imageExporter';
import { HugoBlowfishExporterSettingTab } from './utils/settingsTab';
import { ExportNameModal } from './utils/exportNameModal';
import { ConfirmationModal } from './utils/confirmationModal';
import { WikiLinkExporter } from './exporters/wikiLinkExporter';
import { BatchExportModal } from './utils/batchExportModal';
import { CoverChooser } from 'exporters/coverChooser';

export interface HugoBlowfishExporterSettings {
	exportPath: string; // 导出路径配置
    imageExportPath: string; // 图片导出路径配置
    translatedExportPath: string; // 翻译文件导出路径配置
    BaseURL: string; // 大模型BaseURL
    ApiKey: string;  // API密钥
    ModelName: string; // 模型名称
    directExportAfterTranslation: boolean; // 翻译后直接导出
    targetLanguage: string; // 目标翻译语言
    translatedFilePrefix: string; // 翻译文件前缀
    blogPath: string; // 博客文章存放文件夹配置
    coverPath: string; // 封面图片文件夹配置
    useDefaultExportName: boolean;  // 是否使用默认导出文件名
    defaultExportName: string;      // 默认导出文件名
    useDefaultDispName: boolean;    // 是否使用默认展示性链接文件名
    defaultDispName: string;        // 默认展示性链接文件名
}

const DEFAULT_SETTINGS: HugoBlowfishExporterSettings = {
	exportPath: '',
    imageExportPath: 'img',
    translatedExportPath: '',
    BaseURL: 'https://api.deepseek.com/v1',
    ApiKey: '',
    ModelName: 'deepseek-chat',
    targetLanguage: '英文',
    directExportAfterTranslation: false,
    translatedFilePrefix: '',
    blogPath: 'posts',
    coverPath: '.featured',
    useDefaultExportName: false,
    defaultExportName: '{{title}}',  // 支持使用 {{title}} 作为文件名占位符
    useDefaultDispName: false,
    defaultDispName: 'index.zh-cn.md'
}

export default class HugoBlowfishExporter extends Plugin {
	settings: HugoBlowfishExporterSettings;
    private mathExporter: MathExporter;
    private mermaidExporter: MermaidExporter;
    private calloutExporter: CalloutExporter;
    private imageExporter: ImageExporter;
    private coverChooser: CoverChooser;
    private wikiLinkExporter: WikiLinkExporter;
    private client: OpenAI;

    async onload() {
        await this.loadSettings();
        this.mathExporter = new MathExporter();
        this.mermaidExporter = new MermaidExporter();
        this.calloutExporter = new CalloutExporter();
        this.imageExporter = new ImageExporter(this.app);
        this.coverChooser = new CoverChooser();
        this.wikiLinkExporter = new WikiLinkExporter(this.app);
        this.client = new OpenAI({
            baseURL: this.settings.BaseURL,
            apiKey: process.env.API_KEY || '',
            dangerouslyAllowBrowser: true
        });

		// 添加导出按钮到ribbon
		const ribbonIconEl = this.addRibbonIcon('arrow-right-from-line', 'Export all the file in vault', (evt: MouseEvent) => {
			new Notice('Starting export...');
			this.exportToHugo();
		});
		ribbonIconEl.addClass('hugo-blowfish-exporter-ribbon-class');

		// 添加导出命令
		this.addCommand({
			id: 'export-to-hugo-blowfish',
			name: 'Export current note to Hugo Blowfish',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.exportCurrentNote(editor, view);
			}
        });
        
        // 添加翻译命令
		this.addCommand({
			id: 'translate-to-the-other-language',
			name: 'Translate current note to the other language',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.translateCurrentNote();
			}
		});

		// 添加设置选项卡
		this.addSettingTab(new HugoBlowfishExporterSettingTab(this.app, this));
	}

    // 批量导出
	private async exportToHugo() {
        new ConfirmationModal(this.app, async () => {
            try {
                const batchExporter = new BatchExportModal(this.app, this.settings, this.modifyContent.bind(this));
                await batchExporter.export();
            } catch (error) {
                new Notice(`导出失败: ${error.message}`);
                console.error('Export error:', error);
            }
        }).open();
    }

    // 导出当前笔记
	private async exportCurrentNote(editor: Editor, view: MarkdownView) {
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

            // 读取文件内容并修改
            const content = await this.app.vault.read(currentFile);
            const modifiedContent = await this.modifyContent(content, 'single');

            // 根据slug创建目标目录
            let exportDir = path.resolve(this.settings.exportPath);
            exportDir = path.join(exportDir, this.settings.blogPath);
            const slugDir = path.join(exportDir, metadata.frontmatter.slug);
            if (!fs.existsSync(slugDir)) {
                fs.mkdirSync(slugDir, { recursive: true });
            }

            let fileName: string;
            if (this.settings.useDefaultExportName) {
                // 替换文件名中的占位符
                fileName = this.settings.defaultExportName;
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
            await this.coverChooser.chooseCover(this.settings, slugDir);

            // 显示成功提示
            new Notice(`✅ 导出成功!\n文件已保存至:\n${outputPath}`, 5000);

        } catch (error) {
            new Notice(`❌ 导出失败: ${error.message}`, 5000);
            console.error('Export error:', error);
        }
    }

    // 修改导出方法，添加模式参数
    private async modifyContent(content: string, mode: 'batch' | 'single' = 'single'): Promise<string> {
        try {
            let modifiedContent = content;

            const activeFile = this.app.workspace.getActiveFile();
            const metadata = activeFile ? this.app.metadataCache.getFileCache(activeFile) : null;
            const slug = metadata?.frontmatter?.slug;

            // 转换数学公式
            modifiedContent = this.mathExporter.transformMath(modifiedContent);

            // 转换 Callouts
            modifiedContent = this.calloutExporter.transformCallouts(modifiedContent);

            // 转换所有 wiki 链接
            modifiedContent = await this.wikiLinkExporter.transformWikiLinks(modifiedContent, mode, this.settings);

            // 转换图片链接
            if (slug) {
                modifiedContent = await this.imageExporter.transformImages(
                    modifiedContent,
                    mode,
                    this.settings,
                    slug
                );
            }

            // 转换 Mermaid 图表
            modifiedContent = this.mermaidExporter.transformMermaid(modifiedContent);

            return modifiedContent;
        } catch (error) {
            console.error('Error modifying content:', error);
            return content;
        }
    }

    // 翻译当前笔记
    private async translateCurrentNote() {

        try {
            // 检查API密钥是否配置
            if (!process.env.API_KEY) {
                new Notice('请先配置OpenAI API密钥');
                return;
            }

            // 检查API密钥是否配置
            if (!this.settings.BaseURL) {
                new Notice('请先在设置中配置BaseURL');
                return;
            }

            // 检查API密钥是否配置
            if (!this.settings.ModelName) {
                new Notice('请先在设置中配置模型名称');
                return;
            }

            // 检查翻译文件导出路径是否配置
            if (!this.settings.translatedExportPath) {
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

            new Notice('开始翻译...');

            // 调用API进行标题的翻译
            const titleCompletion = await this.client.chat.completions.create({
                model: this.settings.ModelName,
                messages: [
                    {
                        role: "system",
                        content: `你是一个精准的标题翻译专家。请将以下标题翻译成简洁凝练的${this.settings.targetLanguage}。`
                    },
                    {
                        role: "user",
                        content: currentFile.basename
                    }
                ],
                temperature: 0.3
            });
            const translatedTitle = titleCompletion.choices[0].message.content || 'Default Title';

            // 调用API进行内容的翻译
            const contentCompletion = await this.client.chat.completions.create({
                model: this.settings.ModelName,
                messages: [
                    {
                        role: "system",
                        content: `你是一个专业的文档翻译助手。请将以下Markdown内容翻译成${this.settings.targetLanguage}，保持所有的Markdown格式、链接和图片引用不变。frontmatter部分需要保持原样不变。`
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
            const fileName = `${this.settings.translatedFilePrefix}${translatedTitle}.md`;
            
            const translatedFilePath = path.join(this.settings.translatedExportPath, fileName);

            // 先导出到目标文件夹中，确保目录存在
            fs.mkdirSync(path.dirname(translatedFilePath), { recursive: true });
            fs.writeFileSync(translatedFilePath, translatedContent, 'utf8');
            new Notice(`✅ 翻译完成！\n文件已保存至:\n${translatedFilePath}`);

            // 检查是否需要直接导出
            if (this.settings.directExportAfterTranslation) {
                new Notice(`正在执行直接导出...`);

                // 检测是否有slug属性
                if (!metadata?.frontmatter?.slug) {
                    new Notice('⚠️ 当前文件缺少 slug 属性，请在 frontmatter 中添加 slug 字段');
                    return;
                }

                // 根据slug创建目标目录
                let exportDir = path.resolve(this.settings.exportPath);
                exportDir = path.join(exportDir, this.settings.blogPath);
                const slugDir = path.join(exportDir, metadata.frontmatter.slug);
                if (!fs.existsSync(slugDir)) {
                    fs.mkdirSync(slugDir, { recursive: true });
                }
                const modifiedContent = await this.modifyContent(translatedContent, 'single');

                let dierectExportFileName: string;
                if (this.settings.targetLanguage === '中文') {
                    dierectExportFileName = 'index.zh-cn';
                } else {
                    dierectExportFileName = 'index.en';
                }

                // 构建完整的输出路径
                const outputPath = path.join(slugDir, `${dierectExportFileName}.md`);

                // 写入文件
                fs.writeFileSync(outputPath, modifiedContent, 'utf8');

                // 自动选择博客封面
                await this.coverChooser.chooseCover(this.settings, slugDir);

                new Notice(`✅ 直接导出成功!\n文件已保存至:\n${outputPath}`, 5000);
            }
        } catch (error) {
            new Notice(`❌ 翻译失败: ${error.message}`);
            console.error('Translation error:', error);
        }
    }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
