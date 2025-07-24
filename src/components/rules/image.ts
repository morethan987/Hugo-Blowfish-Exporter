import { App, TFile } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import { RuleBuilder } from '../ast/rule';
import { NodeType } from '../ast/parser';

export const imageRule = new RuleBuilder('图片链接转换')
    .describe('将图片链接转换为对应的hugo简码')
    .matchType(NodeType.Image)
    .transform((node, context) => {
        if (!context.data.imageFiles) context.data.imageFiles = [];
        context.data.imageFiles.push(node.url);
        node.url = context.data.settings.imageExportPath + '/' + node.url
        return node;
    })
    .build();

// 批量复制图片辅助函数
export async function copyImagesAfterAst(app: App, imageFiles: string[], settings: any, slug: string) {
    for (const fileName of imageFiles) {
        // 用 app.metadataCache.getFirstLinkpathDest 定位 TFile
        const tfile = app.metadataCache.getFirstLinkpathDest(fileName, '');
        if (tfile) {
            await copyImageFile(app, tfile, settings, slug);
        }
    }
}

export async function copyImageFile(app: App, attachmentFile: TFile, settings: any, slug: string): Promise<boolean> {
    try {
        // 获取相对于vault根目录的路径
        const relativePath = attachmentFile.path.replace(/\\/g, '/');
        
        // 构建目标路径
        const exportDir = path.resolve(settings.exportPath);
        const imagesDir = path.join(
            exportDir,
            settings.blogPath,
            slug,
            settings.imageExportPath
        );
        
        // 确保图片导出目录存在
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
        }
        
        // 获取文件内容并复制
        const imageData = await app.vault.readBinary(attachmentFile);
        const targetPath = path.join(imagesDir, attachmentFile.name);
        fs.writeFileSync(targetPath, Buffer.from(imageData));
        
        return true;
    } catch (error) {
        console.error(`Failed to copy image file ${attachmentFile.name}:`, error);
        return false;
    }
}