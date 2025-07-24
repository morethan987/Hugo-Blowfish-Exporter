import { App, Notice, TFile } from 'obsidian';


export function getSlugByName(app: App, file_name: string): string {
    const file = this.app.metadataCache.getFirstLinkpathDest(file_name, '');
    if (!file) {
        new Notice(`❌ 未找到文件: ${file_name}`);
        return "";
    }

    const metadata = this.app.metadataCache.getFileCache(file);
    if (!metadata?.frontmatter?.slug) {
        new Notice(`⚠️ 警告: ${file.basename} 缺少slug属性\n请在文件frontmatter中添加slug字段`, 20000);
        return "";
    }

    return metadata.frontmatter.slug
}

export function getLangByName(app: App, file_name: string): string {
    const file = this.app.metadataCache.getFirstLinkpathDest(file_name, '');
    if (!file) {
        new Notice(`❌ 未找到文件: ${file_name}`);
        return "";
    }

    const metadata = this.app.metadataCache.getFileCache(file);
    if (!metadata?.frontmatter?.language) {
        new Notice(`⚠️ 警告: ${file.basename} 缺少language属性\n请在文件frontmatter中添加language字段`, 20000);
        return "";
    }

    return metadata.frontmatter.language
}

export function getFrontmatterByName(app: App, file_name: string): Record<string, any> | null {
    const file = this.app.metadataCache.getFirstLinkpathDest(file_name, '');
    if (!file) {
        new Notice(`❌ 未找到文件: ${file_name}`);
        return null;
    }

    const metadata = this.app.metadataCache.getFileCache(file);
    if (!metadata?.frontmatter) {
        new Notice(`⚠️ 警告: ${file.basename} 缺少frontmatter属性`, 20000);
        return null;
    }

    return metadata.frontmatter;
}