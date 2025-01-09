import { App, Notice, TFile } from 'obsidian';
import { ExportDispNameModal } from '../utils/exportDispNameModal';
import { HugoBlowfishExporterSettings } from '../main';

export class WikiLinkExporter {
    constructor(private app: App) {}

    async transformWikiLinks(
        content: string, 
        mode: 'batch' | 'single',
        settings: HugoBlowfishExporterSettings
    ): Promise<string> {
        // 匹配所有wiki链接：展示性(![[file]])和非展示性([[file|text]])
        const wikiLinkRegex = /(!?\[\[(.*?)(?:\|(.*?))?\]\])/g;
        let modifiedContent = content;
        
        const promises = Array.from(content.matchAll(wikiLinkRegex)).map(async match => {
            const [fullMatch, _, targetFile, displayText] = match;
            const isDisplayLink = fullMatch.startsWith('!');
            const actualTarget = targetFile.split('#')[0].split('|')[0].trim();
            
            try {
                const file = this.app.metadataCache.getFirstLinkpathDest(actualTarget, '');
                if (!file) {
                    if (mode === 'single') {
                        new Notice(`❌ 未找到文件: ${actualTarget}`);
                    } else {
                        console.warn(`未找到文件: ${actualTarget}`);
                    }
                    return;
                }

                // 检查如果是展示性链接且为图片，则跳过处理
                if (isDisplayLink) {
                    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(
                        file.extension.toLowerCase()
                    );
                    if (isImage) return;
                }

                const metadata = this.app.metadataCache.getFileCache(file);
                
                if (!metadata?.frontmatter?.slug) {
                    if (mode === 'single') {
                        new Notice(`⚠️ 警告: ${file.basename} 缺少slug属性\n请在文件frontmatter中添加slug字段`, 20000);
                    } else {
                        console.warn(`文件 ${file.basename} 缺少slug属性`);
                    }
                    return;
                }

                let hugoLink: string;
                if (isDisplayLink) {
                    // 处理展示性链接
                    let fileName: string;
                    if (settings.useDefaultDispName) {
                        fileName = settings.defaultDispName;
                    } else {
                        fileName = await new Promise((resolve) => {
                            new ExportDispNameModal(this.app, 'index.zh-cn.md', (name) => {
                                resolve(name);
                            }).open();
                        });
                    }
                    hugoLink = `{{< mdimporter url="content/${settings.blogPath}/${metadata.frontmatter.slug}/${fileName}" >}}`;
                } else {
                    // 处理非展示性链接
                    const linkText = displayText || file.basename;
                    hugoLink = `[${linkText}]({{< ref "/${settings.blogPath}/${metadata.frontmatter.slug}" >}})`;
                }

                modifiedContent = modifiedContent.replace(fullMatch, hugoLink);
            } catch (error) {
                if (mode === 'single') {
                    new Notice(`❌ 处理链接失败: ${actualTarget}\n${error.message}`);
                }
                console.error(`处理wiki链接时出错:`, error);
            }
        });

        await Promise.all(promises);
        return modifiedContent;
    }
}
