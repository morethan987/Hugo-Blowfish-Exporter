import { describe, it, expect, beforeEach, vi } from "vitest";
import { RuleBuilder, RuleContext } from "./rule";
import { NodeType, MarkdownNode } from "./node";

describe("RuleBuilder", () => {
	let builder: RuleBuilder;

	beforeEach(() => {
		builder = new RuleBuilder("test-rule");
	});

	describe("Constructor", () => {
		it("creates rule with name", () => {
			builder.matchType(NodeType.Paragraph).transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.name).toBe("test-rule");
		});

		it("initializes with empty condition and transform", () => {
			expect(() => builder.build()).toThrow();
		});
	});

	describe("describe() method", () => {
		it("sets description", () => {
			const description = "Test rule description";
			builder
				.describe(description)
				.matchType(NodeType.Paragraph)
				.transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.description).toBe(description);
		});

		it("overrides previous description", () => {
			builder
				.describe("First description")
				.describe("Second description")
				.matchType(NodeType.Paragraph)
				.transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.description).toBe("Second description");
		});

		it("returns RuleBuilder for chaining", () => {
			const result = builder.describe("Test");
			expect(result).toBeInstanceOf(RuleBuilder);
		});
	});

	describe("priority() method", () => {
		it("sets priority", () => {
			builder
				.priority(10)
				.matchType(NodeType.Paragraph)
				.transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.priority).toBe(10);
		});

		it("accepts negative priority", () => {
			builder
				.priority(-5)
				.matchType(NodeType.Paragraph)
				.transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.priority).toBe(-5);
		});

		it("accepts zero priority", () => {
			builder
				.priority(0)
				.matchType(NodeType.Paragraph)
				.transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.priority).toBe(0);
		});

		it("returns RuleBuilder for chaining", () => {
			const result = builder.priority(5);
			expect(result).toBeInstanceOf(RuleBuilder);
		});
	});

	describe("matchType() method", () => {
		it("matches single NodeType", () => {
			builder.matchType(NodeType.Paragraph).transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.condition.type).toBe(NodeType.Paragraph);
		});

		it("matches array of NodeTypes", () => {
			const types = [NodeType.Paragraph, NodeType.Heading, NodeType.Text];
			builder.matchType(types).transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.condition.type).toEqual(types);
		});

		it("overwrites previous matchType", () => {
			builder
				.matchType(NodeType.Paragraph)
				.matchType(NodeType.Heading)
				.transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.condition.type).toBe(NodeType.Heading);
		});

		it("returns RuleBuilder for chaining", () => {
			const result = builder.matchType(NodeType.Paragraph);
			expect(result).toBeInstanceOf(RuleBuilder);
		});

		it("preserves other condition properties", () => {
			builder
				.matchProperty("custom", "value")
				.matchType(NodeType.Paragraph)
				.transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.condition.type).toBe(NodeType.Paragraph);
			expect(rule.condition.properties?.custom).toBe("value");
		});
	});

	describe("matchProperty() method", () => {
		it("sets single property condition", () => {
			builder
				.matchProperty("lang", "javascript")
				.matchType(NodeType.CodeBlock)
				.transformType(NodeType.CodeBlock);
			const rule = builder.build();
			expect(rule.condition.properties?.lang).toBe("javascript");
		});

		it("accumulates multiple matchProperty calls", () => {
			builder
				.matchProperty("lang", "javascript")
				.matchProperty("highlight", true)
				.matchProperty("linenumbers", false)
				.matchType(NodeType.CodeBlock)
				.transformType(NodeType.CodeBlock);
			const rule = builder.build();
			expect(rule.condition.properties).toEqual({
				lang: "javascript",
				highlight: true,
				linenumbers: false,
			});
		});

		it("overwrites property with same key", () => {
			builder
				.matchProperty("lang", "javascript")
				.matchProperty("lang", "python")
				.matchType(NodeType.CodeBlock)
				.transformType(NodeType.CodeBlock);
			const rule = builder.build();
			expect(rule.condition.properties?.lang).toBe("python");
		});

		it("accepts various value types", () => {
			builder
				.matchProperty("string", "value")
				.matchProperty("number", 42)
				.matchProperty("boolean", true)
				.matchProperty("null", null)
				.matchProperty("object", { key: "value" })
				.matchProperty("array", [1, 2, 3])
				.matchType(NodeType.Paragraph)
				.transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.condition.properties?.string).toBe("value");
			expect(rule.condition.properties?.number).toBe(42);
			expect(rule.condition.properties?.boolean).toBe(true);
			expect(rule.condition.properties?.null).toBe(null);
			expect(rule.condition.properties?.object).toEqual({ key: "value" });
			expect(rule.condition.properties?.array).toEqual([1, 2, 3]);
		});

		it("returns RuleBuilder for chaining", () => {
			const result = builder.matchProperty("key", "value");
			expect(result).toBeInstanceOf(RuleBuilder);
		});
	});

	describe("match() method", () => {
		it("sets custom match function", () => {
			const testFn = (node: MarkdownNode): boolean => {
				return node.type === NodeType.Paragraph;
			};
			builder.match(testFn).matchType(NodeType.Paragraph).transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.condition.test).toBe(testFn);
		});

		it("can invoke custom match function", () => {
			const testFn = vi.fn((_node: MarkdownNode, _context: RuleContext) => true);
			builder.match(testFn).matchType(NodeType.Paragraph).transformType(NodeType.Text);
			const rule = builder.build();

			const node: MarkdownNode = { type: NodeType.Paragraph };
			const context: RuleContext = { path: [], root: node, data: {} };

			rule.condition.test?.(node, context);
			expect(testFn).toHaveBeenCalledWith(node, context);
		});

		it("overwrites previous match function", () => {
			const testFn1 = (_node: MarkdownNode) => false;
			const testFn2 = (_node: MarkdownNode) => true;
			builder.match(testFn1).match(testFn2).matchType(NodeType.Paragraph).transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.condition.test).toBe(testFn2);
		});

		it("returns RuleBuilder for chaining", () => {
			const result = builder.match(() => true);
			expect(result).toBeInstanceOf(RuleBuilder);
		});

		it("preserves other condition properties", () => {
			builder
				.matchType(NodeType.Paragraph)
				.match(() => true)
				.transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.condition.type).toBe(NodeType.Paragraph);
			expect(rule.condition.test).toBeDefined();
		});
	});

	describe("transformType() method", () => {
		it("sets transform type", () => {
			builder.matchType(NodeType.Paragraph).transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.transform.type).toBe(NodeType.Text);
		});

		it("accepts any NodeType", () => {
			const types = [
				NodeType.Heading,
				NodeType.CodeBlock,
				NodeType.Strong,
				NodeType.Emphasis,
			];
			for (const type of types) {
				const testBuilder = new RuleBuilder("test");
				testBuilder.matchType(NodeType.Paragraph).transformType(type);
				const rule = testBuilder.build();
				expect(rule.transform.type).toBe(type);
			}
		});

		it("overwrites previous transformType", () => {
			builder
				.matchType(NodeType.Paragraph)
				.transformType(NodeType.Text)
				.transformType(NodeType.Strong);
			const rule = builder.build();
			expect(rule.transform.type).toBe(NodeType.Strong);
		});

		it("returns RuleBuilder for chaining", () => {
			const result = builder.transformType(NodeType.Text);
			expect(result).toBeInstanceOf(RuleBuilder);
		});

		it("preserves other transform properties", () => {
			builder
				.matchType(NodeType.Paragraph)
				.setProperty("color", "red")
				.transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.transform.type).toBe(NodeType.Text);
			expect(rule.transform.set?.color).toBe("red");
		});
	});

	describe("setProperty() method", () => {
		it("sets single transform property", () => {
			builder
				.matchType(NodeType.Paragraph)
				.setProperty("class", "highlight")
				.transformType(NodeType.Paragraph);
			const rule = builder.build();
			expect(rule.transform.set?.class).toBe("highlight");
		});

		it("accumulates multiple setProperty calls", () => {
			builder
				.matchType(NodeType.CodeBlock)
				.setProperty("lang", "javascript")
				.setProperty("highlight", true)
				.setProperty("linenumbers", 10)
				.transformType(NodeType.CodeBlock);
			const rule = builder.build();
			expect(rule.transform.set).toEqual({
				lang: "javascript",
				highlight: true,
				linenumbers: 10,
			});
		});

		it("overwrites property with same key", () => {
			builder
				.matchType(NodeType.CodeBlock)
				.setProperty("lang", "javascript")
				.setProperty("lang", "python")
				.transformType(NodeType.CodeBlock);
			const rule = builder.build();
			expect(rule.transform.set?.lang).toBe("python");
		});

		it("accepts various value types", () => {
			builder
				.matchType(NodeType.Paragraph)
				.setProperty("string", "value")
				.setProperty("number", 42)
				.setProperty("boolean", false)
				.setProperty("object", { nested: "value" })
				.setProperty("array", ["a", "b", "c"])
				.transformType(NodeType.Paragraph);
			const rule = builder.build();
			expect(rule.transform.set?.string).toBe("value");
			expect(rule.transform.set?.number).toBe(42);
			expect(rule.transform.set?.boolean).toBe(false);
			expect(rule.transform.set?.object).toEqual({ nested: "value" });
			expect(rule.transform.set?.array).toEqual(["a", "b", "c"]);
		});

		it("returns RuleBuilder for chaining", () => {
			const result = builder.setProperty("key", "value");
			expect(result).toBeInstanceOf(RuleBuilder);
		});
	});

	describe("removeProperty() method", () => {
		it("adds property to remove list", () => {
			builder
				.matchType(NodeType.Paragraph)
				.removeProperty("obsolete")
				.transformType(NodeType.Paragraph);
			const rule = builder.build();
			expect(rule.transform.remove).toContain("obsolete");
		});

		it("accumulates multiple removeProperty calls", () => {
			builder
				.matchType(NodeType.CodeBlock)
				.removeProperty("deprecated")
				.removeProperty("legacy")
				.removeProperty("unused")
				.transformType(NodeType.CodeBlock);
			const rule = builder.build();
			expect(rule.transform.remove).toEqual(["deprecated", "legacy", "unused"]);
		});

		it("allows duplicate properties in remove list", () => {
			builder
				.matchType(NodeType.Paragraph)
				.removeProperty("prop")
				.removeProperty("prop")
				.transformType(NodeType.Paragraph);
			const rule = builder.build();
			expect(rule.transform.remove?.filter((p) => p === "prop")).toHaveLength(2);
		});

		it("returns RuleBuilder for chaining", () => {
			const result = builder.removeProperty("key");
			expect(result).toBeInstanceOf(RuleBuilder);
		});

		it("initializes remove array if not present", () => {
			builder
				.matchType(NodeType.Paragraph)
				.removeProperty("prop1")
				.transformType(NodeType.Paragraph);
			const rule = builder.build();
			expect(Array.isArray(rule.transform.remove)).toBe(true);
		});
	});

	describe("transform() method", () => {
		it("sets custom transform function", async () => {
			const transformFn = async (
				node: MarkdownNode
			): Promise<MarkdownNode> => {
				return { ...node, value: "transformed" };
			};
			builder
				.matchType(NodeType.Paragraph)
				.transform(transformFn)
				.transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.transform.transform).toBe(transformFn);
		});

		it("can invoke custom transform function", async () => {
			const transformFn = async (
				node: MarkdownNode
			): Promise<MarkdownNode> => {
				return { ...node, value: "modified" };
			};
			builder
				.matchType(NodeType.Paragraph)
				.transform(transformFn)
				.transformType(NodeType.Text);
			const rule = builder.build();

			const node: MarkdownNode = { type: NodeType.Paragraph, value: "original" };
			const context: RuleContext = { path: [], root: node, data: {} };

			const result = await rule.transform.transform?.(node, context);
			expect(result?.value).toBe("modified");
		});

		it("overwrites previous transform function", () => {
			const transformFn1 = async () => ({ type: NodeType.Text });
			const transformFn2 = async () => ({ type: NodeType.Strong });
			builder
				.matchType(NodeType.Paragraph)
				.transform(transformFn1)
				.transform(transformFn2)
				.transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.transform.transform).toBe(transformFn2);
		});

		it("returns RuleBuilder for chaining", () => {
			const result = builder.transform(async () => ({ type: NodeType.Text }));
			expect(result).toBeInstanceOf(RuleBuilder);
		});

		it("preserves other transform properties", () => {
			builder
				.matchType(NodeType.Paragraph)
				.setProperty("class", "highlight")
				.transform(async (n) => n)
				.transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.transform.set?.class).toBe("highlight");
			expect(rule.transform.transform).toBeDefined();
		});
	});

	describe("recursive() method", () => {
		it("sets recursive flag to true", () => {
			builder
				.matchType(NodeType.Paragraph)
				.recursive(true)
				.transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.transform.recursive).toBe(true);
		});

		it("sets recursive flag to false", () => {
			builder
				.matchType(NodeType.Paragraph)
				.recursive(false)
				.transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.transform.recursive).toBe(false);
		});

		it("defaults to true when called without arguments", () => {
			builder.matchType(NodeType.Paragraph).recursive().transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.transform.recursive).toBe(true);
		});

		it("overwrites previous recursive value", () => {
			builder
				.matchType(NodeType.Paragraph)
				.recursive(false)
				.recursive(true)
				.transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.transform.recursive).toBe(true);
		});

		it("returns RuleBuilder for chaining", () => {
			const result = builder.recursive();
			expect(result).toBeInstanceOf(RuleBuilder);
		});
	});

	describe("build() method", () => {
		it("returns complete Rule object", () => {
			builder.matchType(NodeType.Paragraph).transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule).toHaveProperty("name");
			expect(rule).toHaveProperty("condition");
			expect(rule).toHaveProperty("transform");
		});

		it("throws error when condition is missing", () => {
			builder.transformType(NodeType.Text);
			expect(() => builder.build()).toThrow();
		});

		it("throws error when transform is missing", () => {
			builder.matchType(NodeType.Paragraph);
			expect(() => builder.build()).toThrow();
		});

		it("throws error when both condition and transform are missing", () => {
			expect(() => builder.build()).toThrow();
		});

		it("throws error with descriptive message", () => {
			builder = new RuleBuilder("my-rule");
			expect(() => builder.build()).toThrow(/my-rule/);
		});

		it("includes rule name in error message", () => {
			builder = new RuleBuilder("custom-name");
			try {
				builder.build();
				expect.fail("Should have thrown");
			} catch (error) {
				expect((error as Error).message).toContain("custom-name");
			}
		});

		it("returns rule with all set properties", () => {
			builder
				.describe("Complete rule")
				.priority(5)
				.matchType(NodeType.CodeBlock)
				.matchProperty("lang", "js")
				.match(() => true)
				.transformType(NodeType.CodeBlock)
				.setProperty("highlighted", true)
				.removeProperty("deprecated")
				.recursive(true);

			const rule = builder.build();

			expect(rule.name).toBe("test-rule");
			expect(rule.description).toBe("Complete rule");
			expect(rule.priority).toBe(5);
			expect(rule.condition.type).toBe(NodeType.CodeBlock);
			expect(rule.condition.properties?.lang).toBe("js");
			expect(rule.condition.test).toBeDefined();
			expect(rule.transform.type).toBe(NodeType.CodeBlock);
			expect(rule.transform.set?.highlighted).toBe(true);
			expect(rule.transform.remove).toContain("deprecated");
			expect(rule.transform.recursive).toBe(true);
		});
	});

	describe("Fluent API chaining", () => {
		it("chains all methods successfully", () => {
			const rule = new RuleBuilder("chained-rule")
				.describe("A chained rule")
				.priority(3)
				.matchType(NodeType.Heading)
				.matchProperty("level", 1)
				.matchProperty("important", true)
				.match(() => true)
				.transformType(NodeType.Strong)
				.setProperty("class", "title")
				.setProperty("weight", "bold")
				.removeProperty("temporary")
				.removeProperty("cache")
				.transform(async (node) => node)
				.recursive(true)
				.build();

			expect(rule.name).toBe("chained-rule");
			expect(rule.description).toBe("A chained rule");
			expect(rule.priority).toBe(3);
			expect(rule.condition.type).toBe(NodeType.Heading);
			expect(rule.condition.properties).toEqual({ level: 1, important: true });
			expect(rule.transform.type).toBe(NodeType.Strong);
			expect(rule.transform.set).toEqual({ class: "title", weight: "bold" });
			expect(rule.transform.remove).toEqual(["temporary", "cache"]);
			expect(rule.transform.recursive).toBe(true);
		});

		it("allows flexible method order", () => {
			const rule1 = new RuleBuilder("rule1")
				.matchType(NodeType.Paragraph)
				.describe("First rule")
				.transformType(NodeType.Text)
				.priority(1)
				.build();

			const rule2 = new RuleBuilder("rule2")
				.priority(1)
				.transformType(NodeType.Text)
				.describe("Second rule")
				.matchType(NodeType.Paragraph)
				.build();

			expect(rule1.name).toBe(rule2.name.replace("2", "1"));
			expect(rule1.description).toBe("First rule");
			expect(rule2.description).toBe("Second rule");
		});

		it("supports minimal chaining (only required methods)", () => {
			const rule = new RuleBuilder("minimal")
				.matchType(NodeType.Paragraph)
				.transformType(NodeType.Text)
				.build();

			expect(rule.name).toBe("minimal");
			expect(rule.description).toBeUndefined();
			expect(rule.priority).toBeUndefined();
		});
	});

	describe("Edge cases and special scenarios", () => {
		it("handles empty string property values", () => {
			builder
				.matchType(NodeType.Paragraph)
				.matchProperty("empty", "")
				.setProperty("emptySet", "")
				.transformType(NodeType.Paragraph);
			const rule = builder.build();
			expect(rule.condition.properties?.empty).toBe("");
			expect(rule.transform.set?.emptySet).toBe("");
		});

		it("handles complex nested objects", () => {
			const complexObject = {
				level1: {
					level2: {
						level3: ["a", "b", { key: "value" }],
					},
				},
			};
			builder
				.matchType(NodeType.Paragraph)
				.matchProperty("complex", complexObject)
				.setProperty("complexTransform", complexObject)
				.transformType(NodeType.Paragraph);
			const rule = builder.build();
			expect(rule.condition.properties?.complex).toEqual(complexObject);
			expect(rule.transform.set?.complexTransform).toEqual(complexObject);
		});

		it("handles multiple NodeTypes in array", () => {
			const types = [
				NodeType.Paragraph,
				NodeType.Heading,
				NodeType.CodeBlock,
				NodeType.Table,
				NodeType.List,
			];
			builder.matchType(types).transformType(NodeType.Text);
			const rule = builder.build();
			expect(rule.condition.type).toEqual(types);
		});

		it("returns same rule object on multiple builds", () => {
			builder.matchType(NodeType.Paragraph).transformType(NodeType.Text);
			const rule1 = builder.build();
			const rule2 = builder.build();
			expect(rule1.name).toBe(rule2.name);
			expect(rule1 === rule2).toBe(true);
		});
	});
});
