import { App, MarkdownView, Notice } from 'obsidian';
import HugoBlowfishExporter from './plugin';
import {
    TranslationValidator,
    TranslationApiClient,
    TranslationFileOperations,
    DirectExportHelper,
    DiffDetector,
    FileUpdater
} from '../components/translators';
import { DiffValidator } from '../components/translators/diff-validator';
import { DiffProcessor } from '../components/translators/diff-processor';
import type {
    Paragraph,
    ParagraphUpdate,
    TranslatedParagraph
} from '../components/translators';

export class Translator {
    private validator: TranslationValidator;
    private apiClient: TranslationApiClient;
    private fileOps: TranslationFileOperations;
    private directExport: DirectExportHelper;
    private diffDetector: DiffDetector;
    private fileUpdater: FileUpdater;
    private diffValidator: DiffValidator;
    private diffProcessor: DiffProcessor;

    constructor(
        private app: App,
        private plugin: HugoBlowfishExporter
    ) {
        this.validator = new TranslationValidator(plugin);
        this.apiClient = new TranslationApiClient(plugin);
        this.fileOps = new TranslationFileOperations(plugin);
        this.directExport = new DirectExportHelper(plugin);
        this.diffDetector = new DiffDetector(plugin);
        this.fileUpdater = new FileUpdater(plugin, app);
        this.diffValidator = new DiffValidator(app, plugin);
        this.diffProcessor = new DiffProcessor(this.apiClient);
    }

    async translateCurrentNote() {
        let notice: Notice | null = null;
        
        try {
            // 验证配置
            if (!this.validator.validateConfiguration()) {
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

            // 翻译标题
            notice.setMessage('正在翻译标题...');
            const translatedTitle = await this.apiClient.translateTitle(currentFile.basename);

            // 翻译内容
            notice.setMessage('正在翻译内容...');
            const translatedContent = await this.apiClient.translateContent(content,true);

            // 保存翻译文件
            notice.setMessage('正在保存翻译结果...');
            const translatedFilePath = this.fileOps.saveTranslatedFile(translatedTitle, translatedContent);
            
            notice.hide();
            new Notice(`✅ 翻译完成！\n文件已保存至:\n${translatedFilePath}`, 5000);

            // 检查是否需要直接导出
            if (this.plugin.settings.directExportAfterTranslation) {
                await this.directExport.executeDirectExport(translatedContent, metadata, translatedTitle);
            }
        } catch (error) {
            if (notice) {
                notice.hide();
            }
            new Notice(`❌ 翻译失败: ${error.message}`, 5000);
        }
    }

    async translateDifference() {
        let notice: Notice | null = null;
        
        try {
            console.debug('🚀 [Translator] 开始差异翻译流程');
            
            // 验证配置
            if (!this.validator.validateConfiguration()) {
                console.debug('❌ [Translator] 配置验证失败');
                return;
            }

            notice = new Notice('开始差异翻译...', 0);

            // 验证差异翻译的前置条件
            console.debug('🔍 [Translator] 验证差异翻译前置条件...');
            const validationResult = await this.diffValidator.validateDiffTranslation();
            if (!validationResult) {
                console.debug('❌ [Translator] 差异翻译前置条件验证失败');
                notice.hide();
                return;
            }

            const { diffResult, englishFilePath } = validationResult;
            console.debug('✅ [Translator] 验证成功:', {
                hasChanges: diffResult.hasChanges,
                changesCount: diffResult.changes.length,
                englishFilePath
            });

            // 读取文件内容
            notice.setMessage('正在读取文件内容...');
            console.debug('📖 [Translator] 读取英文文件内容:', englishFilePath);
            const englishContent = await this.readFileContent(englishFilePath);
            console.debug('📄 [Translator] 文件内容长度:', englishContent.length);

            // 处理差异内容
            notice.setMessage('正在处理差异内容...');
            console.debug('🔄 [Translator] 开始处理差异内容...');
            const updates = await this.diffProcessor.processDiffChanges(diffResult.changes);
            console.debug('✅ [Translator] 差异处理完成，更新数量:', updates.length);

            // 应用更新
            notice.setMessage('正在保存更新...');
            console.debug('💾 [Translator] 开始应用更新到目标文件...');
            await this.fileUpdater.updateTargetFile(englishFilePath, updates);
            console.debug('✅ [Translator] 文件更新完成');

            notice.hide();
            console.debug('🎉 [Translator] 差异翻译流程完成');
            new Notice(`✅ 差异翻译完成！\n已更新文件: ${englishFilePath}`, 8000);

        } catch (error) {
            console.error('❌ [Translator] 差异翻译流程失败:', error);
            console.error('📊 [Translator] 错误堆栈:', error.stack);
            
            if (notice) {
                notice.hide();
            }
            new Notice(`❌ 差异翻译失败: ${error.message}`, 5000);
        }
    }

    /**
     * 读取文件内容
     * @param filePath 文件路径
     * @returns 文件内容
     */
    private async readFileContent(filePath: string): Promise<string> {
        const fs = require('fs').promises;
        try {
            return await fs.readFile(filePath, 'utf8');
        } catch (error) {
            throw new Error(`无法读取文件: ${filePath} - ${error.message}`);
        }
    }
}