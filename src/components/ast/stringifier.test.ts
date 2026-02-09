import { describe, it, expect } from "vitest";
import { astToString, astToHtml } from "./stringifier";
import { NodeType, MarkdownNode } from "./node";

describe("astToString", () => {
	describe("basic document conversion", () => {
		it("converts empty document to empty string", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [],
			};
			expect(astToString(node)).toBe("");
		});

		it("converts document with no children to empty string", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
			};
			expect(astToString(node)).toBe("");
		});
	});

	describe("headings", () => {
		it("converts heading level 1 to markdown syntax", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Heading,
						level: 1,
						children: [{ type: NodeType.Text, value: "Title" }],
					},
				],
			};
			expect(astToString(node)).toBe("# Title\n");
		});

		it("converts heading level 2 to markdown syntax", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Heading,
						level: 2,
						children: [{ type: NodeType.Text, value: "Subtitle" }],
					},
				],
			};
			expect(astToString(node)).toBe("## Subtitle\n");
		});

		it("converts heading level 6 to markdown syntax", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Heading,
						level: 6,
						children: [{ type: NodeType.Text, value: "Deep" }],
					},
				],
			};
			expect(astToString(node)).toBe("###### Deep\n");
		});

		it("defaults to level 1 when level not specified", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Heading,
						children: [{ type: NodeType.Text, value: "Default" }],
					},
				],
			};
			expect(astToString(node)).toBe("# Default\n");
		});
	});

	describe("paragraphs", () => {
		it("converts paragraph to text with newline", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{ type: NodeType.Text, value: "Hello world" },
						],
					},
				],
			};
			expect(astToString(node)).toBe("Hello world\n");
		});

		it("converts empty paragraph to single newline", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [],
					},
				],
			};
			expect(astToString(node)).toBe("\n");
		});
	});

	describe("inline formatting", () => {
		it("converts bold text to **wrapped**", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.Strong,
								children: [
									{ type: NodeType.Text, value: "bold" },
								],
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe("**bold**\n");
		});

		it("converts italic text to *wrapped*", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.Emphasis,
								children: [
									{ type: NodeType.Text, value: "italic" },
								],
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe("*italic*\n");
		});

		it("converts strong+emphasis to ***wrapped***", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.StrongEmphasis,
								children: [
									{ type: NodeType.Text, value: "both" },
								],
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe("***both***\n");
		});

		it("converts inline code to `wrapped`", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.InlineCode,
								value: "code",
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe("`code`\n");
		});

		it("converts highlight text to ==wrapped==", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.Highlight,
								children: [
									{
										type: NodeType.Text,
										value: "highlighted",
									},
								],
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe("==highlighted==\n");
		});

		it("converts strike text to ~~wrapped~~", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.Strike,
								children: [
									{ type: NodeType.Text, value: "struck" },
								],
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe("~~struck~~\n");
		});
	});

	describe("code blocks", () => {
		it("converts code block with language", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.CodeBlock,
						lang: "javascript",
						value: "console.log('hello');",
					},
				],
			};
			expect(astToString(node)).toBe(
				"```javascript\nconsole.log('hello');\n```\n",
			);
		});

		it("converts code block without language", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.CodeBlock,
						value: "plain code",
					},
				],
			};
			expect(astToString(node)).toBe("```\nplain code\n```\n");
		});
	});

	describe("math", () => {
		it("converts math block to $$ wrapped", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.MathBlock,
						value: "x^2 + y^2 = z^2",
					},
				],
			};
			expect(astToString(node)).toBe("$$\nx^2 + y^2 = z^2\n$$\n");
		});

		it("converts math span to $ wrapped", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.MathSpan,
								value: "e=mc^2",
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe("$e=mc^2$\n");
		});
	});

	describe("links", () => {
		it("converts link to [label](url)", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.Link,
								label: "Click here",
								url: "https://example.com",
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe(
				"[Click here](https://example.com)\n",
			);
		});

		it("converts autolink to URL", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.AutoLink,
								url: "https://example.com",
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe("https://example.com\n");
		});
	});

	describe("images", () => {
		it("converts image with title", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.Image,
								alt: "alt text",
								url: "image.png",
								title: "Image Title",
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe(
				'[alt text](image.png "Image Title")\n',
			);
		});

		it("converts image without title", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.Image,
								alt: "alt text",
								url: "image.png",
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe("[alt text](image.png)\n");
		});

		it("converts embedded image with title", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.Image,
								alt: "alt text",
								url: "image.png",
								title: "Image Title",
								embed: true,
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe(
				'![alt text](image.png "Image Title" )\n',
			);
		});

		it("converts embedded image without title", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.Image,
								alt: "alt text",
								url: "image.png",
								embed: true,
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe("![alt text](image.png)\n");
		});
	});

	describe("wiki links", () => {
		it("converts wikilink to [[value]]", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.WikiLink,
								value: "Note Title",
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe("[[Note Title]]\n");
		});
	});

	describe("embeds", () => {
		it("converts embed to ![[value]]", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.Embed,
								value: "EmbeddedNote",
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe("![[EmbeddedNote]]\n");
		});
	});

	describe("lists", () => {
		it("converts unordered list items", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.List,
						ordered: false,
						children: [
							{
								type: NodeType.ListItem,
								level: 0,
								children: [
									{ type: NodeType.Text, value: "Item 1" },
								],
							},
							{
								type: NodeType.ListItem,
								level: 0,
								children: [
									{ type: NodeType.Text, value: "Item 2" },
								],
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe("- Item 1\n- Item 2\n");
		});

		it("converts ordered list items with numbers", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.List,
						ordered: true,
						children: [
							{
								type: NodeType.ListItem,
								level: 0,
								number: 1,
								children: [
									{ type: NodeType.Text, value: "First" },
								],
							},
							{
								type: NodeType.ListItem,
								level: 0,
								number: 2,
								children: [
									{ type: NodeType.Text, value: "Second" },
								],
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe("1. First\n2. Second\n");
		});

		it("converts task list items", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.List,
						ordered: false,
						children: [
							{
								type: NodeType.ListItem,
								level: 0,
								task: true,
								children: [
									{ type: NodeType.Text, value: "Done task" },
								],
							},
							{
								type: NodeType.ListItem,
								level: 0,
								task: false,
								children: [
									{
										type: NodeType.Text,
										value: "Pending task",
									},
								],
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe(
				"- [x] Done task\n- [ ] Pending task\n",
			);
		});

		it("converts nested lists", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.List,
						ordered: false,
						children: [
							{
								type: NodeType.ListItem,
								level: 0,
								children: [
									{ type: NodeType.Text, value: "Item 1" },
									{
										type: NodeType.List,
										ordered: false,
										children: [
											{
												type: NodeType.ListItem,
												level: 1,
												children: [
													{
														type: NodeType.Text,
														value: "Nested",
													},
												],
											},
										],
									},
								],
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe("- Item 1\n    - Nested\n");
		});
	});

	describe("blockquotes", () => {
		it("converts blockquote", () => {
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
										type: NodeType.Text,
										value: "Quote text",
									},
								],
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe("> Quote text\n\n");
		});
	});

	describe("callouts", () => {
		it("converts callout with title and content", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Callout,
						calloutType: "note",
						auto_fold: undefined,
						children: [
							{
								type: NodeType.Paragraph,
								role: "title",
								children: [
									{ type: NodeType.Text, value: "Title" },
								],
							},
							{
								type: NodeType.Paragraph,
								children: [
									{ type: NodeType.Text, value: "Content" },
								],
							},
						],
					},
				],
			};
			const result = astToString(node);
			expect(result).toContain("> [!note]");
		});
	});

	describe("callouts", () => {
		it("converts callout with auto fold on", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Callout,
						calloutType: "note",
						auto_fold: true,
						children: [
							{
								type: NodeType.Paragraph,
								role: "title",
								children: [
									{ type: NodeType.Text, value: "Title" },
								],
							},
							{
								type: NodeType.Paragraph,
								children: [
									{ type: NodeType.Text, value: "Content" },
								],
							},
						],
					},
				],
			};
			const result = astToString(node);
			expect(result).toContain("> [!note]-");
		});
	});

	describe("callouts", () => {
		it("converts callout with auto fold off", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Callout,
						calloutType: "note",
						auto_fold: false,
						children: [
							{
								type: NodeType.Paragraph,
								role: "title",
								children: [
									{ type: NodeType.Text, value: "Title" },
								],
							},
							{
								type: NodeType.Paragraph,
								children: [
									{ type: NodeType.Text, value: "Content" },
								],
							},
						],
					},
				],
			};
			const result = astToString(node);
			expect(result).toContain("> [!note]+");
		});
	});

	describe("horizontal rule", () => {
		it("converts horizontal rule to ---", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.HorizontalRule,
					},
				],
			};
			expect(astToString(node)).toBe("---\n");
		});
	});

	describe("tables", () => {
		it("converts table with alignment", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Table,
						align: ["left", "center", "right"],
						children: [
							{
								type: NodeType.TableRow,
								children: [
									{
										type: NodeType.TableCell,
										children: [
											{
												type: NodeType.Text,
												value: "Left",
											},
										],
									},
									{
										type: NodeType.TableCell,
										children: [
											{
												type: NodeType.Text,
												value: "Center",
											},
										],
									},
									{
										type: NodeType.TableCell,
										children: [
											{
												type: NodeType.Text,
												value: "Right",
											},
										],
									},
								],
							},
							{
								type: NodeType.TableRow,
								children: [
									{
										type: NodeType.TableCell,
										children: [
											{ type: NodeType.Text, value: "A" },
										],
									},
									{
										type: NodeType.TableCell,
										children: [
											{ type: NodeType.Text, value: "B" },
										],
									},
									{
										type: NodeType.TableCell,
										children: [
											{ type: NodeType.Text, value: "C" },
										],
									},
								],
							},
						],
					},
				],
			};
			const result = astToString(node);
			expect(result).toContain("Left | Center | Right");
			expect(result).toContain(":-----");
			expect(result).toContain("-----:");
		});
	});

	describe("footnotes", () => {
		it("converts footnote reference", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.FootnoteRef,
								id: "ref1",
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe("[^ref1]\n");
		});

		it("converts footnote definition", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.FootnoteDef,
						id: "def1",
						children: [
							{ type: NodeType.Text, value: "Footnote content" },
						],
					},
				],
			};
			expect(astToString(node)).toBe("[^def1]: Footnote content\n");
		});
	});

	describe("front matter", () => {
		it("converts front matter", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.FrontMatter,
						value: "title: Test\ndate: 2024",
					},
				],
			};
			expect(astToString(node)).toBe(
				"---\ntitle: Test\ndate: 2024\n---\n",
			);
		});
	});

	describe("escaped characters", () => {
		it("converts escaped character", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.EscapedChar,
								value: "*",
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe("\\*\n");
		});
	});

	describe("html content", () => {
		it("converts html inline", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.HtmlInline,
								value: "<span>HTML</span>",
							},
						],
					},
				],
			};
			expect(astToString(node)).toBe("<span>HTML</span>\n");
		});

		it("converts html block", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.HtmlBlock,
						value: "<div>HTML Block</div>",
					},
				],
			};
			expect(astToString(node)).toBe("<div>HTML Block</div>");
		});
	});

	describe("nop nodes", () => {
		it("converts nop node", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Nop,
						children: [{ type: NodeType.Text, value: "text" }],
					},
				],
			};
			expect(astToString(node)).toBe("text");
		});
	});
});

describe("astToHtml", () => {
	describe("document conversion", () => {
		it("wraps document in article tag", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [{ type: NodeType.Text, value: "Content" }],
					},
				],
			};
			const result = astToHtml(node);
			expect(result).toContain('<article class="md-doc">');
		});
	});

	describe("headings", () => {
		it("converts heading level 1 to h1 tag", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Heading,
						level: 1,
						children: [{ type: NodeType.Text, value: "Title" }],
					},
				],
			};
			expect(astToHtml(node)).toContain("<h1>Title</h1>");
		});

		it("converts heading level 2 to h2 tag", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Heading,
						level: 2,
						children: [{ type: NodeType.Text, value: "Subtitle" }],
					},
				],
			};
			expect(astToHtml(node)).toContain("<h2>Subtitle</h2>");
		});

		it("converts heading level 6 to h6 tag", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Heading,
						level: 6,
						children: [{ type: NodeType.Text, value: "Deep" }],
					},
				],
			};
			expect(astToHtml(node)).toContain("<h6>Deep</h6>");
		});

		it("clamps heading level to 1-6 range", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Heading,
						level: 10,
						children: [{ type: NodeType.Text, value: "Too deep" }],
					},
				],
			};
			expect(astToHtml(node)).toContain("<h6>");
		});
	});

	describe("inline formatting", () => {
		it("converts strong to <strong> tag", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.Strong,
								children: [
									{ type: NodeType.Text, value: "bold" },
								],
							},
						],
					},
				],
			};
			expect(astToHtml(node)).toContain("<strong>bold</strong>");
		});

		it("converts emphasis to <em> tag", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.Emphasis,
								children: [
									{ type: NodeType.Text, value: "italic" },
								],
							},
						],
					},
				],
			};
			expect(astToHtml(node)).toContain("<em>italic</em>");
		});

		it("converts strong+emphasis to <strong><em>", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.StrongEmphasis,
								children: [
									{ type: NodeType.Text, value: "both" },
								],
							},
						],
					},
				],
			};
			expect(astToHtml(node)).toContain("<strong><em>both</em></strong>");
		});

		it("converts highlight to <mark> tag", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.Highlight,
								children: [
									{
										type: NodeType.Text,
										value: "highlighted",
									},
								],
							},
						],
					},
				],
			};
			expect(astToHtml(node)).toContain("<mark>highlighted</mark>");
		});

		it("converts strike to <del> tag", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.Strike,
								children: [
									{ type: NodeType.Text, value: "struck" },
								],
							},
						],
					},
				],
			};
			expect(astToHtml(node)).toContain("<del>struck</del>");
		});
	});

	describe("code blocks", () => {
		it("converts code block to <pre><code> tags", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.CodeBlock,
						lang: "javascript",
						value: "console.log('hello');",
					},
				],
			};
			const result = astToHtml(node);
			expect(result).toContain('<pre><code class="language-javascript">');
			expect(result).toContain("hello");
			expect(result).toContain("</code></pre>");
		});

		it("converts code block without language", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.CodeBlock,
						value: "plain code",
					},
				],
			};
			const result = astToHtml(node);
			expect(result).toContain("<pre><code>plain code</code></pre>");
		});
	});

	describe("links", () => {
		it("converts link to <a> tag", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.Link,
								label: "Click here",
								url: "https://example.com",
							},
						],
					},
				],
			};
			expect(astToHtml(node)).toContain(
				'<a href="https://example.com">Click here</a>',
			);
		});

		it("converts autolink to <a> tag with URL as text", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.AutoLink,
								url: "https://example.com",
							},
						],
					},
				],
			};
			expect(astToHtml(node)).toContain(
				'<a href="https://example.com">https://example.com</a>',
			);
		});
	});

	describe("images", () => {
		it("converts image to <img> tag", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.Image,
								alt: "alt text",
								url: "image.png",
							},
						],
					},
				],
			};
			expect(astToHtml(node)).toContain(
				'<img src="image.png" alt="alt text">',
			);
		});

		it("includes title attribute when present", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.Image,
								alt: "alt text",
								url: "image.png",
								title: "Image Title",
							},
						],
					},
				],
			};
			expect(astToHtml(node)).toContain('title="Image Title"');
		});
	});

	describe("lists", () => {
		it("converts unordered list to <ul> tags", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.List,
						ordered: false,
						children: [
							{
								type: NodeType.ListItem,
								level: 0,
								children: [
									{ type: NodeType.Text, value: "Item 1" },
								],
							},
							{
								type: NodeType.ListItem,
								level: 0,
								children: [
									{ type: NodeType.Text, value: "Item 2" },
								],
							},
						],
					},
				],
			};
			const result = astToHtml(node);
			expect(result).toContain("<ul>");
			expect(result).toContain("<li>Item 1</li>");
			expect(result).toContain("<li>Item 2</li>");
			expect(result).toContain("</ul>");
		});

		it("converts ordered list to <ol> tags", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.List,
						ordered: true,
						children: [
							{
								type: NodeType.ListItem,
								level: 0,
								children: [
									{ type: NodeType.Text, value: "First" },
								],
							},
							{
								type: NodeType.ListItem,
								level: 0,
								children: [
									{ type: NodeType.Text, value: "Second" },
								],
							},
						],
					},
				],
			};
			const result = astToHtml(node);
			expect(result).toContain("<ol>");
			expect(result).toContain("</ol>");
		});

		it("converts task list with checkbox", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.List,
						ordered: false,
						children: [
							{
								type: NodeType.ListItem,
								level: 0,
								task: true,
								children: [
									{ type: NodeType.Text, value: "Done" },
								],
							},
							{
								type: NodeType.ListItem,
								level: 0,
								task: false,
								children: [
									{ type: NodeType.Text, value: "Pending" },
								],
							},
						],
					},
				],
			};
			const result = astToHtml(node);
			expect(result).toContain(
				'<input type="checkbox" checked disabled>',
			);
			expect(result).toContain('<input type="checkbox" disabled>');
		});

		it("converts nested list", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.List,
						ordered: false,
						children: [
							{
								type: NodeType.ListItem,
								level: 0,
								children: [
									{ type: NodeType.Text, value: "Item 1" },
									{
										type: NodeType.List,
										ordered: false,
										children: [
											{
												type: NodeType.ListItem,
												level: 1,
												children: [
													{
														type: NodeType.Text,
														value: "Nested",
													},
												],
											},
										],
									},
								],
							},
						],
					},
				],
			};
			const result = astToHtml(node);
			expect(result).toContain("<ul>");
			expect(result).toContain("<li>Item 1");
			expect(result).toContain("Nested");
		});
	});

	describe("blockquotes", () => {
		it("converts blockquote to <blockquote> tag", () => {
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
										type: NodeType.Text,
										value: "Quote text",
									},
								],
							},
						],
					},
				],
			};
			expect(astToHtml(node)).toContain("<blockquote>");
			expect(astToHtml(node)).toContain("</blockquote>");
		});
	});

	describe("callouts", () => {
		it("converts callout to div structure", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Callout,
						calloutType: "note",
						children: [
							{
								type: NodeType.Paragraph,
								role: "title",
								children: [
									{ type: NodeType.Text, value: "Title" },
								],
							},
							{
								type: NodeType.Paragraph,
								children: [
									{ type: NodeType.Text, value: "Content" },
								],
							},
						],
					},
				],
			};
			const result = astToHtml(node);
			expect(result).toContain('<div class="callout callout-note">');
			expect(result).toContain('<div class="callout-title">');
			expect(result).toContain('<div class="callout-content">');
		});
	});

	describe("tables", () => {
		it("converts table to HTML table structure", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Table,
						align: ["left", "center"],
						children: [
							{
								type: NodeType.TableRow,
								children: [
									{
										type: NodeType.TableCell,
										children: [
											{
												type: NodeType.Text,
												value: "Header 1",
											},
										],
									},
									{
										type: NodeType.TableCell,
										children: [
											{
												type: NodeType.Text,
												value: "Header 2",
											},
										],
									},
								],
							},
							{
								type: NodeType.TableRow,
								children: [
									{
										type: NodeType.TableCell,
										children: [
											{
												type: NodeType.Text,
												value: "Cell 1",
											},
										],
									},
									{
										type: NodeType.TableCell,
										children: [
											{
												type: NodeType.Text,
												value: "Cell 2",
											},
										],
									},
								],
							},
						],
					},
				],
			};
			const result = astToHtml(node);
			expect(result).toContain("<table>");
			expect(result).toContain("<thead>");
			expect(result).toContain("<th>Header 1</th>");
			expect(result).toContain("<tbody>");
			expect(result).toContain("<td>Cell 1</td>");
		});
	});

	describe("HTML escaping", () => {
		it("escapes special HTML characters in text", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.Text,
								value: "<script>alert('xss')</script>",
							},
						],
					},
				],
			};
			const result = astToHtml(node);
			expect(result).toContain("&lt;script&gt;");
			expect(result).not.toContain("<script>");
		});

		it("escapes ampersand in text", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [{ type: NodeType.Text, value: "A & B" }],
					},
				],
			};
			const result = astToHtml(node);
			expect(result).toContain("A &amp; B");
		});

		it("escapes quotes in URLs", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.Link,
								label: "Link",
								url: 'https://example.com?q="test"',
							},
						],
					},
				],
			};
			const result = astToHtml(node);
			expect(result).toContain("&quot;test&quot;");
		});
	});

	describe("math blocks", () => {
		it("converts math block to div with class", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.MathBlock,
						value: "x^2 + y^2 = z^2",
					},
				],
			};
			expect(astToHtml(node)).toContain('<div class="math-block">');
		});

		it("converts math span to span with class", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.MathSpan,
								value: "e=mc^2",
							},
						],
					},
				],
			};
			expect(astToHtml(node)).toContain('<span class="math-inline">');
		});
	});

	describe("wiki links and embeds", () => {
		it("converts wikilink to span with class", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.WikiLink,
								value: "Note Title",
							},
						],
					},
				],
			};
			expect(astToHtml(node)).toContain('<span class="wiki-link">');
		});

		it("converts embed to span with class", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.Embed,
								value: "EmbeddedNote",
							},
						],
					},
				],
			};
			expect(astToHtml(node)).toContain('<span class="embed">');
		});
	});

	describe("footnotes", () => {
		it("converts footnote reference to sup link", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.FootnoteRef,
								id: "ref1",
							},
						],
					},
				],
			};
			const result = astToHtml(node);
			expect(result).toContain("<sup>");
			expect(result).toContain("fnref");
		});

		it("converts footnote definition to div with id", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.FootnoteDef,
						id: "def1",
						children: [
							{ type: NodeType.Text, value: "Footnote content" },
						],
					},
				],
			};
			const result = astToHtml(node);
			expect(result).toContain('id="fn-def1"');
			expect(result).toContain("Footnote content");
		});
	});

	describe("horizontal rule", () => {
		it("converts horizontal rule to <hr>", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.HorizontalRule,
					},
				],
			};
			expect(astToHtml(node)).toContain("<hr>");
		});
	});

	describe("inline code", () => {
		it("converts inline code to <code> tag", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.InlineCode,
								value: "code",
							},
						],
					},
				],
			};
			expect(astToHtml(node)).toContain("<code>code</code>");
		});

		it("escapes special characters in inline code", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.InlineCode,
								value: "<tag>",
							},
						],
					},
				],
			};
			expect(astToHtml(node)).toContain("&lt;tag&gt;");
		});
	});

	describe("front matter", () => {
		it("converts front matter to pre tag", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.FrontMatter,
						value: "title: Test",
					},
				],
			};
			expect(astToHtml(node)).toContain('<pre class="frontmatter">');
		});
	});

	describe("escaped characters", () => {
		it("converts escaped character", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.EscapedChar,
								value: "*",
							},
						],
					},
				],
			};
			expect(astToHtml(node)).toContain("*");
		});
	});

	describe("html content passthrough", () => {
		it("passes through html inline without escaping", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.Paragraph,
						children: [
							{
								type: NodeType.HtmlInline,
								value: "<span>HTML</span>",
							},
						],
					},
				],
			};
			expect(astToHtml(node)).toContain("<span>HTML</span>");
		});

		it("passes through html block without escaping", () => {
			const node: MarkdownNode = {
				type: NodeType.Document,
				children: [
					{
						type: NodeType.HtmlBlock,
						value: "<div>HTML Block</div>",
					},
				],
			};
			expect(astToHtml(node)).toContain("<div>HTML Block</div>");
		});
	});
});
