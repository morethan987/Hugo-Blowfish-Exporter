import { describe, it, expect } from "vitest";
import { parseMarkdown } from "./parser";
import { NodeType, TableNode, WikiLinkNode, FootnoteDefNode } from "./node";

describe("parseMarkdown", () => {
	describe("block-level parsing", () => {
		it("returns Document with empty children for empty string", () => {
			const result = parseMarkdown("");
			expect(result.type).toBe(NodeType.Document);
			expect(result.children).toHaveLength(0);
		});

		it("parses YAML front-matter at start of document", () => {
			const md = `---
title: Test Document
author: John Doe
---

# Heading`;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(2);
			expect(result.children![0]!.type).toBe(NodeType.FrontMatter);
			expect(result.children![0]!.value).toContain("title: Test Document");
		});

		it("parses ATX heading with level 1", () => {
			const result = parseMarkdown("# Heading");
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.Heading);
			expect(result.children![0]!.level).toBe(1);
		});

		it("parses ATX heading with level 6", () => {
			const result = parseMarkdown("###### Deep Heading");
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.Heading);
			expect(result.children![0]!.level).toBe(6);
		});

		it("parses Setext heading with equals underline", () => {
			const md = `Heading
=====`;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.Heading);
			expect(result.children![0]!.level).toBe(1);
		});

		it("parses Setext heading with hyphen underline", () => {
			const md = `Heading
-----`;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.Heading);
			expect(result.children![0]!.level).toBe(2);
		});

		it("parses code block with language", () => {
			const md = `\`\`\`python
print("Hello")
\`\`\``;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.CodeBlock);
			expect(result.children![0]!.lang).toBe("python");
			expect(result.children![0]!.value).toContain("print");
		});

		it("parses code block without language", () => {
			const md = `\`\`\`
plain code
\`\`\``;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.CodeBlock);
			expect(result.children![0]!.lang).toBeUndefined();
		});

		it("parses math block", () => {
			const md = `$$
E = mc^2
$$`;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.MathBlock);
			expect(result.children![0]!.value).toContain("E = mc^2");
		});

		it("parses callout with type and title", () => {
			const md = `> [!note] Important Note
> This is the content`;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.Callout);
			expect(result.children![0]!.calloutType).toBe("note");
		});

		it("parses block quote", () => {
			const md = `> This is quoted
> text`;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.BlockQuote);
			expect(result.children![0]!.children).toBeDefined();
		});

		it("parses horizontal rule with asterisks", () => {
			const result = parseMarkdown("***");
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.HorizontalRule);
		});

		it("parses horizontal rule with hyphens", () => {
			const result = parseMarkdown("--- --- ---");
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.HorizontalRule);
		});

		it("parses horizontal rule with underscores", () => {
			const result = parseMarkdown("_ _ _");
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.HorizontalRule);
		});

		it("parses unordered list with hyphen", () => {
			const md = `- Item 1
- Item 2`;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.List);
			expect(result.children![0]!.ordered).toBe(false);
			expect(result.children![0]!.children).toHaveLength(2);
		});

		it("parses unordered list with asterisk", () => {
			const md = `* Item 1
* Item 2`;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.List);
			expect(result.children![0]!.ordered).toBe(false);
		});

		it("parses unordered list with plus", () => {
			const md = `+ Item 1
+ Item 2`;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.List);
			expect(result.children![0]!.ordered).toBe(false);
		});

		it("parses ordered list", () => {
			const md = `1. First
2. Second
3. Third`;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.List);
			expect(result.children![0]!.ordered).toBe(true);
		});

		it("parses task list with unchecked items", () => {
			const md = `- [ ] Todo item 1
- [ ] Todo item 2`;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(1);
			const listNode = result.children![0]!;
			expect(listNode.type).toBe(NodeType.List);
			const firstItem = listNode.children![0]!;
			expect(firstItem.type).toBe(NodeType.ListItem);
			expect(firstItem.task).toBe(false);
		});

		it("parses task list with checked items", () => {
			const md = `- [x] Completed task 1
- [x] Completed task 2`;
			const result = parseMarkdown(md);
			const listNode = result.children![0]!;
			const firstItem = listNode.children![0]!;
			expect(firstItem.task).toBe(true);
		});

		it("parses nested lists", () => {
			const md = `- Item 1
	- Nested 1
	- Nested 2
- Item 2`;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(1);
			const listNode = result.children![0]!;
			expect(listNode.children).toHaveLength(2);
		});

		it("parses table with alignment", () => {
			const md = `| Left | Center | Right |
| :--- | :---: | ---: |
| A | B | C |`;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.Table);
			const tableNode = result.children![0]! as TableNode;
			expect(tableNode.align).toContain("left");
			expect(tableNode.align).toContain("center");
			expect(tableNode.align).toContain("right");
		});

		it("parses HTML block", () => {
			const md = `<div>
<p>HTML content</p>
</div>`;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.HtmlBlock);
		});

		it("parses HTML comment", () => {
			const md = `<!-- This is a comment -->`;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.HtmlComment);
		});

		it("parses Obsidian comment", () => {
			const md = `%% This is an Obsidian comment %%`;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.HtmlComment);
		});

		it("parses footnote definition", () => {
			const md = `[^1]: This is a footnote`;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.FootnoteDef);
			expect((result.children![0]! as FootnoteDefNode).id).toBe("1");
		});

		it("parses paragraph", () => {
			const result = parseMarkdown("This is a paragraph");
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.Paragraph);
		});
	});

	describe("inline parsing", () => {
		it("parses bold text", () => {
			const result = parseMarkdown("**bold text**");
			const paraNode = result.children![0]!;
			expect(paraNode.children).toHaveLength(1);
			expect(paraNode.children![0]!.type).toBe(NodeType.Strong);
		});

		it("parses italic text", () => {
			const result = parseMarkdown("*italic text*");
			const paraNode = result.children![0]!;
			expect(paraNode.children).toHaveLength(1);
			expect(paraNode.children![0]!.type).toBe(NodeType.Emphasis);
		});

		it("parses bold and italic text", () => {
			const result = parseMarkdown("***bold and italic***");
			const paraNode = result.children![0]!;
			expect(paraNode.children).toHaveLength(1);
			expect(paraNode.children![0]!.type).toBe(NodeType.StrongEmphasis);
		});

		it("parses inline code", () => {
			const result = parseMarkdown("`code`");
			const paraNode = result.children![0]!;
			expect(paraNode.children).toHaveLength(1);
			expect(paraNode.children![0]!.type).toBe(NodeType.InlineCode);
		});

		it("parses inline math", () => {
			const result = parseMarkdown("$formula$");
			const paraNode = result.children![0]!;
			expect(paraNode.children).toHaveLength(1);
			expect(paraNode.children![0]!.type).toBe(NodeType.MathSpan);
		});

		it("parses wiki link", () => {
			const result = parseMarkdown("[[file]]");
			const paraNode = result.children![0]!;
			expect(paraNode.children).toHaveLength(1);
			expect(paraNode.children![0]!.type).toBe(NodeType.WikiLink);
		});

		it("parses wiki link with alias", () => {
			const result = parseMarkdown("[[file|alias]]");
			const paraNode = result.children![0]!;
			const linkNode = paraNode.children![0]! as WikiLinkNode;
			expect(linkNode.type).toBe(NodeType.WikiLink);
			expect(linkNode.alias).toBe("alias");
		});

		it("parses wiki link with heading reference", () => {
			const result = parseMarkdown("[[file#heading]]");
			const paraNode = result.children![0]!;
			const linkNode = paraNode.children![0]!;
			expect(linkNode.type).toBe(NodeType.WikiLink);
			expect((linkNode as WikiLinkNode & { heading?: string }).heading).toBe("heading");
		});

		it("parses embed", () => {
			const result = parseMarkdown("![[file]]");
			const paraNode = result.children![0]!;
			expect(paraNode.children).toHaveLength(1);
			expect(paraNode.children![0]!.type).toBe(NodeType.Embed);
		});

		it("parses image embed from wiki", () => {
			const result = parseMarkdown("![[image.png]]");
			const paraNode = result.children![0]!;
			expect(paraNode.children).toHaveLength(1);
			expect(paraNode.children![0]!.type).toBe(NodeType.Image);
		});

		it("parses standard link", () => {
			const result = parseMarkdown("[text](https://example.com)");
			const paraNode = result.children![0]!;
			expect(paraNode.children).toHaveLength(1);
			expect(paraNode.children![0]!.type).toBe(NodeType.Link);
		});

		it("parses standard image", () => {
			const result = parseMarkdown("![alt](image.png)");
			const paraNode = result.children![0]!;
			expect(paraNode.children).toHaveLength(1);
			expect(paraNode.children![0]!.type).toBe(NodeType.Image);
		});

		it("parses highlight", () => {
			const result = parseMarkdown("==highlighted text==");
			const paraNode = result.children![0]!;
			expect(paraNode.children).toHaveLength(1);
			expect(paraNode.children![0]!.type).toBe(NodeType.Highlight);
		});

		it("parses strikethrough", () => {
			const result = parseMarkdown("~~strikethrough~~");
			const paraNode = result.children![0]!;
			expect(paraNode.children).toHaveLength(1);
			expect(paraNode.children![0]!.type).toBe(NodeType.Strike);
		});

		it("parses footnote reference", () => {
			const result = parseMarkdown("[^1]");
			const paraNode = result.children![0]!;
			expect(paraNode.children).toHaveLength(1);
			expect(paraNode.children![0]!.type).toBe(NodeType.FootnoteRef);
		});

		it("parses auto link", () => {
			const result = parseMarkdown("https://example.com");
			const paraNode = result.children![0]!;
			expect(paraNode.children).toHaveLength(1);
			expect(paraNode.children![0]!.type).toBe(NodeType.AutoLink);
		});

		it("parses escaped character", () => {
			const result = parseMarkdown("\\*");
			const paraNode = result.children![0]!;
			expect(paraNode.children).toHaveLength(1);
			expect(paraNode.children![0]!.type).toBe(NodeType.EscapedChar);
		});

		it("parses HTML inline tag", () => {
			const result = parseMarkdown("Text <sub>subscript</sub> more");
			const paraNode = result.children![0]!;
			expect(paraNode.type).toBe(NodeType.Paragraph);
			expect(paraNode.children).toBeDefined();
			const hasHtmlInline = paraNode.children!.some(
				(n) => n.type === NodeType.HtmlInline
			);
			expect(hasHtmlInline).toBe(true);
		});

		it("parses plain text", () => {
			const result = parseMarkdown("plain text");
			const paraNode = result.children![0]!;
			expect(paraNode.children).toHaveLength(1);
			expect(paraNode.children![0]!.type).toBe(NodeType.Text);
		});
	});

	describe("complex scenarios", () => {
		it("parses document with multiple block types", () => {
			const md = `# Title

This is a paragraph.

- Item 1
- Item 2

\`\`\`js
code here
\`\`\``;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(4);
			expect(result.children![0]!.type).toBe(NodeType.Heading);
			expect(result.children![1]!.type).toBe(NodeType.Paragraph);
			expect(result.children![2]!.type).toBe(NodeType.List);
			expect(result.children![3]!.type).toBe(NodeType.CodeBlock);
		});

		it("parses paragraph with mixed inline elements", () => {
			const md = "This has **bold**, *italic*, and `code`.";
			const result = parseMarkdown(md);
			const paraNode = result.children![0]!;
			expect(paraNode.children!.length).toBeGreaterThan(1);
			const types = paraNode.children!.map((n) => n.type);
			expect(types).toContain(NodeType.Strong);
			expect(types).toContain(NodeType.Emphasis);
			expect(types).toContain(NodeType.InlineCode);
		});

		it("parses callout with nested markdown", () => {
			const md = `> [!warning] Title
> **Bold text** in callout
> - list item`;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.Callout);
		});

		it("parses empty line handling", () => {
			const md = `Paragraph 1

Paragraph 2`;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(2);
			expect(result.children![0]!.type).toBe(NodeType.Paragraph);
			expect(result.children![1]!.type).toBe(NodeType.Paragraph);
		});

		it("parses multiline HTML comment", () => {
			const md = `<!--
This is a
multiline comment
-->`;
			const result = parseMarkdown(md);
			expect(result.children).toHaveLength(1);
			expect(result.children![0]!.type).toBe(NodeType.HtmlComment);
		});

		it("parses multiline Obsidian comment", () => {
			const md = `%%
This is a
multiline Obsidian comment
%%

Paragraph after`;
			const result = parseMarkdown(md);
			expect(result.children![0]!.type).toBe(NodeType.HtmlComment);
		});

		it("parses table with multiple rows", () => {
			const md = `| Header 1 | Header 2 |
| --- | --- |
| Row 1 Col 1 | Row 1 Col 2 |
| Row 2 Col 1 | Row 2 Col 2 |`;
			const result = parseMarkdown(md);
			const tableNode = result.children![0]! as TableNode;
			expect(tableNode.type).toBe(NodeType.Table);
			expect(tableNode.children.length).toBeGreaterThan(1);
		});

		it("preserves newlines in code block", () => {
			const md = `\`\`\`
line 1
line 2
line 3
\`\`\``;
			const result = parseMarkdown(md);
			const codeNode = result.children![0]!;
			expect(codeNode.value).toContain("line 1");
			expect(codeNode.value).toContain("line 2");
			expect(codeNode.value).toContain("line 3");
		});

		it("handles Windows line endings", () => {
			const md = "Line 1\r\nLine 2\r\nLine 3";
			const result = parseMarkdown(md);
			expect(result.children).toBeDefined();
		});

		it("handles Mac line endings", () => {
			const md = "Line 1\rLine 2\rLine 3";
			const result = parseMarkdown(md);
			expect(result.children).toBeDefined();
		});
	});
});
