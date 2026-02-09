/**
 * Obsidian API mocks for unit testing
 * 
 * This file provides mock implementations of commonly used Obsidian API classes
 * for testing plugin code without the Obsidian runtime environment.
 */

import { vi } from "vitest";

// ============================================================================
// Core Types
// ============================================================================

export class TFile {
	path: string;
	name: string;
	basename: string;
	extension: string;
	stat: { ctime: number; mtime: number; size: number };

	constructor(path: string) {
		this.path = path;
		const parts = path.split("/");
		this.name = parts[parts.length - 1] ?? "";
		const nameParts = this.name.split(".");
		this.extension = nameParts.length > 1 ? (nameParts.pop() ?? "") : "";
		this.basename = nameParts.join(".");
		this.stat = {
			ctime: Date.now(),
			mtime: Date.now(),
			size: 0,
		};
	}
}

export class TFolder {
	path: string;
	name: string;
	children: (TFile | TFolder)[] = [];

	constructor(path: string) {
		this.path = path;
		const parts = path.split("/");
		this.name = parts[parts.length - 1] ?? "";
	}
}

export type TAbstractFile = TFile | TFolder;

// ============================================================================
// Vault Mock
// ============================================================================

export class Vault {
	private files = new Map<string, string>();

	async create(path: string, content: string): Promise<TFile> {
		this.files.set(path, content);
		const file = new TFile(path);
		file.stat.size = content.length;
		return file;
	}

	async read(file: TFile): Promise<string> {
		return this.files.get(file.path) ?? "";
	}

	async modify(file: TFile, content: string): Promise<void> {
		this.files.set(file.path, content);
		file.stat.mtime = Date.now();
		file.stat.size = content.length;
	}

	async delete(file: TFile): Promise<void> {
		this.files.delete(file.path);
	}

	async rename(file: TFile, newPath: string): Promise<void> {
		const content = this.files.get(file.path) ?? "";
		this.files.delete(file.path);
		this.files.set(newPath, content);
		file.path = newPath;
	}

	getAbstractFileByPath(path: string): TAbstractFile | null {
		if (this.files.has(path)) {
			return new TFile(path);
		}
		return null;
	}

	getMarkdownFiles(): TFile[] {
		return Array.from(this.files.keys())
			.filter((path) => path.endsWith(".md"))
			.map((path) => new TFile(path));
	}

	adapter = {
		exists: vi.fn(async (path: string) => this.files.has(path)),
		read: vi.fn(async (path: string) => this.files.get(path) ?? ""),
		write: vi.fn(async (path: string, content: string) => {
			this.files.set(path, content);
		}),
		mkdir: vi.fn(async () => {}),
		remove: vi.fn(async (path: string) => {
			this.files.delete(path);
		}),
	};

	// Test helper methods
	_setFile(path: string, content: string): void {
		this.files.set(path, content);
	}

	_clear(): void {
		this.files.clear();
	}
}

// ============================================================================
// MetadataCache Mock
// ============================================================================

export interface CachedMetadata {
	frontmatter?: Record<string, unknown>;
	headings?: Array<{ heading: string; level: number; position: { start: { line: number } } }>;
	links?: Array<{ link: string; displayText?: string }>;
	embeds?: Array<{ link: string }>;
}

export class MetadataCache {
	private cache = new Map<string, CachedMetadata>();

	getFileCache(file: TFile): CachedMetadata | null {
		return this.cache.get(file.path) ?? { frontmatter: {} };
	}

	getFirstLinkpathDest(linkpath: string, sourcePath: string): TFile | null {
		return null;
	}

	// Test helper
	_setCache(path: string, metadata: CachedMetadata): void {
		this.cache.set(path, metadata);
	}
}

// ============================================================================
// Workspace Mock
// ============================================================================

export class Workspace {
	private activeFile: TFile | null = null;

	getActiveFile(): TFile | null {
		return this.activeFile;
	}

	// Test helper
	_setActiveFile(file: TFile | null): void {
		this.activeFile = file;
	}
}

// ============================================================================
// App Mock
// ============================================================================

export class App {
	vault = new Vault();
	metadataCache = new MetadataCache();
	workspace = new Workspace();
}

// ============================================================================
// Plugin Base Class
// ============================================================================

export abstract class Plugin {
	app: App;
	manifest: { id: string; name: string; version: string };

	constructor(app: App, manifest: { id: string; name: string; version: string }) {
		this.app = app;
		this.manifest = manifest;
	}

	async loadData(): Promise<unknown> {
		return {};
	}

	async saveData(data: unknown): Promise<void> {}

	addCommand(command: {
		id: string;
		name: string;
		callback?: () => void;
		checkCallback?: (checking: boolean) => boolean | void;
	}): void {}

	addRibbonIcon(icon: string, title: string, callback: () => void): void {}

	addSettingTab(tab: unknown): void {}

	registerEvent(event: unknown): void {}
}

// ============================================================================
// UI Components
// ============================================================================

export class Notice {
	constructor(message: string, timeout?: number) {
		// Mock implementation - does nothing in tests
	}
}

export class Modal {
	app: App;
	containerEl: HTMLElement;

	constructor(app: App) {
		this.app = app;
		this.containerEl = document.createElement("div");
	}

	open(): void {}
	close(): void {}
	onOpen(): void {}
	onClose(): void {}
}

export class Setting {
	private containerEl: HTMLElement;

	constructor(containerEl: HTMLElement) {
		this.containerEl = containerEl;
	}

	setName(name: string): this {
		return this;
	}

	setDesc(desc: string): this {
		return this;
	}

	setHeading(): this {
		return this;
	}

	addText(cb: (text: TextComponent) => void): this {
		cb(new TextComponent(document.createElement("input")));
		return this;
	}

	addToggle(cb: (toggle: ToggleComponent) => void): this {
		cb(new ToggleComponent(document.createElement("input")));
		return this;
	}

	addDropdown(cb: (dropdown: DropdownComponent) => void): this {
		cb(new DropdownComponent(document.createElement("select")));
		return this;
	}

	addButton(cb: (button: ButtonComponent) => void): this {
		cb(new ButtonComponent(document.createElement("button")));
		return this;
	}
}

export class TextComponent {
	inputEl: HTMLInputElement;
	private value = "";

	constructor(inputEl: HTMLInputElement) {
		this.inputEl = inputEl;
	}

	setValue(value: string): this {
		this.value = value;
		return this;
	}

	getValue(): string {
		return this.value;
	}

	setPlaceholder(placeholder: string): this {
		return this;
	}

	onChange(callback: (value: string) => void): this {
		return this;
	}
}

export class ToggleComponent {
	toggleEl: HTMLInputElement;
	private value = false;

	constructor(toggleEl: HTMLInputElement) {
		this.toggleEl = toggleEl;
	}

	setValue(value: boolean): this {
		this.value = value;
		return this;
	}

	getValue(): boolean {
		return this.value;
	}

	onChange(callback: (value: boolean) => void): this {
		return this;
	}
}

export class DropdownComponent {
	selectEl: HTMLSelectElement;
	private value = "";

	constructor(selectEl: HTMLSelectElement) {
		this.selectEl = selectEl;
	}

	addOption(value: string, display: string): this {
		return this;
	}

	setValue(value: string): this {
		this.value = value;
		return this;
	}

	getValue(): string {
		return this.value;
	}

	onChange(callback: (value: string) => void): this {
		return this;
	}
}

export class ButtonComponent {
	buttonEl: HTMLButtonElement;

	constructor(buttonEl: HTMLButtonElement) {
		this.buttonEl = buttonEl;
	}

	setButtonText(text: string): this {
		return this;
	}

	setCta(): this {
		return this;
	}

	setWarning(): this {
		return this;
	}

	onClick(callback: () => void): this {
		return this;
	}
}

export class PluginSettingTab {
	app: App;
	containerEl: HTMLElement;

	constructor(app: App, plugin: Plugin) {
		this.app = app;
		this.containerEl = document.createElement("div");
	}

	display(): void {}
	hide(): void {}
}

// ============================================================================
// Utilities
// ============================================================================

export const Platform = {
	isWin: false,
	isMacOS: false,
	isLinux: true,
	isMobile: false,
	isDesktop: true,
	isDesktopApp: true,
};

export function normalizePath(path: string): string {
	return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

// ============================================================================
// Export everything for convenient importing
// ============================================================================

export default {
	App,
	Plugin,
	TFile,
	TFolder,
	Vault,
	MetadataCache,
	Workspace,
	Notice,
	Modal,
	Setting,
	TextComponent,
	ToggleComponent,
	DropdownComponent,
	ButtonComponent,
	PluginSettingTab,
	Platform,
	normalizePath,
};
