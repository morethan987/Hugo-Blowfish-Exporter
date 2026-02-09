import { describe, it, expect } from "vitest";
import { RuleExecutor, createExecutor, transformAST, ChainExecutor } from "./executor";
import { RuleBuilder } from "./rule";
import { NodeType, MarkdownNode } from "./node";
import type { RuleContext } from "./rule";

/* ────────────────────────────────────────────────────────────────────────────
 * Test Fixtures
 * ──────────────────────────────────────────────────────────────────────────── */

const createParagraphNode = (text: string = "test"): MarkdownNode => ({
	type: NodeType.Paragraph,
	children: [{ type: NodeType.Text, value: text }],
});

const createDocumentNode = (children: MarkdownNode[] = []): MarkdownNode => ({
	type: NodeType.Document,
	children,
});

const createHeadingNode = (level: number = 1, text: string = "title"): MarkdownNode => ({
	type: NodeType.Heading,
	level,
	children: [{ type: NodeType.Text, value: text }],
});

/* ────────────────────────────────────────────────────────────────────────────
 * RuleExecutor Construction Tests
 * ──────────────────────────────────────────────────────────────────────────── */

describe("RuleExecutor", () => {
	describe("Construction", () => {
		it("creates executor with default context", () => {
			const executor = new RuleExecutor();
			expect(executor).toBeDefined();
			const stats = executor.getStats();
			expect(stats.totalRules).toBe(0);
		});

		it("creates executor with custom context", () => {
			const customContext: RuleContext = {
				path: [0, 1],
				data: { custom: "data" },
				root: createDocumentNode(),
			};
			const executor = new RuleExecutor(customContext);
			expect(executor).toBeDefined();
		});

		it("addRule adds a rule and returns this for chaining", () => {
			const executor = new RuleExecutor();
			const rule = new RuleBuilder("test")
				.matchType(NodeType.Paragraph)
				.transform(async (node) => node)
				.build();
			const result = executor.addRule(rule);
			expect(result).toBe(executor);
			expect(executor.getRules().length).toBe(1);
		});

		it("addRules adds multiple rules at once", () => {
			const executor = new RuleExecutor();
			const rule1 = new RuleBuilder("rule1")
				.matchType(NodeType.Paragraph)
				.transform(async (node) => node)
				.build();
			const rule2 = new RuleBuilder("rule2")
				.matchType(NodeType.Heading)
				.transform(async (node) => node)
				.build();
			executor.addRules([rule1, rule2]);
			expect(executor.getRules().length).toBe(2);
		});

		it("clearRules removes all rules and returns this", () => {
			const executor = new RuleExecutor();
			executor.addRule(
				new RuleBuilder("rule1")
					.matchType(NodeType.Paragraph)
					.transform(async (node) => node)
					.build()
			);
			executor.addRule(
				new RuleBuilder("rule2")
					.matchType(NodeType.Heading)
					.transform(async (node) => node)
					.build()
			);
			const result = executor.clearRules();
			expect(result).toBe(executor);
			expect(executor.getRules().length).toBe(0);
		});

		it("getRules returns a copy of rules array", () => {
			const executor = new RuleExecutor();
			const rule = new RuleBuilder("test")
				.matchType(NodeType.Paragraph)
				.transform(async (node) => node)
				.build();
			executor.addRule(rule);
			const rules1 = executor.getRules();
			const rules2 = executor.getRules();
			expect(rules1).not.toBe(rules2);
			expect(rules1).toEqual(rules2);
		});
	});

	/* ────────────────────────────────────────────────────────────────────────────
	 * Rule Execution Tests
	 * ──────────────────────────────────────────────────────────────────────────── */

	describe("Rule Execution", () => {
		it("execute returns transformed AST", async () => {
			const executor = new RuleExecutor();
			const ast = createDocumentNode([createParagraphNode("original")]);
			const result = await executor.execute(ast);
			expect(result).toBeDefined();
			expect(result.type).toBe(NodeType.Document);
		});

		it("execute applies matching rules", async () => {
			const executor = new RuleExecutor();
			const rule = new RuleBuilder("test")
				.matchType(NodeType.Paragraph)
				.transform(async (node) => ({ ...node, modified: true }))
				.build();
			executor.addRule(rule);

			const ast = createDocumentNode([createParagraphNode()]);
			const result = await executor.execute(ast);
			expect(result.children?.[0]?.modified).toBe(true);
		});

		it("execute skips non-matching rules", async () => {
			const executor = new RuleExecutor();
			const rule = new RuleBuilder("test")
				.matchType(NodeType.Heading)
				.transform(async (node) => ({ ...node, modified: true }))
				.build();
			executor.addRule(rule);

			const ast = createDocumentNode([createParagraphNode()]);
			const result = await executor.execute(ast);
			expect(result.children?.[0]?.modified).toBeUndefined();
		});

		it("execute respects priority order (lower number = higher priority)", async () => {
			const executor = new RuleExecutor();
			const order: string[] = [];

			const rule1 = new RuleBuilder("rule1")
				.priority(10)
				.matchType(NodeType.Paragraph)
				.transform(async (node) => {
					order.push("rule1");
					return node;
				})
				.build();

			const rule2 = new RuleBuilder("rule2")
				.priority(5)
				.matchType(NodeType.Paragraph)
				.transform(async (node) => {
					order.push("rule2");
					return node;
				})
				.build();

			executor.addRules([rule1, rule2]);
			const ast = createDocumentNode([createParagraphNode()]);
			await executor.execute(ast);

			expect(order).toEqual(["rule2", "rule1"]);
		});

		it("execute respects enabled flag", async () => {
			const executor = new RuleExecutor();
			const rule = new RuleBuilder("disabled")
				.matchType(NodeType.Paragraph)
				.transform(async (node) => ({ ...node, modified: true }))
				.build();
			rule.enabled = false;

			executor.addRule(rule);
			const ast = createDocumentNode([createParagraphNode()]);
			const result = await executor.execute(ast);
			expect(result.children?.[0]?.modified).toBeUndefined();
		});

		it("execute processes children recursively", async () => {
			const executor = new RuleExecutor();
			const rule = new RuleBuilder("test")
				.matchType(NodeType.Paragraph)
				.transform(async (node) => ({ ...node, processed: true }))
				.build();
			executor.addRule(rule);

			const ast = createDocumentNode([
				createDocumentNode([createParagraphNode()]),
			]);
			const result = await executor.execute(ast);

			const nestedParagraph = result.children?.[0]?.children?.[0];
			expect(nestedParagraph?.processed).toBe(true);
		});

		it("execute with custom transform function", async () => {
			const executor = new RuleExecutor();
			const rule = new RuleBuilder("custom")
				.matchType(NodeType.Paragraph)
				.transform(async (node) => ({
					...node,
					customField: "transformed",
				}))
				.build();

			executor.addRule(rule);
			const ast = createDocumentNode([createParagraphNode()]);
			const result = await executor.execute(ast);
			expect(result.children?.[0]?.customField).toBe("transformed");
		});

		it("execute preserves context.data between rules", async () => {
			const executor = new RuleExecutor();
			const contextData: Record<string, unknown> = {};

			const rule1 = new RuleBuilder("rule1")
				.matchType(NodeType.Paragraph)
				.transform(async (node, context) => {
					context.data.counter = (context.data.counter as number || 0) + 1;
					return node;
				})
				.build();

			const rule2 = new RuleBuilder("rule2")
				.matchType(NodeType.Paragraph)
				.transform(async (node, context) => {
					context.data.counter = (context.data.counter as number || 0) + 1;
					return node;
				})
				.build();

			executor.addRules([rule1, rule2]);
			const ast = createDocumentNode([createParagraphNode()]);
			const context: RuleContext = {
				path: [],
				data: contextData,
				root: ast,
			};

			await executor.execute(ast, context);
			expect(contextData.counter).toBe(2);
		});

		it("matchType condition works with single type", async () => {
			const executor = new RuleExecutor();
			const rule = new RuleBuilder("test")
				.matchType(NodeType.Paragraph)
				.transform(async (node) => ({ ...node, matched: true }))
				.build();
			executor.addRule(rule);

			const ast = createDocumentNode([
				createParagraphNode(),
				createHeadingNode(),
			]);
			const result = await executor.execute(ast);
			expect(result.children?.[0]?.matched).toBe(true);
			expect(result.children?.[1]?.matched).toBeUndefined();
		});

		it("matchType condition works with array of types", async () => {
			const executor = new RuleExecutor();
			const rule = new RuleBuilder("test")
				.matchType([NodeType.Paragraph, NodeType.Heading])
				.transform(async (node) => ({ ...node, matched: true }))
				.build();
			executor.addRule(rule);

			const ast = createDocumentNode([
				createParagraphNode(),
				createHeadingNode(),
			]);
			const result = await executor.execute(ast);
			expect(result.children?.[0]?.matched).toBe(true);
			expect(result.children?.[1]?.matched).toBe(true);
		});

		it("matchProperty condition works", async () => {
			const executor = new RuleExecutor();
			const rule = new RuleBuilder("test")
				.matchProperty("level", 2)
				.transform(async (node) => ({ ...node, matched: true }))
				.build();
			executor.addRule(rule);

			const ast = createDocumentNode([
				createHeadingNode(1),
				createHeadingNode(2),
			]);
			const result = await executor.execute(ast);
			expect(result.children?.[0]?.matched).toBeUndefined();
			expect(result.children?.[1]?.matched).toBe(true);
		});

		it("custom test condition works", async () => {
			const executor = new RuleExecutor();
			const rule = new RuleBuilder("test")
				.match((node) => (node.value as string)?.includes("special"))
				.transform(async (node) => ({ ...node, matched: true }))
				.build();
			executor.addRule(rule);

			const ast = createDocumentNode([
				createParagraphNode("normal"),
				createParagraphNode("special text"),
			]);
			const result = await executor.execute(ast);
			expect(result.children?.[0]?.children?.[0]?.matched).toBeUndefined();
			expect(result.children?.[1]?.children?.[0]?.matched).toBe(true);
		});
	});

	/* ────────────────────────────────────────────────────────────────────────────
	 * Stats and Management Tests
	 * ──────────────────────────────────────────────────────────────────────────── */

	describe("Stats and Management", () => {
		it("getStats returns correct counts", () => {
			const executor = new RuleExecutor();
			const rule1 = new RuleBuilder("rule1")
				.matchType(NodeType.Paragraph)
				.transform(async (node) => node)
				.build();
			const rule2 = new RuleBuilder("rule2")
				.matchType(NodeType.Heading)
				.transform(async (node) => node)
				.build();
			rule2.enabled = false;

			executor.addRules([rule1, rule2]);
			const stats = executor.getStats();

			expect(stats.totalRules).toBe(2);
			expect(stats.enabledRules).toBe(1);
			expect(stats.disabledRules).toBe(1);
		});

		it("getStats counts rules with enabled=undefined as enabled", () => {
			const executor = new RuleExecutor();
			const rule1 = new RuleBuilder("rule1")
				.matchType(NodeType.Paragraph)
				.transform(async (node) => node)
				.build();
			const rule2 = new RuleBuilder("rule2")
				.matchType(NodeType.Heading)
				.transform(async (node) => node)
				.build();

			executor.addRules([rule1, rule2]);
			const stats = executor.getStats();

			expect(stats.enabledRules).toBe(2);
			expect(stats.disabledRules).toBe(0);
		});

		it("setRuleEnabled enables a disabled rule", () => {
			const executor = new RuleExecutor();
			const rule = new RuleBuilder("test")
				.matchType(NodeType.Paragraph)
				.transform(async (node) => node)
				.build();
			rule.enabled = false;

			executor.addRule(rule);
			const result = executor.setRuleEnabled("test", true);

			expect(result).toBe(true);
			expect(executor.getRules()[0]?.enabled).toBe(true);
		});

		it("setRuleEnabled disables an enabled rule", () => {
			const executor = new RuleExecutor();
			const rule = new RuleBuilder("test")
				.matchType(NodeType.Paragraph)
				.transform(async (node) => node)
				.build();
			executor.addRule(rule);

			const result = executor.setRuleEnabled("test", false);

			expect(result).toBe(true);
			expect(executor.getRules()[0]?.enabled).toBe(false);
		});

		it("setRuleEnabled returns false for non-existent rule", () => {
			const executor = new RuleExecutor();
			const result = executor.setRuleEnabled("nonexistent", true);
			expect(result).toBe(false);
		});
	});

	/* ────────────────────────────────────────────────────────────────────────────
	 * Convenience Functions Tests
	 * ──────────────────────────────────────────────────────────────────────────── */

	describe("Convenience Functions", () => {
		it("createExecutor returns new RuleExecutor", () => {
			const executor = createExecutor();
			expect(executor).toBeInstanceOf(RuleExecutor);
		});

		it("createExecutor returns independent instances", () => {
			const executor1 = createExecutor();
			const executor2 = createExecutor();
			expect(executor1).not.toBe(executor2);
		});

		it("transformAST applies rules to AST", async () => {
			const rule = new RuleBuilder("test")
				.matchType(NodeType.Paragraph)
				.transform(async (node) => ({ ...node, transformed: true }))
				.build();

			const ast = createDocumentNode([createParagraphNode()]);
			const result = await transformAST(ast, [rule]);

			expect(result.children?.[0]?.transformed).toBe(true);
		});

		it("transformAST preserves AST structure with multiple rules", async () => {
			const rule1 = new RuleBuilder("rule1")
				.matchType(NodeType.Paragraph)
				.transform(async (node) => ({ ...node, first: true }))
				.build();

			const rule2 = new RuleBuilder("rule2")
				.matchType(NodeType.Paragraph)
				.transform(async (node) => ({ ...node, second: true }))
				.build();

			const ast = createDocumentNode([createParagraphNode()]);
			const result = await transformAST(ast, [rule1, rule2]);

			expect(result.children?.[0]?.first).toBe(true);
			expect(result.children?.[0]?.second).toBe(true);
		});
	});

	/* ────────────────────────────────────────────────────────────────────────────
	 * ChainExecutor Tests
	 * ──────────────────────────────────────────────────────────────────────────── */

	describe("ChainExecutor", () => {
		it("add() adds rules and returns this for chaining", () => {
			const chain = new ChainExecutor();
			const rule = new RuleBuilder("test")
				.matchType(NodeType.Paragraph)
				.transform(async (node) => node)
				.build();
			const result = chain.add(rule);

			expect(result).toBe(chain);
			expect(chain.getExecutor().getRules().length).toBe(1);
		});

		it("add() supports method chaining", () => {
			const chain = new ChainExecutor();
			const rule1 = new RuleBuilder("rule1")
				.matchType(NodeType.Paragraph)
				.transform(async (node) => node)
				.build();
			const rule2 = new RuleBuilder("rule2")
				.matchType(NodeType.Heading)
				.transform(async (node) => node)
				.build();

			chain.add(rule1).add(rule2);

			expect(chain.getExecutor().getRules().length).toBe(2);
		});

		it("execute() applies rules to AST", async () => {
			const chain = new ChainExecutor();
			const rule = new RuleBuilder("test")
				.matchType(NodeType.Paragraph)
				.transform(async (node) => ({ ...node, processed: true }))
				.build();
			chain.add(rule);

			const ast = createDocumentNode([createParagraphNode()]);
			const result = await chain.execute(ast);

			expect(result.children?.[0]?.processed).toBe(true);
		});

		it("getExecutor() returns underlying executor", () => {
			const chain = new ChainExecutor();
			const executor = chain.getExecutor();

			expect(executor).toBeInstanceOf(RuleExecutor);
		});

		it("getExecutor() returns same executor instance", () => {
			const chain = new ChainExecutor();
			const executor1 = chain.getExecutor();
			const executor2 = chain.getExecutor();

			expect(executor1).toBe(executor2);
		});

		it("ChainExecutor applies multiple rules in order", async () => {
			const order: string[] = [];

			const rule1 = new RuleBuilder("rule1")
				.priority(10)
				.matchType(NodeType.Paragraph)
				.transform(async (node) => {
					order.push("rule1");
					return node;
				})
				.build();

			const rule2 = new RuleBuilder("rule2")
				.priority(5)
				.matchType(NodeType.Paragraph)
				.transform(async (node) => {
					order.push("rule2");
					return node;
				})
				.build();

			const chain = new ChainExecutor();
			chain.add(rule1).add(rule2);

			const ast = createDocumentNode([createParagraphNode()]);
			await chain.execute(ast);

			expect(order).toEqual(["rule2", "rule1"]);
		});
	});

	/* ────────────────────────────────────────────────────────────────────────────
	 * Edge Cases and Integration Tests
	 * ──────────────────────────────────────────────────────────────────────────── */

	describe("Edge Cases", () => {
		it("execute with empty rules array", async () => {
			const executor = new RuleExecutor();
			const ast = createDocumentNode([createParagraphNode()]);
			const result = await executor.execute(ast);

			expect(result).toEqual(ast);
		});

		it("execute with empty AST children", async () => {
			const executor = new RuleExecutor();
			const rule = new RuleBuilder("test")
				.matchType(NodeType.Paragraph)
				.transform(async (node) => node)
				.build();
			executor.addRule(rule);

			const ast = createDocumentNode([]);
			const result = await executor.execute(ast);

			expect(result.children).toEqual([]);
		});

		it("execute with deeply nested nodes", async () => {
			const executor = new RuleExecutor();
			const rule = new RuleBuilder("test")
				.matchType(NodeType.Paragraph)
				.transform(async (node) => ({ ...node, marked: true }))
				.build();
			executor.addRule(rule);

			const deepAst = createDocumentNode([
				createDocumentNode([
					createDocumentNode([createParagraphNode()]),
				]),
			]);

			const result = await executor.execute(deepAst);
			const deepParagraph = result.children?.[0]?.children?.[0]?.children?.[0];
			expect(deepParagraph?.marked).toBe(true);
		});

		it("execute preserves context.root through recursive calls", async () => {
			const executor = new RuleExecutor();
			let capturedRoot: MarkdownNode | undefined;

			const rule = new RuleBuilder("test")
				.matchType(NodeType.Paragraph)
				.transform(async (node, context) => {
					capturedRoot = context.root;
					return node;
				})
				.build();

			executor.addRule(rule);
			const ast = createDocumentNode([createParagraphNode()]);
			await executor.execute(ast);

			expect(capturedRoot).toBe(ast);
		});

		it("rule with both type and property conditions", async () => {
			const executor = new RuleExecutor();
			const rule = new RuleBuilder("test")
				.matchType(NodeType.Heading)
				.matchProperty("level", 2)
				.transform(async (node) => ({ ...node, matched: true }))
				.build();

			executor.addRule(rule);
			const ast = createDocumentNode([
				createHeadingNode(1),
				createHeadingNode(2),
				createHeadingNode(3),
			]);

			const result = await executor.execute(ast);
			expect(result.children?.[0]?.matched).toBeUndefined();
			expect(result.children?.[1]?.matched).toBe(true);
			expect(result.children?.[2]?.matched).toBeUndefined();
		});

		it("multiple rules on same node execute in priority order", async () => {
			const executor = new RuleExecutor();
			const execution: string[] = [];

			const rule1 = new RuleBuilder("rule1")
				.priority(20)
				.matchType(NodeType.Paragraph)
				.transform(async (node) => {
					execution.push("rule1");
					return { ...node, value1: true };
				})
				.build();

			const rule2 = new RuleBuilder("rule2")
				.priority(10)
				.matchType(NodeType.Paragraph)
				.transform(async (node) => {
					execution.push("rule2");
					return { ...node, value2: true };
				})
				.build();

			executor.addRules([rule1, rule2]);
			const ast = createDocumentNode([createParagraphNode()]);
			const result = await executor.execute(ast);

			expect(execution).toEqual(["rule2", "rule1"]);
			expect(result.children?.[0]?.value1).toBe(true);
			expect(result.children?.[0]?.value2).toBe(true);
		});
	});
});
