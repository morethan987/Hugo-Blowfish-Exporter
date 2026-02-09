# AGENTS.md - Hugo Blowfish Exporter

> Instructions for AI coding agents working in this repository.

## Project Overview

Obsidian plugin for exporting notes to Hugo Blowfish format with AI translation and Git integration.

**Tech Stack**: TypeScript, Obsidian API, OpenAI API, esbuild

## Build Commands

```bash
# Development build (watch mode)
bun run dev

# Production build (type check + bundle)
bun run build

# Lint all files
bun run lint

# Run parser tests
bun run test_parser

# Run AST tests
bun run test
```

## Code Quality Checks

### CRITICAL: Two-Layer Verification Required

**Layer 1: TypeScript Type Checking (LSP)**
- Use `lsp_diagnostics` tool to check TypeScript errors
- This catches: type errors, syntax errors, missing imports

**Layer 2: ESLint Rules**
- Run `bun run lint` to check ESLint errors
- This catches: Obsidian-specific rules, code style violations, unused variables

> **WARNING**: LSP diagnostics alone are NOT sufficient! This project uses `eslint-plugin-obsidianmd` 
> with Obsidian-specific rules that LSP cannot detect. ALWAYS run both checks.

### Obsidian-Specific ESLint Rules

The project uses `eslint-plugin-obsidianmd` with strict rules:

| Rule | Description |
|------|-------------|
| `no-manual-html-headings` | Use `Setting.setHeading()` instead of `containerEl.createEl("h1")` |
| `no-static-styles-assignment` | Use CSS classes, not inline `element.style.X` |
| `no-plugin-as-component` | Don't pass `new Component()` directly |

**Example Fix**:
```typescript
// BAD
containerEl.createEl("h1", { text: "Settings" });

// GOOD
new Setting(containerEl).setName("Settings").setHeading();
```

## Project Structure

```
src/
├── main.ts                    # Plugin entry point
├── core/
│   ├── plugin.ts              # Main plugin class (HugoBlowfishExporter)
│   ├── exporter.ts            # Content export logic
│   ├── translator.ts          # AI translation handler
│   └── git-handler.ts         # Git integration
├── types/
│   └── settings.ts            # TypeScript interfaces
├── config/
│   └── default-settings.ts    # Default configuration
├── modals/                    # UI modal components
│   ├── index.ts               # Barrel export file
│   ├── settingsTab.ts         # Settings tab UI
│   └── *.ts                   # Various modal dialogs
├── components/
│   ├── ast/                   # Markdown AST parser/stringifier
│   ├── rules/                 # Export rules by target format
│   │   ├── hugo_blowfish/     # Hugo Blowfish export rules
│   │   └── wechat_post/       # WeChat export rules
│   └── translators/           # Translation utilities
└── utils.ts                   # Shared utilities
```

## Code Style Guidelines

### Imports

- Use path aliases from `src/` baseUrl (configured in tsconfig.json)
- Order: external packages -> internal modules -> relative imports
- Use barrel exports via `index.ts` files

```typescript
// External
import { App, Plugin, Platform } from "obsidian";
import OpenAI from "openai";

// Internal (path alias)
import { HugoBlowfishExporterSettings } from "types/settings";
import { DEFAULT_SETTINGS } from "config/default-settings";
import { ApiKeyModal } from "modals";  // barrel export

// Relative
import { Exporter } from "./exporter";
```

### TypeScript

- **Strict mode enabled**: `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`
- **NO type suppressions**: Never use `as any`, `@ts-ignore`, `@ts-expect-error`
- Define interfaces in `src/types/` directory
- Use explicit return types for public methods

```typescript
// Interface definition
export interface HugoBlowfishExporterSettings {
    exportPath: string;           // 导出路径配置
    exportPathWindows: string;    // Windows系统下的content目录绝对路径
    // ...
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `HugoBlowfishExporter`, `GitHandler` |
| Interfaces | PascalCase | `HugoBlowfishExporterSettings` |
| Methods/Functions | camelCase | `exportCurrentNote`, `translateDifference` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_SETTINGS` |
| Files | kebab-case or camelCase | `git-handler.ts`, `settingsTab.ts` |

### Formatting

- Tabs for indentation (not spaces)
- Trailing commas in multiline arrays/objects
- Double quotes for strings (except in JSX)

### Error Handling

- Always handle Promise rejections
- Use try-catch for async operations
- Provide user feedback via Obsidian's `Notice` API

```typescript
try {
    await this.saveSettings();
} catch (error) {
    new Notice("Failed to save settings");
    console.error("Settings save error:", error);
}
```

### UI Components (Modals)

- Extend Obsidian's `Modal` class
- Use `Setting` API for consistent UI
- **NEVER** use inline styles - use CSS classes

```typescript
// WRONG - will trigger ESLint error
buttonContainer.style.display = "flex";

// RIGHT - use CSS classes
buttonContainer.addClass("button-container");
```

### Comments

- Use Chinese comments for business logic (project convention)
- Use English for technical comments
- Keep comments concise

```typescript
// 检测操作系统变化
if (Platform.isWin) {
    this.currentOS = "Windows";
}
```

## Testing

No formal test framework. Manual testing via:

```bash
# Run AST parser tests
bun run test

# Test in Obsidian sandbox with exampleVault/
```

## Git Workflow

- Commit messages in English
- Keep commits atomic and focused
- Test build before committing: `bun run build`

## Dependencies

**Runtime**:
- `obsidian` - Obsidian plugin API
- `openai` - AI translation
- `juice` - CSS inlining
- `mathjax-full` - Math rendering

**Dev**:
- `typescript` - Type checking
- `esbuild` - Bundling
- `eslint` + `eslint-plugin-obsidianmd` - Linting
