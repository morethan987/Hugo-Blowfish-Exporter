import { App, Notice, TFile } from 'obsidian';
import { ExportDispNameModal } from 'src/utils/exportDispNameModal';
import { HugoBlowfishExporterSettings } from 'src/types/settings';
import { RuleBuilder } from '../ast/main';
import { NodeType } from '../ast/parser';
import { getSlugByName, getLangByName } from 'src/components/exporters/utils';

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
            
            // 分离文件名和段落引用
            const [filePath, fragment] = targetFile.split('#');
            const actualTarget = filePath.split('|')[0].trim();
            
            try {
                let hugoLink: string;
                // 如果没有文件名，说明是一个内部链接
                if (!actualTarget) {
                    const linkText = displayText || fragment;
                    const formated_fragment = fragment.replace(/[A-Z]/g, (char) => char.toLowerCase()).replace(/\s+/g, "-").replace(/[^\w\-\u4e00-\u9fa5]/g, ""); // 保留中文汉字，但移除特殊标点符号
                    hugoLink = `[${linkText}]({{< relref "#${formated_fragment}" >}})`;
                    modifiedContent = modifiedContent.replace(fullMatch, hugoLink);
                } else {
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
                    if (!metadata?.frontmatter?.language) {
                        if (mode === 'single') {
                            new Notice(`⚠️ 警告: ${file.basename} 缺少language属性\n请在文件frontmatter中添加language字段`, 20000);
                        } else {
                            console.warn(`文件 ${file.basename} 缺少language属性`);
                        }
                        return;
                    }

                    if (isDisplayLink) {
                        // 处理展示性链接
                        let fileName: string;
                        if (settings.useDefaultDispName) {
                            fileName = settings.defaultDispName_zh_cn;
                            if (metadata.frontmatter.language === 'en') {
                                fileName = settings.defaultDispName_en;
                            }
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
                        const linkText = displayText || (fragment || file.basename);
                        const fragmentPart = fragment ? `#${fragment}` : '';
                        hugoLink = `[${linkText}]({{< ref "/${settings.blogPath}/${metadata.frontmatter.slug}/${fragmentPart}" >}})`;
                    }

                    modifiedContent = modifiedContent.replace(fullMatch, hugoLink);
                }
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

    async transformWikiLinks_AST(
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
            
            // 分离文件名和段落引用
            const [filePath, fragment] = targetFile.split('#');
            const actualTarget = filePath.split('|')[0].trim();
            
            try {
                let hugoLink: string;
                // 如果没有文件名，说明是一个内部链接
                if (!actualTarget) {
                    const linkText = displayText || fragment;
                    const formated_fragment = fragment.replace(/[A-Z]/g, (char) => char.toLowerCase()).replace(/\s+/g, "-").replace(/[^\w\-\u4e00-\u9fa5]/g, ""); // 保留中文汉字，但移除特殊标点符号
                    hugoLink = `[${linkText}]({{< relref "#${formated_fragment}" >}})`;
                    modifiedContent = modifiedContent.replace(fullMatch, hugoLink);
                } else {
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
                    if (!metadata?.frontmatter?.language) {
                        if (mode === 'single') {
                            new Notice(`⚠️ 警告: ${file.basename} 缺少language属性\n请在文件frontmatter中添加language字段`, 20000);
                        } else {
                            console.warn(`文件 ${file.basename} 缺少language属性`);
                        }
                        return;
                    }

                    if (isDisplayLink) {
                        // 处理展示性链接
                        let fileName: string;
                        if (settings.useDefaultDispName) {
                            fileName = settings.defaultDispName_zh_cn;
                            if (metadata.frontmatter.language === 'en') {
                                fileName = settings.defaultDispName_en;
                            }
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
                        const linkText = displayText || (fragment || file.basename);
                        const fragmentPart = fragment ? `#${fragment}` : '';
                        hugoLink = `[${linkText}]({{< ref "/${settings.blogPath}/${metadata.frontmatter.slug}/${fragmentPart}" >}})`;
                    }

                    modifiedContent = modifiedContent.replace(fullMatch, hugoLink);
                }
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

export const wikiLinkRule = [
    new RuleBuilder('非展示型wiki链接转换')
        .describe('将非展示型wiki链接转换为对应的hugo简码')
        .matchType(NodeType.WikiLink)
        .transform((node, context) => {
            const heading = (node.heading as string) || '';
            const formated_heading = heading.replace(/[A-Z]/g, (char) => char.toLowerCase()).replace(/\s+/g, "-").replace(/[^\w\-\u4e00-\u9fa5]/g, ""); // 保留中文汉字，但移除特殊标点符号
            const alias = (node.alias as string) || '';
            const linkType = node.linkType as string;
            const file_name = node.file as string || '';

            let hugoLink = ''
            if(linkType === 'external-heading' || linkType === 'article'){
                hugoLink = `[${alias || heading}]({{< ref "/${context.data.settings.blogPath}/${getSlugByName(context.data.app, file_name)}/${formated_heading ? '#' + formated_heading : ''}" >}})`;
            } else if(linkType === 'internal-heading'){
                hugoLink = `[${alias || heading}]({{< relref "#${formated_heading}" >}})`;
            }

            return {
                type: NodeType.Text,
                value: hugoLink
            };
        })
        .build(),
    new RuleBuilder('展示型wiki链接转换')
        .describe('将展示型wiki链接转换为对应的hugo简码')
        .matchType(NodeType.Embed)
        .transform((node, context) => {
            let fileName = context.data.settings.defaultDispName_zh_cn;
            if (context.data.lang === 'en') {
                fileName = context.data.settings.defaultDispName_en;
            }
            const hugoLink = `{{< mdimporter url="content/${context.data.settings.blogPath}/${context.data.slug}/${fileName}" >}}`;

            return {
                type: NodeType.Text,
                value: hugoLink
            };
        })
        .build(),
]