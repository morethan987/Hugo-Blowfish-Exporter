import { App } from 'obsidian';
import * as fs from 'fs';
import HugoBlowfishExporter from 'src/core/plugin';

/**
 * wiki链接修复器
 * 用于确保翻译后的文件中的wiki链接正确
 */
export class WikiFixer {
    constructor(
        private app: App,
        private plugin: HugoBlowfishExporter
    ) {}

}