import { describe, it, expect, vi, beforeEach } from "vitest";
import { Notice } from "obsidian";
import { TranslationValidator } from "./validation";
import type HugoBlowfishExporter from "core/plugin";
import type { HugoBlowfishExporterSettings } from "types/settings";

vi.mock("obsidian", () => ({
	Notice: vi.fn(),
}));

const createMockPlugin = (
	settings: Partial<HugoBlowfishExporterSettings>
): HugoBlowfishExporter => {
	return {
		settings: {
			exportPath: "",
			exportPathWindows: "",
			exportPathLinux: "",
			imageExportPath: "",
			translatedExportPath: "",
			translatedExportPathWindows: "",
			translatedExportPathLinux: "",
			BaseURL: "",
			ApiKey: "",
			ModelName: "",
			directExportAfterTranslation: false,
			targetLanguage: "",
			translatedFilePrefix: "",
			blogPath: "",
			coverPath: "",
			useDefaultExportName: false,
			defaultExportName_zh_cn: "",
			defaultExportName_en: "",
			useDefaultDispName: false,
			defaultDispName_zh_cn: "",
			defaultDispName_en: "",
			...settings,
		},
	} as unknown as HugoBlowfishExporter;
};

describe("TranslationValidator", () => {
	let mockPlugin: HugoBlowfishExporter;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("validateConfiguration", () => {
		it("returns true when all required settings are present", () => {
			mockPlugin = createMockPlugin({
				ApiKey: "valid-api-key",
				BaseURL: "https://api.example.com/v1",
				ModelName: "gpt-4",
				translatedExportPath: "/path/to/export",
			});

			const validator = new TranslationValidator(mockPlugin);
			const result = validator.validateConfiguration();

			expect(result).toBe(true);
			expect(Notice).not.toHaveBeenCalled();
		});

		it("returns false when ApiKey is missing (empty string)", () => {
			mockPlugin = createMockPlugin({
				ApiKey: "",
				BaseURL: "https://api.example.com/v1",
				ModelName: "gpt-4",
				translatedExportPath: "/path/to/export",
			});

			const validator = new TranslationValidator(mockPlugin);
			const result = validator.validateConfiguration();

			expect(result).toBe(false);
			expect(Notice).toHaveBeenCalledWith("请先配置API密钥");
			expect(Notice).toHaveBeenCalledTimes(1);
		});

		it("returns false when ApiKey is undefined", () => {
			mockPlugin = createMockPlugin({
				BaseURL: "https://api.example.com/v1",
				ModelName: "gpt-4",
				translatedExportPath: "/path/to/export",
			});
			mockPlugin.settings.ApiKey = undefined as never;

			const validator = new TranslationValidator(mockPlugin);
			const result = validator.validateConfiguration();

			expect(result).toBe(false);
			expect(Notice).toHaveBeenCalledWith("请先配置API密钥");
		});

		it("returns false when BaseURL is missing", () => {
			mockPlugin = createMockPlugin({
				ApiKey: "valid-api-key",
				BaseURL: "",
				ModelName: "gpt-4",
				translatedExportPath: "/path/to/export",
			});

			const validator = new TranslationValidator(mockPlugin);
			const result = validator.validateConfiguration();

			expect(result).toBe(false);
			expect(Notice).toHaveBeenCalledWith("请先在设置中配置 base URL");
			expect(Notice).toHaveBeenCalledTimes(1);
		});

		it("returns false when BaseURL is undefined", () => {
			mockPlugin = createMockPlugin({
				ApiKey: "valid-api-key",
				BaseURL: undefined as never,
				ModelName: "gpt-4",
				translatedExportPath: "/path/to/export",
			});

			const validator = new TranslationValidator(mockPlugin);
			const result = validator.validateConfiguration();

			expect(result).toBe(false);
			expect(Notice).toHaveBeenCalledWith("请先在设置中配置 base URL");
		});

		it("returns false when ModelName is missing", () => {
			mockPlugin = createMockPlugin({
				ApiKey: "valid-api-key",
				BaseURL: "https://api.example.com/v1",
				ModelName: "",
				translatedExportPath: "/path/to/export",
			});

			const validator = new TranslationValidator(mockPlugin);
			const result = validator.validateConfiguration();

			expect(result).toBe(false);
			expect(Notice).toHaveBeenCalledWith("请先在设置中配置模型名称");
			expect(Notice).toHaveBeenCalledTimes(1);
		});

		it("returns false when ModelName is undefined", () => {
			mockPlugin = createMockPlugin({
				ApiKey: "valid-api-key",
				BaseURL: "https://api.example.com/v1",
				ModelName: undefined as never,
				translatedExportPath: "/path/to/export",
			});

			const validator = new TranslationValidator(mockPlugin);
			const result = validator.validateConfiguration();

			expect(result).toBe(false);
			expect(Notice).toHaveBeenCalledWith("请先在设置中配置模型名称");
		});

		it("returns false when translatedExportPath is missing", () => {
			mockPlugin = createMockPlugin({
				ApiKey: "valid-api-key",
				BaseURL: "https://api.example.com/v1",
				ModelName: "gpt-4",
				translatedExportPath: "",
			});

			const validator = new TranslationValidator(mockPlugin);
			const result = validator.validateConfiguration();

			expect(result).toBe(false);
			expect(Notice).toHaveBeenCalledWith(
				"请先在设置中配置翻译文件导出路径"
			);
			expect(Notice).toHaveBeenCalledTimes(1);
		});

		it("returns false when translatedExportPath is undefined", () => {
			mockPlugin = createMockPlugin({
				ApiKey: "valid-api-key",
				BaseURL: "https://api.example.com/v1",
				ModelName: "gpt-4",
				translatedExportPath: undefined as never,
			});

			const validator = new TranslationValidator(mockPlugin);
			const result = validator.validateConfiguration();

			expect(result).toBe(false);
			expect(Notice).toHaveBeenCalledWith(
				"请先在设置中配置翻译文件导出路径"
			);
		});

		it("returns false immediately on first missing setting (short-circuit)", () => {
			mockPlugin = createMockPlugin({
				ApiKey: "",
				BaseURL: "",
				ModelName: "",
				translatedExportPath: "",
			});

			const validator = new TranslationValidator(mockPlugin);
			const result = validator.validateConfiguration();

			expect(result).toBe(false);
			expect(Notice).toHaveBeenCalledTimes(1);
			expect(Notice).toHaveBeenCalledWith("请先配置API密钥");
		});

		it("returns false when ApiKey contains only whitespace", () => {
			mockPlugin = createMockPlugin({
				ApiKey: "   ",
				BaseURL: "https://api.example.com/v1",
				ModelName: "gpt-4",
				translatedExportPath: "/path/to/export",
			});

			const validator = new TranslationValidator(mockPlugin);
			const result = validator.validateConfiguration();

			expect(result).toBe(true);
		});

		it("shows only first error when multiple settings are missing", () => {
			mockPlugin = createMockPlugin({
				ApiKey: "",
				BaseURL: "",
				ModelName: "gpt-4",
				translatedExportPath: "/path/to/export",
			});

			const validator = new TranslationValidator(mockPlugin);
			const result = validator.validateConfiguration();

			expect(result).toBe(false);
			expect(Notice).toHaveBeenCalledTimes(1);
			expect(Notice).toHaveBeenCalledWith("请先配置API密钥");
		});
	});
});
