export interface HugoBlowfishExporterSettings {
    exportPath: string; // 导出路径配置
    exportPathWindows: string; // Windows系统下的content目录绝对路径
    exportPathLinux: string; // Linux系统下的content目录绝对路径
    imageExportPath: string; // 图片导出路径配置
    translatedExportPath: string; // 翻译文件导出路径配置
    translatedExportPathWindows: string; // Windows系统下的翻译文件导出路径
    translatedExportPathLinux: string; // Linux系统下的翻译文件导出路径
    currentOS: 'Windows' | 'Linux'; // 当前选择的操作系统
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