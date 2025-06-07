import { HugoBlowfishExporterSettings } from '../types/settings';

export const DEFAULT_SETTINGS: HugoBlowfishExporterSettings = {
    exportPath: '',
    exportPathWindows: 'E:/Hugo/morethan987/content',
    exportPathLinux: '/mnt/E/Hugo/morethan987/content',
    imageExportPath: 'img',
    translatedExportPath: '',
    translatedExportPathWindows: '',
    translatedExportPathLinux: '',
    currentOS: 'Windows',
    BaseURL: 'https://api.deepseek.com/v1',
    ApiKey: '',
    ModelName: 'deepseek-chat',
    targetLanguage: 'en',
    directExportAfterTranslation: false,
    translatedFilePrefix: '',
    blogPath: 'posts',
    coverPath: '.featured',
    useDefaultExportName: false,
    defaultExportName_zh_cn: 'index.zh-cn',  // 支持使用 {{title}} 作为文件名占位符
    defaultExportName_en: 'index.en',  // 支持使用 {{title}} 作为文件名占位符
    useDefaultDispName: false,
    defaultDispName_zh_cn: 'index.zh-cn.md',
    defaultDispName_en: 'index.en.md'
}