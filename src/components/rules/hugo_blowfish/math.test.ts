import { describe, it, expect } from "vitest";
import { hasMathNode } from "./math";
import { NodeType, MarkdownNode } from "components/ast/node";

describe("hasMathNode", () => {
	it("returns false for null node", () => {
		expect(hasMathNode(null as unknown as MarkdownNode)).toBe(false);
	});

	it("returns false for undefined node", () => {
		expect(hasMathNode(undefined as unknown as MarkdownNode)).toBe(false);
	});

	it("returns true for MathBlock node", () => {
		const node: MarkdownNode = {
			type: NodeType.MathBlock,
			value: "x^2 + y^2 = z^2",
		};
		expect(hasMathNode(node)).toBe(true);
	});

	it("returns true for MathSpan node", () => {
		const node: MarkdownNode = {
			type: NodeType.MathSpan,
			value: "\\sqrt{2}",
		};
		expect(hasMathNode(node)).toBe(true);
	});

	it("returns false for Text node", () => {
		const node: MarkdownNode = {
			type: NodeType.Text,
			value: "Regular text",
		};
		expect(hasMathNode(node)).toBe(false);
	});

	it("returns false for Paragraph without math children", () => {
		const node: MarkdownNode = {
			type: NodeType.Paragraph,
			children: [
				{
					type: NodeType.Text,
					value: "Just text",
				},
			],
		};
		expect(hasMathNode(node)).toBe(false);
	});

	it("returns true for Paragraph with MathSpan child", () => {
		const node: MarkdownNode = {
			type: NodeType.Paragraph,
			children: [
				{
					type: NodeType.Text,
					value: "Formula: ",
				},
				{
					type: NodeType.MathSpan,
					value: "x + y",
				},
			],
		};
		expect(hasMathNode(node)).toBe(true);
	});

	it("returns true for Document with nested MathBlock", () => {
		const node: MarkdownNode = {
			type: NodeType.Document,
			children: [
				{
					type: NodeType.Paragraph,
					children: [
						{
							type: NodeType.Text,
							value: "Some text",
						},
					],
				},
				{
					type: NodeType.MathBlock,
					value: "E = mc^2",
				},
			],
		};
		expect(hasMathNode(node)).toBe(true);
	});

	it("returns false for empty children array", () => {
		const node: MarkdownNode = {
			type: NodeType.Paragraph,
			children: [],
		};
		expect(hasMathNode(node)).toBe(false);
	});

	it("returns true for deeply nested math node", () => {
		const node: MarkdownNode = {
			type: NodeType.Document,
			children: [
				{
					type: NodeType.BlockQuote,
					children: [
						{
							type: NodeType.Paragraph,
							children: [
								{
									type: NodeType.Strong,
									children: [
										{
											type: NodeType.Text,
											value: "Bold ",
										},
										{
											type: NodeType.MathSpan,
											value: "formula",
										},
									],
								},
							],
						},
					],
				},
			],
		};
		expect(hasMathNode(node)).toBe(true);
	});

	it("returns false for node without children property", () => {
		const node: MarkdownNode = {
			type: NodeType.Text,
			value: "Text only",
		};
		expect(hasMathNode(node)).toBe(false);
	});

	it("returns true when MathBlock is first child", () => {
		const node: MarkdownNode = {
			type: NodeType.Document,
			children: [
				{
					type: NodeType.MathBlock,
					value: "formula",
				},
				{
					type: NodeType.Paragraph,
					children: [
						{
							type: NodeType.Text,
							value: "text",
						},
					],
				},
			],
		};
		expect(hasMathNode(node)).toBe(true);
	});

	it("returns true when MathSpan is last child", () => {
		const node: MarkdownNode = {
			type: NodeType.Paragraph,
			children: [
				{
					type: NodeType.Text,
					value: "Start ",
				},
				{
					type: NodeType.MathSpan,
					value: "end",
				},
			],
		};
		expect(hasMathNode(node)).toBe(true);
	});
});
