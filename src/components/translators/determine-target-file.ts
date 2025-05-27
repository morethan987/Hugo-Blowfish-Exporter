import HugoBlowfishExporter from 'src/core/plugin';

/**
 * 确定目标文件路径
 * @param thisFilePath 本文件路径
 * @param plugin 插件实例
 * @returns 目标文件路径
 */
export async function determineTargetFilePath(thisFilePath: string, plugin: HugoBlowfishExporter): Promise<string | null> {
    const path = require('path');
    const fs = require('fs');
    
    // 获取本文件的文件名（不包含路径）
    const thisFileName = path.basename(thisFilePath);
    
    // 提取本文件名开头的数字
    const numberMatch = thisFileName.match(/^(\d+)\./);
    if (!numberMatch) {
        return null;
    }
    
    const fileNumber = numberMatch[1];
    const translatedExportPath = plugin.settings.translatedExportPath;
    
    if (!translatedExportPath) {
        return null;
    }
    
    try {
        // 读取目标文件目录下的所有文件
        const files = fs.readdirSync(translatedExportPath);
        
        // 寻找以相同数字开头的目标文件
        const targetFile = files.find((file: string) => {
            return file.startsWith(`${fileNumber}.`) && file.endsWith('.md');
        });
        
        if (targetFile) {
            return path.join(translatedExportPath, targetFile);
        }
    } catch (error) {
        return null;
    }
    
    return null;
}