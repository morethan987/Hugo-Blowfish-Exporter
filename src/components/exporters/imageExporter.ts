import { App, TFile, Notice } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';

export class ImageExporter {
    constructor(private app: App) {}

    async transformImages(content: string, mode: 'batch' | 'single', settings: any, slug: string): Promise<string> {
        // 处理 wiki 链接格式 ![[...]]
        const imgLinkRegex = /!\[\[(.*?)\]\]/g;
        // 处理标准 Markdown 格式 ![alt](filename "description")
        const markdownImgRegex = /!\[([^\]]*)\]\(([^)]+?)\s*(?:"([^"]*)")?\)/g;
        
        let modifiedContent = content;

        // 处理 wiki 链接格式
        const wikiMatches = Array.from(content.matchAll(imgLinkRegex));
        for (const match of wikiMatches) {
            const wikiPath = match[1];
            modifiedContent = await this.processWikiImage(modifiedContent, wikiPath, mode, settings, slug);
        }

        // 处理标准 Markdown 格式
        const markdownMatches = Array.from(content.matchAll(markdownImgRegex));
        for (const match of markdownMatches) {
            const altText = match[1];
            const imagePath = match[2];
            const description = match[3] || '';
            const originalText = match[0];
            
            // 从路径中提取纯文件名（去掉引号中的描述）
            const fileName = imagePath.trim();
            
            modifiedContent = await this.processMarkdownImage(
                modifiedContent, 
                fileName, 
                altText, 
                description, 
                originalText, 
                mode, 
                settings, 
                slug
            );
        }
        
        return modifiedContent;
    }

    async transformImages_AST(content: string, mode: 'batch' | 'single', settings: any, slug: string): Promise<string> {
        // 处理 wiki 链接格式 ![[...]]
        const imgLinkRegex = /!\[\[(.*?)\]\]/g;
        // 处理标准 Markdown 格式 ![alt](filename "description")
        const markdownImgRegex = /!\[([^\]]*)\]\(([^)]+?)\s*(?:"([^"]*)")?\)/g;
        
        let modifiedContent = content;

        // 处理 wiki 链接格式
        const wikiMatches = Array.from(content.matchAll(imgLinkRegex));
        for (const match of wikiMatches) {
            const wikiPath = match[1];
            modifiedContent = await this.processWikiImage(modifiedContent, wikiPath, mode, settings, slug);
        }

        // 处理标准 Markdown 格式
        const markdownMatches = Array.from(content.matchAll(markdownImgRegex));
        for (const match of markdownMatches) {
            const altText = match[1];
            const imagePath = match[2];
            const description = match[3] || '';
            const originalText = match[0];
            
            // 从路径中提取纯文件名（去掉引号中的描述）
            const fileName = imagePath.trim();
            
            modifiedContent = await this.processMarkdownImage(
                modifiedContent, 
                fileName, 
                altText, 
                description, 
                originalText, 
                mode, 
                settings, 
                slug
            );
        }
        
        return modifiedContent;
    }

    private async processWikiImage(content: string, wikiPath: string, mode: 'batch' | 'single', settings: any, slug: string): Promise<string> {
        try {
            const attachmentFile = this.app.metadataCache.getFirstLinkpathDest(wikiPath, '');
            if (attachmentFile) {
                const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(
                    path.extname(attachmentFile.path).toLowerCase()
                );
                if (!isImage) {
                    return content;
                }
            }
            
            if (attachmentFile instanceof TFile) {
                const success = await this.copyImageFile(attachmentFile, settings, slug);
                if (success) {
                    // 生成新的图片引用路径（使用相对路径）
                    const hugoImagePath = `${settings.imageExportPath}/${attachmentFile.name}`;
                    
                    // 替换原始wiki链接
                    return content.replace(
                        `![[${wikiPath}]]`,
                        this.generateImageHtml(hugoImagePath, attachmentFile.name)
                    );
                }
            }
        } catch (error) {
            console.error(`Failed to process wiki image ${wikiPath}:`, error);
            if (mode === 'single') {
                new Notice(`❌ 处理图片失败: ${wikiPath}\n${error.message}`);
            }
        }
        return content;
    }

    private async processMarkdownImage(
        content: string, 
        fileName: string, 
        altText: string, 
        description: string, 
        originalText: string, 
        mode: 'batch' | 'single', 
        settings: any, 
        slug: string
    ): Promise<string> {
        try {
            // 尝试通过文件名找到附件文件
            const attachmentFile = this.app.metadataCache.getFirstLinkpathDest(fileName, '');
            
            if (attachmentFile && attachmentFile instanceof TFile) {
                const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(
                    path.extname(attachmentFile.path).toLowerCase()
                );
                
                if (isImage) {
                    const success = await this.copyImageFile(attachmentFile, settings, slug);
                    if (success) {
                        // 生成新的图片引用路径（使用相对路径）
                        const hugoImagePath = `${settings.imageExportPath}/${attachmentFile.name}`;
                        
                        // 本来就是标准 Markdown 格式的图片链接，不用修改
                        const newImageLink = this.generateImageHtml(hugoImagePath, altText || attachmentFile.name, description);
                        return content.replace(originalText, newImageLink);
                    }
                }
            }
        } catch (error) {
            console.error(`Failed to process markdown image ${fileName}:`, error);
            if (mode === 'single') {
                new Notice(`❌ 处理图片失败: ${fileName}\n${error.message}`);
            }
        }
        return content;
    }

    private async copyImageFile(attachmentFile: TFile, settings: any, slug: string): Promise<boolean> {
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
            const imageData = await this.app.vault.readBinary(attachmentFile);
            const targetPath = path.join(imagesDir, attachmentFile.name);
            fs.writeFileSync(targetPath, Buffer.from(imageData));
            
            return true;
        } catch (error) {
            console.error(`Failed to copy image file ${attachmentFile.name}:`, error);
            return false;
        }
    }

    private generateImageHtml(imagePath: string, imageTitle: string, description: string = ""): string {
        if (description) {
            return `![${imageTitle}](${imagePath} "${description}")`;
        }
        return `![${imageTitle}](${imagePath})`;
    }
}
