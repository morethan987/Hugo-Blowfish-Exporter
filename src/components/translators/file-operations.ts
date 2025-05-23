import * as path from 'path';
import * as fs from 'fs';
import HugoBlowfishExporter from '../../core/plugin';

/**
 * 翻译文件操作助手
 */
export class TranslationFileOperations {
    constructor(private plugin: HugoBlowfishExporter) {}

    /**
     * 保存翻译后的文件
     * @param translatedTitle 翻译后的标题
     * @param translatedContent 翻译后的内容
     * @returns 保存的文件路径
     */
    saveTranslatedFile(translatedTitle: string, translatedContent: string): string {
        const fileName = `${this.plugin.settings.translatedFilePrefix}${translatedTitle}.md`;
        const translatedFilePath = path.join(this.plugin.settings.translatedExportPath, fileName);

        // 确保目录存在
        fs.mkdirSync(path.dirname(translatedFilePath), { recursive: true });
        
        // 保存文件
        fs.writeFileSync(translatedFilePath, translatedContent, 'utf8');
        
        return translatedFilePath;
    }

    /**
     * 获取直接导出的文件名
     * @returns 文件名（不包含扩展名）
     */
    getDirectExportFileName(): string {
        if (this.plugin.settings.targetLanguage === '中文') {
            return 'index.zh-cn';
        } else {
            return 'index.en';
        }
    }

    /**
     * 创建并返回slug目录路径
     * @param slug slug值
     * @returns slug目录路径
     */
    createSlugDirectory(slug: string): string {
        let exportDir = path.resolve(this.plugin.settings.exportPath);
        exportDir = path.join(exportDir, this.plugin.settings.blogPath);
        const slugDir = path.join(exportDir, slug);
        
        if (!fs.existsSync(slugDir)) {
            fs.mkdirSync(slugDir, { recursive: true });
        }
        
        return slugDir;
    }

    /**
     * 保存直接导出的文件
     * @param slugDir slug目录路径
     * @param fileName 文件名
     * @param content 文件内容
     * @returns 输出文件路径
     */
    saveDirectExportFile(slugDir: string, fileName: string, content: string): string {
        const outputPath = path.join(slugDir, `${fileName}.md`);
        fs.writeFileSync(outputPath, content, 'utf8');
        return outputPath;
    }
}