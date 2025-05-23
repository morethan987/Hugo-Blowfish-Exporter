import { Notice } from 'obsidian';
import HugoBlowfishExporter from '../../core/plugin';

/**
 * 验证翻译所需的配置
 */
export class TranslationValidator {
    constructor(private plugin: HugoBlowfishExporter) {}

    /**
     * 验证所有必需的配置是否已设置
     * @returns 如果验证通过返回 true，否则返回 false
     */
    validateConfiguration(): boolean {
        if (!process.env.API_KEY) {
            new Notice('请先配置OpenAI API密钥');
            return false;
        }

        if (!this.plugin.settings.BaseURL) {
            new Notice('请先在设置中配置BaseURL');
            return false;
        }

        if (!this.plugin.settings.ModelName) {
            new Notice('请先在设置中配置模型名称');
            return false;
        }

        if (!this.plugin.settings.translatedExportPath) {
            new Notice('请先在设置中配置翻译文件导出路径');
            return false;
        }

        return true;
    }
}