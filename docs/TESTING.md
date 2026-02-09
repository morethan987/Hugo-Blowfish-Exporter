# 测试编写指南

本文档介绍如何为 Hugo Blowfish Exporter 编写和维护单元测试。

## 目录

- [测试框架](#测试框架)
- [项目结构](#项目结构)
- [运行测试](#运行测试)
- [编写测试](#编写测试)
- [常用断言](#常用断言)
- [Mock 使用](#mock-使用)
- [测试模式](#测试模式)
- [最佳实践](#最佳实践)

---

## 测试框架

项目使用 [Vitest](https://vitest.dev/) 作为测试框架，主要优势：

- 与 Vite 生态兼容，支持 TypeScript 和 ESM
- API 与 Jest 兼容，学习成本低
- 速度快，支持 HMR 热更新
- 内置覆盖率报告

### 配置文件

```
vitest.config.ts    # Vitest 配置
tests/setup.ts      # 全局测试设置
tests/__mocks__/    # Mock 文件目录
```

---

## 项目结构

测试文件采用**就近放置**原则，与源文件在同一目录：

```
src/
├── utils.ts
├── utils.test.ts              # utils.ts 的测试
├── components/
│   ├── ast/
│   │   ├── parser.ts
│   │   ├── parser.test.ts     # parser.ts 的测试
│   │   ├── stringifier.ts
│   │   └── stringifier.test.ts
│   └── rules/
│       ├── utils.ts
│       ├── utils.test.ts
│       └── hugo_blowfish/
│           ├── math.ts
│           ├── math.test.ts
│           ├── callout.ts
│           └── callout.test.ts
```

**命名规范**: `{源文件名}.test.ts`

---

## 运行测试

> **⚠️ 重要：使用 `bun run test` 而不是 `bun test`**
>
> | 命令 | 实际执行 | 结果 |
> |------|----------|------|
> | `bun run test` | `vitest run`（读取 vitest.config.ts） | ✅ 正确 |
> | `bun test` | Bun 内置测试运行器（忽略 vitest.config.ts） | ❌ 错误 |
>
> **为什么 `bun test` 会失败？**
>
> `bun test` 使用 Bun 自带的测试框架，它：
> - 不读取 `vitest.config.ts` 配置
> - 不应用 `obsidian` 模块的 mock alias
> - 导致 `Cannot find package 'obsidian'` 错误
>
> 本项目使用 **Vitest** 作为测试框架，必须通过 `bun run test` 调用。

```bash
# ✅ 正确：运行所有测试
bun run test

# ❌ 错误：不要使用这个
# bun test

# 监听模式（文件变化自动重跑）
bun run test:watch

# 生成覆盖率报告
bun run test:coverage

# 运行特定测试文件
bunx vitest run src/utils.test.ts

# 运行匹配模式的测试
bunx vitest run --grep "parseMarkdown"
```

---

## 编写测试

### 基本结构

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "./myModule";

describe("myFunction", () => {
	it("should return expected value", () => {
		const result = myFunction("input");
		expect(result).toBe("expected");
	});
});
```

### 完整示例

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { parseMarkdown } from "./parser";
import { NodeType } from "./node";

describe("parseMarkdown", () => {
	// 分组测试：按功能分类
	describe("block-level parsing", () => {
		it("parses heading with correct level", () => {
			const result = parseMarkdown("## Heading");
			
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.Heading);
			expect(result.children![0]!.level).toBe(2);
		});

		it("parses code block with language", () => {
			const md = `\`\`\`python
print("Hello")
\`\`\``;
			const result = parseMarkdown(md);
			
			expect(result.children![0]!.type).toBe(NodeType.CodeBlock);
			expect(result.children![0]!.lang).toBe("python");
		});
	});

	describe("inline parsing", () => {
		it("parses bold text", () => {
			const result = parseMarkdown("**bold**");
			const paraNode = result.children![0]!;
			
			expect(paraNode.children![0]!.type).toBe(NodeType.Strong);
		});
	});
});
```

---

## 常用断言

### 基础断言

```typescript
// 相等性
expect(value).toBe(expected);           // 严格相等 ===
expect(value).toEqual(expected);        // 深度相等（对象/数组）
expect(value).not.toBe(unexpected);     // 取反

// 真值/假值
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// 数字
expect(num).toBeGreaterThan(3);
expect(num).toBeLessThanOrEqual(10);

// 字符串
expect(str).toContain("substring");
expect(str).toMatch(/regex/);

// 数组
expect(arr).toHaveLength(3);
expect(arr).toContain(item);
expect(arr).toContainEqual({ id: 1 });  // 深度匹配

// 对象
expect(obj).toHaveProperty("key");
expect(obj).toHaveProperty("nested.key", "value");
expect(obj).toMatchObject({ partial: "match" });

// 异常
expect(() => throwingFn()).toThrow();
expect(() => throwingFn()).toThrow("error message");
expect(() => throwingFn()).toThrow(ErrorClass);
```

### 类型断言

使用 TypeScript 类型断言确保类型安全：

```typescript
import { TableNode, WikiLinkNode, FootnoteDefNode } from "./node";

// 使用类型断言访问特定属性
const tableNode = result.children![0]! as TableNode;
expect(tableNode.align).toContain("left");

// 带扩展属性的类型
const linkNode = node as WikiLinkNode & { heading?: string };
expect(linkNode.heading).toBe("heading");
```

---

## Mock 使用

### Obsidian API Mock

项目已提供完整的 Obsidian API Mock，位于 `tests/__mocks__/obsidian.ts`：

```typescript
// 测试中使用 Mock 的 Obsidian 类
import { TFile, Vault, App } from "obsidian";

// 创建 mock 文件
const mockFile = new TFile();
mockFile.path = "test/file.md";
mockFile.basename = "file";
mockFile.extension = "md";
```

### 函数 Mock

```typescript
import { vi } from "vitest";

// Mock 函数
const mockFn = vi.fn();
mockFn.mockReturnValue("mocked value");
mockFn.mockResolvedValue("async value");  // Promise

// 验证调用
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn).toHaveBeenCalledWith("arg1", "arg2");

// Mock 实现
mockFn.mockImplementation((x) => x * 2);
```

### 模块 Mock

```typescript
import { vi } from "vitest";

// Mock 整个模块
vi.mock("./someModule", () => ({
	someFunction: vi.fn(() => "mocked"),
}));

// 部分 Mock
vi.mock("./someModule", async () => {
	const actual = await vi.importActual("./someModule");
	return {
		...actual,
		specificFunction: vi.fn(),
	};
});
```

---

## 测试模式

### 1. 纯函数测试

最简单的测试类型，输入 → 输出：

```typescript
describe("escapeHTML", () => {
	it("escapes angle brackets", () => {
		expect(escapeHTML("<div>")).toBe("&lt;div&gt;");
	});

	it("escapes ampersand", () => {
		expect(escapeHTML("a & b")).toBe("a &amp; b");
	});

	it("returns empty string for empty input", () => {
		expect(escapeHTML("")).toBe("");
	});
});
```

### 2. AST 转换测试

测试 Markdown 解析和转换：

```typescript
describe("parseMarkdown", () => {
	it("parses callout with type", () => {
		const md = `> [!note] Title
> Content`;
		const result = parseMarkdown(md);
		
		expect(result.children![0]!.type).toBe(NodeType.Callout);
		expect(result.children![0]!.calloutType).toBe("note");
	});
});
```

### 3. 规则匹配测试

测试 AST 规则的条件匹配：

```typescript
describe("RuleBuilder", () => {
	it("matches specified node type", () => {
		const rule = new RuleBuilder("test")
			.matchType(NodeType.Heading)
			.setProperty("processed", true)
			.build();

		expect(rule.condition.matchType).toBe(NodeType.Heading);
	});
});
```

### 4. 边界条件测试

```typescript
describe("hasMathNode", () => {
	it("returns false for null node", () => {
		expect(hasMathNode(null)).toBe(false);
	});

	it("returns false for undefined node", () => {
		expect(hasMathNode(undefined)).toBe(false);
	});

	it("returns false for empty children array", () => {
		expect(hasMathNode({ type: NodeType.Document, children: [] })).toBe(false);
	});
});
```

### 5. 参数化测试

使用 `it.each` 批量测试：

```typescript
describe("getCalloutAttributes", () => {
	it.each([
		["note", "pencil"],
		["info", "circle-info"],
		["warning", "triangle-exclamation"],
		["danger", "fire"],
	])("type '%s' returns icon '%s'", (type, expectedIcon) => {
		const result = getCalloutAttributes(type);
		expect(result).toContain(expectedIcon);
	});
});
```

---

## 最佳实践

### 1. 测试命名

使用描述性名称，说明「做什么」和「期望什么」：

```typescript
// Good
it("returns empty string when input is null")
it("parses heading with correct level")
it("throws error when API key is missing")

// Bad
it("test1")
it("works")
it("should work correctly")
```

### 2. AAA 模式

遵循 Arrange-Act-Assert 结构：

```typescript
it("parses wiki link with alias", () => {
	// Arrange: 准备数据
	const md = "[[file|alias]]";
	
	// Act: 执行操作
	const result = parseMarkdown(md);
	const linkNode = result.children![0]!.children![0]! as WikiLinkNode;
	
	// Assert: 验证结果
	expect(linkNode.type).toBe(NodeType.WikiLink);
	expect(linkNode.alias).toBe("alias");
});
```

### 3. 单一职责

每个测试只验证一个行为：

```typescript
// Good: 分开测试
it("parses heading type correctly", () => { ... });
it("parses heading level correctly", () => { ... });

// Bad: 测试太多东西
it("parses heading", () => {
	// 验证类型、级别、内容、子节点...太多了
});
```

### 4. 避免测试实现细节

测试行为，不测试内部实现：

```typescript
// Good: 测试结果
it("transforms markdown to HTML", () => {
	const result = astToHtml(node);
	expect(result).toContain("<h1>");
});

// Bad: 测试内部调用
it("calls internal helper function", () => {
	// 不要测试私有方法是否被调用
});
```

### 5. 类型安全

避免 `as any`，使用正确的类型：

```typescript
// Good: 使用具体类型
const tableNode = result.children![0]! as TableNode;
expect(tableNode.align).toContain("left");

// Bad: 使用 any
const node = result.children![0]! as any;
expect(node.align).toContain("left");
```

### 6. 测试覆盖

优先测试：
1. 核心业务逻辑（AST 解析、转换）
2. 边界条件（空值、异常输入）
3. 错误处理路径
4. 复杂条件分支

不需要测试：
1. 简单的 getter/setter
2. 外部库的功能
3. UI 组件（需要 Obsidian 运行时）

---

## 添加新测试检查清单

1. [ ] 在源文件同目录创建 `{name}.test.ts`
2. [ ] 导入 `describe, it, expect` from `vitest`
3. [ ] 导入要测试的函数/类
4. [ ] 使用 `describe` 分组相关测试
5. [ ] 编写测试用例，覆盖正常和边界情况
6. [ ] 运行 `bun run test` 确保通过
7. [ ] 运行 `bun run lint` 确保无错误
8. [ ] 考虑添加到 CI 流程（如适用）

---

## 常见问题

### Q: 如何测试需要 Obsidian API 的代码？

使用 `tests/__mocks__/obsidian.ts` 提供的 Mock。如果需要新的 Mock，在该文件中添加。

### Q: 测试报错找不到模块？

检查 `vitest.config.ts` 中的路径别名配置是否正确。

### Q: 如何调试测试？

```bash
# 使用 --reporter=verbose 查看详细输出
bunx vitest run --reporter=verbose

# 只运行特定测试
bunx vitest run -t "test name pattern"
```

### Q: 覆盖率不够怎么办？

运行 `bun run test:coverage` 查看覆盖率报告，识别未覆盖的代码路径，添加相应测试。

---

## 参考资源

- [Vitest 官方文档](https://vitest.dev/)
- [Vitest API 参考](https://vitest.dev/api/)
- [Testing Library 最佳实践](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
