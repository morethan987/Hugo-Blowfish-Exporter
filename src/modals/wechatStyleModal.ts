import { App, Modal, Notice, Plugin } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import { CssEditorModal } from './cssEditorModal';

interface StyleTemplate {
    id: string;
    name: string;
    description: string;
    file: string;
    category: string;
    deletable: boolean;
    default: boolean;
}

interface DevicePreset {
    name: string;
    width: string;
    description: string;
}

interface StylesConfig {
    templates: StyleTemplate[];
    devicePresets: DevicePreset[];
}

export class WechatStyleModal extends Modal {
    private onStyleSelected: (cssContent: string) => void;
    private htmlContent: string;
    private cssDir: string;
    private stylesConfig: StylesConfig;
    private selectedTemplate: StyleTemplate | null = null;
    private previewContainer: HTMLElement;
    private previewFrame: HTMLIFrameElement;
    private currentDeviceWidth: string = '375px';
    private plugin: Plugin;

    constructor(
        app: App,
        plugin: Plugin,
        htmlContent: string,
        onStyleSelected: (cssContent: string) => void
    ) {
        super(app);
        this.plugin = plugin;
        this.htmlContent = htmlContent;
        this.onStyleSelected = onStyleSelected;
        
        // 动态获取插件目录下的styles文件夹路径
        // @ts-ignore - 访问adapter的basePath
        const vaultPath = this.app.vault.adapter.basePath || '';
        const pluginRelativePath = this.plugin.manifest.dir;
        this.cssDir = `${vaultPath}/${pluginRelativePath}/styles`;

        this.loadStylesConfig();
    }

    private loadStylesConfig() {
        try {
            const configPath = path.join(this.cssDir, 'styles.json');
            const configContent = fs.readFileSync(configPath, 'utf8');
            this.stylesConfig = JSON.parse(configContent);
        } catch (error) {
            console.error('加载样式配置失败:', error);
            this.stylesConfig = { templates: [], devicePresets: [] };
        }
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        // 设置模态框样式
        this.modalEl.style.width = '90vw';
        this.modalEl.style.height = '95vh';
        this.modalEl.style.maxWidth = '1400px';
        this.modalEl.style.maxHeight = '900px';

        // 主标题
        contentEl.createEl('h3', { text: '样式选择' });

        // 创建主要布局容器
        const mainContainer = contentEl.createDiv();
        mainContainer.style.cssText = `
            display: flex;
            height: calc(100% - 120px);
            gap: 20px;
        `;

        // 左侧面板 - 样式选择和设备预设
        const leftPanel = mainContainer.createDiv();
        leftPanel.style.cssText = `
            width: 300px;
            border: 1px solid var(--background-modifier-border);
            border-radius: 8px;
            padding: 16px;
            overflow-y: auto;
        `;

        // 右侧面板 - 预览区域
        const rightPanel = mainContainer.createDiv();
        rightPanel.style.cssText = `
            flex: 1;
            border: 1px solid var(--background-modifier-border);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            flex-direction: column;
        `;

        this.createLeftPanel(leftPanel);
        this.createRightPanel(rightPanel);

        // 底部按钮
        this.createBottomButtons(contentEl);

        // 默认选中default模板
        this.selectDefaultTemplate();

        // 初始化预览
        this.updatePreview();
    }

    private createLeftPanel(container: HTMLElement) {
        // 设备预设选择
        const deviceSection = container.createDiv();
        deviceSection.createEl('h4', { text: '设备预设' });
        
        const deviceSelect = deviceSection.createEl('select');
        deviceSelect.style.cssText = `
            width: 100%;
            margin-bottom: 20px;
            padding: 8px;
            border-radius: 2px;
        `;

        this.stylesConfig.devicePresets.forEach(preset => {
            const option = deviceSelect.createEl('option', {
                value: preset.width,
                text: `${preset.name} (${preset.width})`
            });
            if (preset.width === this.currentDeviceWidth) {
                option.selected = true;
            }
        });

        deviceSelect.addEventListener('change', () => {
            this.currentDeviceWidth = deviceSelect.value;
            this.updatePreview();
        });

        // 样式模板选择
        const templateSection = container.createDiv();
        templateSection.createEl('h4', { text: '样式模板' });

        // 按类别分组显示模板
        const categories = [...new Set(this.stylesConfig.templates.map(t => t.category))];
        
        categories.forEach(category => {

            const templatesInCategory = this.stylesConfig.templates.filter(t => t.category === category);

            // 跳过内置空白模板
            if (templatesInCategory.length === 1 && templatesInCategory[0].id === 'blank') return;

            const categoryDiv = templateSection.createDiv();
            categoryDiv.style.marginBottom = '16px';
            const categoryTitle = categoryDiv.createEl('h4', { text: category });
            categoryTitle.style.cssText = `
                margin: 8px 0;
                color: var(--text-muted);
                font-size: 0.9em;
            `;

            templatesInCategory.forEach(template => {

                // 跳过内置空白模板
                if (template.id === 'blank') return;

                const templateItem = categoryDiv.createDiv();
                templateItem.style.cssText = `
                    border: 1px solid var(--background-modifier-border);
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                `;
                templateItem.setAttribute('data-template-id', template.id);

                const templateName = templateItem.createEl('div', { text: template.name });
                templateName.style.fontWeight = 'bold';

                const templateDesc = templateItem.createEl('div', { text: template.description });
                templateDesc.style.cssText = `
                    font-size: 0.85em;
                    color: var(--text-muted);
                    margin-top: 4px;
                `;

                // 操作按钮
                const actionsDiv = templateItem.createDiv();
                actionsDiv.style.cssText = `
                    margin-top: 8px;
                    display: flex;
                    gap: 8px;
                    align-items: center;
                `;

                // 默认模板标识
                if (template.default) {
                    const defaultBadge = actionsDiv.createEl('span', { text: '默认' });
                    defaultBadge.style.cssText = `
                        padding: 2px 6px;
                        font-size: 0.7em;
                        border-radius: 3px;
                        background: var(--interactive-accent);
                        color: white;
                    `;
                } else {
                    const setDefaultBtn = actionsDiv.createEl('button', { text: '设为默认' });
                    setDefaultBtn.style.cssText = `
                        padding: 3px 6px;
                        font-size: 0.8em;
                        border-radius: 4px;
                        border: 1px solid var(--interactive-accent);
                        background: transparent;
                        color: var(--interactive-accent);
                        cursor: pointer;
                    `;
                    setDefaultBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.setAsDefault(template);
                    });
                }

                if (template.deletable) {
                    const editBtn = actionsDiv.createEl('button', { text: '编辑' });
                    editBtn.style.cssText = `
                        padding: 3px 6px;
                        font-size: 0.8em;
                        border-radius: 4px;
                        border: 1px solid var(--text-warning);
                        background: transparent;
                        color: var(--text-warning);
                        cursor: pointer;
                    `;
                    editBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.editTemplate(template);
                    });

                    const deleteBtn = actionsDiv.createEl('button', { text: '删除' });
                    deleteBtn.style.cssText = `
                        padding: 3px 6px;
                        font-size: 0.8em;
                        border-radius: 4px;
                        border: 1px solid var(--text-error);
                        background: transparent;
                        color: var(--text-error);
                        cursor: pointer;
                    `;
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.deleteTemplate(template);
                    });
                }

                templateItem.addEventListener('click', () => {
                    this.selectTemplate(template);
                    this.updateTemplateSelection();
                });
            });
        });

        // 新建模板按钮
        const newTemplateBtn = templateSection.createEl('button', { text: '+ 新建自定义模板' });
        newTemplateBtn.style.cssText = `
            width: 100%;
            padding: 12px;
            margin-top: 16px;
            border: 2px dashed var(--interactive-accent);
            background: transparent;
            color: var(--interactive-accent);
            border-radius: 6px;
            cursor: pointer;
        `;
        newTemplateBtn.addEventListener('click', () => this.createNewTemplate());
    }

    private createRightPanel(container: HTMLElement) {
        // 预览标题和控制
        const previewHeader = container.createDiv();
        previewHeader.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        `;

        previewHeader.createEl('h3', { text: '预览效果' });

        const refreshBtn = previewHeader.createEl('button', { text: '刷新预览' });
        refreshBtn.style.cssText = `
            padding: 6px 12px;
            border-radius: 4px;
            border: 1px solid var(--interactive-accent);
            background: var(--interactive-accent);
            color: white;
            cursor: pointer;
        `;
        refreshBtn.addEventListener('click', () => this.updatePreview());

        // 预览容器
        this.previewContainer = container.createDiv();
        this.previewContainer.style.cssText = `
            flex: 1;
            border: 1px solid var(--background-modifier-border);
            border-radius: 6px;
            overflow: hidden;
            background: #d5d5d5ff;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 20px;
        `;

        // 预览frame容器（用于控制宽度）
        const frameContainer = this.previewContainer.createDiv();
        frameContainer.style.cssText = `
            width: ${this.currentDeviceWidth};
            min-height: 400px;
            background: white;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            overflow: hidden;
            transition: width 0.3s ease;
        `;

        // 创建iframe
        this.previewFrame = frameContainer.createEl('iframe');
        this.previewFrame.style.cssText = `
            width: 100%;
            height: 600px;
            border: none;
            background: white;
        `;
    }

    private createBottomButtons(container: HTMLElement) {
        const buttonContainer = container.createDiv();
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid var(--background-modifier-border);
        `;

        const cancelBtn = buttonContainer.createEl('button', { text: '取消' });
        cancelBtn.style.cssText = `
            padding: 8px 16px;
            border-radius: 6px;
            border: 1px solid var(--background-modifier-border);
            background: transparent;
            cursor: pointer;
        `;
        cancelBtn.addEventListener('click', () => this.close());

        const confirmBtn = buttonContainer.createEl('button', { text: '确定使用此样式' });
        confirmBtn.style.cssText = `
            padding: 8px 16px;
            border-radius: 6px;
            border: none;
            background: var(--interactive-accent);
            color: white;
            cursor: pointer;
        `;
        confirmBtn.addEventListener('click', () => this.confirmSelection());
    }

    private selectTemplate(template: StyleTemplate) {
        this.selectedTemplate = template;
        this.updatePreview();
    }

    private selectDefaultTemplate() {
        // 查找标记为默认的模板
        const defaultTemplate = this.stylesConfig.templates.find(t => t.default === true);
        if (defaultTemplate) {
            this.selectTemplate(defaultTemplate);
            this.updateTemplateSelection();
        }
    }

    private updateTemplateSelection() {
        // 更新UI中的选中状态
        const templateItems = this.contentEl.querySelectorAll('[data-template-id]');
        templateItems.forEach((item: HTMLElement) => {
            item.style.backgroundColor = '';
            item.style.borderColor = 'var(--background-modifier-border)';
        });

        if (this.selectedTemplate) {
            const selectedItem = this.contentEl.querySelector(`[data-template-id="${this.selectedTemplate.id}"]`) as HTMLElement;
            if (selectedItem) {
                selectedItem.style.backgroundColor = 'var(--background-modifier-hover)';
                selectedItem.style.borderColor = 'var(--interactive-accent)';
            }
        }
    }

    private updatePreview() {
        if (!this.previewFrame || !this.selectedTemplate) return;

        try {
            // 读取选中的CSS文件
            const cssPath = path.join(this.cssDir, this.selectedTemplate.file);
            const cssContent = fs.readFileSync(cssPath, 'utf8');

            // 创建完整的HTML文档
            const previewHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        ${cssContent}
                    </style>
                </head>
                <body>
                    ${this.htmlContent}
                </body>
                </html>
            `;

            // 设置iframe内容
            this.previewFrame.srcdoc = previewHTML;

            // 更新设备宽度
            const frameContainer = this.previewFrame.parentElement;
            if (frameContainer) {
                frameContainer.style.width = this.currentDeviceWidth;
            }

        } catch (error) {
            console.error('更新预览失败:', error);
            new Notice('预览更新失败');
        }
    }

    private async confirmSelection() {
        if (!this.selectedTemplate) {
            new Notice('请先选择一个样式模板');
            return;
        }

        try {
            const cssPath = path.join(this.cssDir, this.selectedTemplate.file);
            const cssContent = fs.readFileSync(cssPath, 'utf8');
            this.onStyleSelected(cssContent);
            this.close();
        } catch (error) {
            console.error('读取CSS文件失败:', error);
            new Notice('读取样式文件失败');
        }
    }

    private createNewTemplate() {
        // 创建新模板对话框
        const modal = new CustomTemplateModal(this.app, (templateName: string) => {
            this.createTemplateFromBlank(templateName);
        });
        modal.open();
    }

    private createTemplateFromBlank(templateName: string) {
        try {
            // 生成新的模板ID
            const templateId = `custom_${Date.now()}`;
            const fileName = `${templateId}.css`;

            // 复制空白模板
            const blankPath = path.join(this.cssDir, 'blank.css');
            const newPath = path.join(this.cssDir, fileName);
            const blankContent = fs.readFileSync(blankPath, 'utf8');
            
            // 添加自定义注释
            const customContent = `/* 自定义模板: ${templateName} */\n/* 创建时间: ${new Date().toLocaleString()} */\n\n${blankContent}`;
            fs.writeFileSync(newPath, customContent, 'utf8');

            // 更新配置文件
            const newTemplate: StyleTemplate = {
                id: templateId,
                name: templateName,
                description: '用户自定义样式模板',
                file: fileName,
                category: '自定义',
                deletable: true,
                default: false
            };

            this.stylesConfig.templates.push(newTemplate);
            this.saveStylesConfig();

            new Notice(`模板 "${templateName}" 创建成功`);
            
            // 重新加载界面
            this.onOpen();

        } catch (error) {
            console.error('创建模板失败:', error);
            new Notice('创建模板失败');
        }
    }
    private setAsDefault(template: StyleTemplate) {
        // 将所有模板的default设为false
        this.stylesConfig.templates.forEach(t => t.default = false);
        
        // 设置选中的模板为默认
        template.default = true;
        
        // 保存配置
        this.saveStylesConfig();
        
        new Notice(`模板 "${template.name}" 已设为默认`);
        
        // 重新加载界面以更新UI
        this.onOpen();
    }

    private editTemplate(template: StyleTemplate) {
        const cssPath = path.join(this.cssDir, template.file);
        const cssEditor = new CssEditorModal(
            this.app,
            template.name,
            cssPath,
            () => {
                // 编辑完成后刷新预览
                if (this.selectedTemplate?.id === template.id) {
                    this.updatePreview();
                }
                new Notice(`模板 "${template.name}" 已更新`);
            }
        );
        cssEditor.open();
    }

    private deleteTemplate(template: StyleTemplate) {
        if (!template.deletable) {
            new Notice('该模板不可删除');
            return;
        }

        const confirmModal = new ConfirmDeleteModal(this.app, template.name, () => {
            try {
                // 删除CSS文件
                const cssPath = path.join(this.cssDir, template.file);
                if (fs.existsSync(cssPath)) {
                    fs.unlinkSync(cssPath);
                }

                // 从配置中移除
                this.stylesConfig.templates = this.stylesConfig.templates.filter(t => t.id !== template.id);
                this.saveStylesConfig();

                new Notice(`模板 "${template.name}" 已删除`);
                
                // 如果删除的是当前选中的模板，清除选择
                if (this.selectedTemplate?.id === template.id) {
                    this.selectedTemplate = null;
                }

                // 重新加载界面
                this.onOpen();

            } catch (error) {
                console.error('删除模板失败:', error);
                new Notice('删除模板失败');
            }
        });
        confirmModal.open();
    }

    private saveStylesConfig() {
        try {
            const configPath = path.join(this.cssDir, 'styles.json');
            fs.writeFileSync(configPath, JSON.stringify(this.stylesConfig, null, 2), 'utf8');
        } catch (error) {
            console.error('保存配置失败:', error);
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// 自定义模板名称输入模态框
class CustomTemplateModal extends Modal {
    constructor(app: App, private onSubmit: (name: string) => void) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: '创建自定义模板' });

        const inputContainer = contentEl.createDiv();
        inputContainer.style.margin = '1em 0';

        const label = inputContainer.createEl('label', { text: '请输入模板名称：' });
        label.style.display = 'block';
        label.style.marginBottom = '0.5em';

        const input = inputContainer.createEl('input', { type: 'text' });
        input.style.cssText = `
            width: 100%;
            padding: 8px;
            border: 1px solid var(--background-modifier-border);
            border-radius: 4px;
        `;

        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 1em;
        `;

        const cancelBtn = buttonContainer.createEl('button', { text: '取消' });
        const confirmBtn = buttonContainer.createEl('button', { text: '创建' });
        confirmBtn.classList.add('mod-cta');

        cancelBtn.onclick = () => this.close();
        confirmBtn.onclick = () => {
            const name = input.value.trim();
            if (name) {
                this.onSubmit(name);
                this.close();
            } else {
                new Notice('模板名称不能为空');
            }
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                confirmBtn.click();
            }
        });

        input.focus();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// 确认删除模态框
class ConfirmDeleteModal extends Modal {
    constructor(app: App, private templateName: string, private onConfirm: () => void) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: '确认删除' });
        contentEl.createEl('p', { text: `确定要删除模板 "${this.templateName}" 吗？此操作不可撤销。` });

        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 1em;
        `;

        const cancelBtn = buttonContainer.createEl('button', { text: '取消' });
        const confirmBtn = buttonContainer.createEl('button', { text: '删除' });
        confirmBtn.style.cssText = `
            background: var(--text-error);
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
        `;

        cancelBtn.onclick = () => this.close();
        confirmBtn.onclick = () => {
            this.onConfirm();
            this.close();
        };
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}