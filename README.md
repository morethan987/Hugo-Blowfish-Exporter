# Hugo Blowfish Exporter

A comprehensive Obsidian plugin for exporting and translating notes to Hugo Blowfish format with AI-powered translation and Git integration.

Transform your Obsidian vault into a beautiful Hugo website with just a few clicks! This plugin not only converts your markdown files but also provides intelligent translation capabilities and seamless Git workflow integration.

> **Note**: While [Quartz](https://github.com/jackyzha0/quartz) offers excellent functionality, this plugin provides specialized support for Hugo Blowfish users with unique features like AI translation and Git integration.

## Table of Contents

- [概述 (Chinese)](#概述-chinese)
  - [主要功能](#主要功能)
  - [安装与配置](#安装与配置)
  - [使用方法](#使用方法)
  - [注意事项](#注意事项)
  - [样例仓库](#样例仓库)
- [Summary (English)](#summary-english)
  - [Main Features](#main-features)
  - [Installation & Configuration](#installation--configuration)
  - [How to Use](#how-to-use)
  - [Important Notes](#important-notes)
  - [Example Vault](#example-vault)
- [Technical Specifications](#technical-specifications)
- [Contributing](#contributing)

---

## 概述 (Chinese)

这是一个功能丰富的 Obsidian 插件，专为 [Blowfish](https://blowfish.page/) 主题设计，提供完整的导出、翻译和版本控制解决方案。

### 主要功能

#### 📝 内容导出
- **Callout 转换**：支持所有官方 callout 类型
- **数学公式**：内联和块级数学公式转换
- **Mermaid 图表**：完整的图表支持
- **图片处理**：自动导出图片和封面图片管理
- **Wiki 链接**：智能链接转换，支持段落和全文引用

#### 🌐 AI 翻译功能
- **多语言翻译**：基于 OpenAI API 的智能翻译
- **自定义模型**：支持配置不同的 AI 模型（如 DeepSeek）
- **翻译后导出**：翻译完成后可直接导出到指定路径
- **翻译文件管理**：支持翻译文件前缀和路径配置

#### 🔧 Git 集成
- **差异查看**：类似 `git diff` 的文件变更预览
- **一键提交**：支持提交信息输入和推送到远程仓库
- **版本控制**：完整的 Git 工作流集成

#### 🖥️ 跨平台支持
- **多系统兼容**：支持 Windows 和 Linux 路径配置
- **灵活配置**：可根据操作系统切换不同的导出路径

### 安装与配置

#### 基础设置

1. **导出路径配置**
   - 设置 Hugo 项目的 `content` 文件夹绝对路径
   - 支持 Windows 和 Linux 分别配置
   - 在设置中选择当前操作系统

2. **博客路径设置**
   - 配置博客文章在 `content` 文件夹下的相对路径
   - 例如：设置为 `posts` 表示文章存储在 `content/posts` 中

3. **图片和封面配置**
   - 图片导出路径：如 `img`
   - 封面路径：如 `.featured`（用于存放 background.svg 等封面文件）

#### AI 翻译配置

1. **API 设置**
   - Base URL：如 `https://api.deepseek.com/v1`
   - API 密钥：在环境变量 `API_KEY` 中设置
   - 模型名称：如 `deepseek-chat`

2. **翻译选项**
   - 目标语言：如 "英文"、"中文" 等
   - 翻译文件前缀：可选的文件名前缀
   - 翻译后自动导出：启用后翻译完成自动导出

### 使用方法

#### 可用命令

1. **导出当前笔记** (`Ctrl/Cmd + P` → `hugo`)
   - `Export current note to Hugo Blowfish`

2. **翻译当前笔记**
   - `Translate current note to the other language`

3. **查看文件差异**
   - `Show the diff of export result`

4. **提交并推送**
   - `Commit and push to the remote repository`

#### 快捷操作

- **批量导出**：点击侧边栏的导出按钮
- **Git 工作流**：使用差异查看确认更改，然后一键提交推送

### 注意事项

#### Wiki 链接处理
- Wiki 链接导出依赖于元数据 `slug`，表示包含引用文件的文件夹名称
- 例如：文件的 `slug` 设置为 `pytips`，则网站 `content` 文件夹中应有 `pytips` 文件夹
- 支持非展示性的段落和全文引用；展示性链接仅支持全文引用
- 建议避免过度使用展示性引用，以防循环嵌套影响渲染效果

#### AI 翻译注意事项
- 确保 API 密钥已正确设置在环境变量中
- 翻译功能需要网络连接
- 不同模型的翻译质量和速度可能有差异

#### Git 集成要求
- 导出路径必须是 Git 仓库的一部分
- 确保有适当的 Git 权限进行提交和推送

### 样例仓库
项目包含一个 [`exampleVault`](./exampleVault) 示例库，包含中文测试文件，可用于在 Obsidian 沙箱环境中测试插件功能。

---

## Summary (English)

A comprehensive Obsidian plugin designed specifically for the [Blowfish](https://blowfish.page/) theme, providing complete export, translation, and version control solutions.

### Main Features

#### 📝 Content Export
- **Callout Conversion**: Supports all official callout types
- **Math Formulas**: Inline and block-level math formula conversion
- **Mermaid Diagrams**: Complete diagram support
- **Image Processing**: Automatic image export and cover image management
- **Wiki Links**: Smart link conversion with paragraph and full-text reference support

#### 🌐 AI Translation
- **Multi-language Translation**: Intelligent translation powered by OpenAI API
- **Custom Models**: Support for different AI models (e.g., DeepSeek)
- **Post-translation Export**: Direct export after translation completion
- **Translation File Management**: Support for translation file prefixes and path configuration

#### 🔧 Git Integration
- **Diff Viewing**: File change preview similar to `git diff`
- **One-click Commit**: Support for commit message input and push to remote repository
- **Version Control**: Complete Git workflow integration

#### 🖥️ Cross-platform Support
- **Multi-system Compatibility**: Support for Windows and Linux path configuration
- **Flexible Configuration**: Switch between different export paths based on operating system

### Installation & Configuration

#### Basic Settings

1. **Export Path Configuration**
   - Set the absolute path to your Hugo project's `content` folder
   - Support separate configuration for Windows and Linux
   - Select your current operating system in settings

2. **Blog Path Settings**
   - Configure the relative path for blog posts within the `content` folder
   - Example: Set to `posts` means articles are stored in `content/posts`

3. **Image and Cover Configuration**
   - Image export path: e.g., `img`
   - Cover path: e.g., `.featured` (for storing background.svg and other cover files)

#### AI Translation Configuration

1. **API Settings**
   - Base URL: e.g., `https://api.deepseek.com/v1`
   - API Key: Set in environment variable `API_KEY`
   - Model Name: e.g., `deepseek-chat`

2. **Translation Options**
   - Target Language: e.g., "English", "Chinese", etc.
   - Translation File Prefix: Optional filename prefix
   - Auto-export After Translation: Enable to automatically export after translation

### How to Use

#### Available Commands

1. **Export Current Note** (`Ctrl/Cmd + P` → `hugo`)
   - `Export current note to Hugo Blowfish`

2. **Translate Current Note**
   - `Translate current note to the other language`

3. **Show File Differences**
   - `Show the diff of export result`

4. **Commit and Push**
   - `Commit and push to the remote repository`

#### Quick Operations

- **Batch Export**: Click the export button in the sidebar
- **Git Workflow**: Use diff view to confirm changes, then one-click commit and push

### Important Notes

#### Wiki Link Processing
- Wiki link export relies on the `slug` metadata, representing the folder name containing the referenced file
- Example: If a file's `slug` is set to `pytips`, there should be a `pytips` folder in the website's `content` folder
- Supports non-display paragraph and full-text references; display links only support full-text references
- Avoid excessive use of display references to prevent circular nesting affecting rendering

#### AI Translation Notes
- Ensure API key is properly set in environment variables
- Translation functionality requires network connection
- Different models may have varying translation quality and speed

#### Git Integration Requirements
- Export path must be part of a Git repository
- Ensure appropriate Git permissions for committing and pushing

### Example Vault
The project includes an [`exampleVault`](./exampleVault) with Chinese test files that can be used to test plugin functionality in Obsidian's sandbox environment.

---

## Technical Specifications

### Dependencies
- **OpenAI**: `^4.87.3` - For AI translation functionality
- **Obsidian API**: Latest - Core plugin framework
- **Node.js**: Built-in modules for file system and child process operations

### File Structure
```text
src/
├── core/
│   ├── plugin.ts          # Main plugin file
│   ├── translator.ts      # AI translation handler
│   └── git-handler.ts     # Git integration
├── config/
│   └── default-settings.ts # Default configuration
├── types/
│   └── settings.ts        # TypeScript interfaces
├── exporters/             # Content conversion modules
│   ├── calloutExporter.ts
│   ├── imageExporter.ts
│   ├── mathExporter.ts
│   ├── mermaidExporter.ts
│   ├── wikiLinkExporter.ts
│   └── coverChooser.ts
└── utils/                 # UI components and modals
    ├── settingsTab.ts
    ├── gitDiffModal.ts
    ├── gitCommitModal.ts
    └── ...
```

### Version Information
- **Current Version**: 2.5.0
- **Minimum Obsidian Version**: 0.15.0
- **Platform Support**: Desktop only (Windows, Linux)

---

## Contributing

We welcome contributions to improve the Hugo Blowfish Exporter! Here's how you can help:

### Development Setup
1. Clone the repository
```bash
git clone https://github.com/morethan987/Hugo-Blowfish-Exporter.git
cd Hugo-Blowfish-Exporter
```

2. Install dependencies
```bash
npm install
```

3. Build the plugin
```bash
npm run build
```

4. Copy to your Obsidian plugins folder for testing

### Areas for Contribution
- **New Export Features**: Additional Obsidian syntax support
- **Translation Improvements**: Support for more AI providers
- **UI Enhancements**: Better user experience and error handling
- **Documentation**: Translations, examples, and tutorials

### Code Guidelines
- Follow TypeScript best practices
- Maintain compatibility with Obsidian API
- Add appropriate error handling and user feedback
- Update documentation for new features

> If you create improvements, we'd be grateful if you share them with the community! 🫡
