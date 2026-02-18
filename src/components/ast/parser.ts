/**
 * Obsidian‑Flavoured Markdown → AST Parser
 * 解析顺序遵循块级规则 → 行内规则优先级。
 */

import {
	NodeType,
	MarkdownNode,
	TableNode,
	TableHeaderNode,
	TableRowNode,
	LinkType,
	FrontMatterNode,
	HtmlCommentNode,
	CodeBlockNode,
	MathBlockNode,
	CalloutTitleNode,
	CalloutNode,
	BlockQuoteNode,
	ListItemNode,
	ImageNode,
} from "./node";

/* ── 工具函数 ────────────────────────────────────────────────────────────── */
const splitTableRow = (row: string) => {
	let trimmed = row.trim();
	// 如果首尾都有管道符，或者看起来像表格行，去除首尾管道符
	if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
	if (trimmed.endsWith("|") && !trimmed.endsWith("\\|")) {
		// 简单的防转义检查，实际可能需要更复杂的逻辑
		trimmed = trimmed.slice(0, -1);
	}
	return trimmed.split("|").map((c) => c.trim());
};

/** 图片扩展名正则。 */
const IMG_EXT = /\.(png|jpg|jpeg|gif|svg|bmp|webp)$/i;

/* ── 块级解析 ────────────────────────────────────────────────────────────── */

export function parseMarkdown(src: string): MarkdownNode {
	const lines = src.replace(/\r\n?/g, "\n").split("\n");
	const root: MarkdownNode = { type: NodeType.Document, children: [] };
	const push = (node: MarkdownNode) => root.children!.push(node);
	let i = 0;

	/* ---------- Front‑matter ------------------------------------------- */
	if (lines[i] === "---") {
		const start = ++i;
		while (i < lines.length && lines[i] !== "---") i++;
		push({
			type: NodeType.FrontMatter,
			value: lines.slice(start, i).join("\n"),
		} as FrontMatterNode);
		if (i < lines.length) i++; // 跳过结束 ---
	}

	/* ---------- 主循环 -------------------------------------------------- */
	while (i < lines.length) {
		const line = lines[i]!;

		if (line.trim() === "") {
			i++;
			continue;
		}

		/* HTML / Obsidian 注释 */
		const commentStart = line.startsWith("<!--")
			? /-->\s*$/
			: line.startsWith("%%")
				? /%%\s*$/
				: null;
		if (commentStart) {
			const commentLines: string[] = [];
			while (i < lines.length) {
				commentLines.push(lines[i]!);
				const done = commentStart.test(lines[i]!);
				i++;
				if (done) break;
			}
			push({
				type: NodeType.HtmlComment,
				value: commentLines.join("\n"),
			} as HtmlCommentNode);
			continue;
		}

		/* 围栏代码块 ``` 或 ~~~ */
		const fenceMatch = /^(```|~~~)(.*)$/.exec(line);
		if (fenceMatch) {
			const [, fence, info] = fenceMatch;
			const codeLines: string[] = [];
			i++;
			while (i < lines.length && !lines[i]!.startsWith(fence!))
				codeLines.push(lines[i++]!);
			if (i < lines.length) i++;
			push({
				type: NodeType.CodeBlock,
				lang: info!.trim() || undefined,
				value: codeLines.join("\n"),
			} as CodeBlockNode);
			continue;
		}

		/* 数学块 $$ */
		if (line.startsWith("$$")) {
			const mathLines: string[] = [];
			i++;
			while (i < lines.length && !lines[i]!.startsWith("$$"))
				mathLines.push(lines[i++]!);
			if (i < lines.length) i++;
			push({
				type: NodeType.MathBlock,
				value: mathLines.join("\n"),
			} as MathBlockNode);
			continue;
		}

		/* Callout > [!type] */
		if (/^>\s*\[![^\]]+\]/.test(line)) {
			const calloutLines: string[] = [];
			while (i < lines.length) {
				const cur = lines[i]!;
				if (cur.trim() === "") {
					i++;
					break;
				}
				if (!/^>\s*/.test(cur)) break;
				calloutLines.push(cur);
				i++;
			}
			const firstLine = calloutLines[0]!.replace(/^>\s*/, "");
			const typeMatch = /^\[!([^\]]+)\]([-+]?)(.*)$/.exec(firstLine);
			const calloutType = typeMatch?.[1] ?? "note";
			const foldMark = typeMatch?.[2];
			const titleText = typeMatch?.[3]?.trim() ?? "";
			const auto_fold =
				foldMark === "-" ? true : foldMark === "+" ? false : undefined;

			const children: MarkdownNode[] = [];
			if (titleText) {
				children.push({
					type: NodeType.Paragraph,
					role: "title",
					children: parseInline(titleText),
				} as CalloutTitleNode);
			}
			const contentLines = calloutLines
				.slice(1)
				.map((l) => l.replace(/^>\s?/, ""))
				.join("\n");
			if (contentLines.trim())
				children.push(...(parseMarkdown(contentLines).children ?? []));

			push({
				type: NodeType.Callout,
				calloutType,
				auto_fold,
				children,
			} as CalloutNode);
			continue;
		}

		/* BlockQuote */
		if (/^>\s?/.test(line)) {
			const quoteLines: string[] = [];
			while (i < lines.length && /^>\s?/.test(lines[i]!))
				quoteLines.push(lines[i++]!.replace(/^>\s?/, ""));
			push({
				type: NodeType.BlockQuote,
				children: parseMarkdown(quoteLines.join("\n")).children,
			} as BlockQuoteNode);
			continue;
		}

		/* 列表 */
		const listMatch = /^([ \t]*)([-+*]|\d+\.)\s+/.exec(line);
		if (listMatch) {
			const { node: listNode, nextIdx } = parseList(
				lines,
				i,
				listMatch[1]!.length,
				0,
			);
			push(listNode);
			i = nextIdx;
			continue;
		}

		/* 水平线 */
		if (/^(\*\s*){3,}$|^(-\s*){3,}$|^(_\s*){3,}$/.test(line)) {
			push({ type: NodeType.HorizontalRule });
			i++;
			continue;
		}

		/* ATX Heading */
		const atx = /^(#{1,6})\s+(.*)$/.exec(line);
		if (atx) {
			push({
				type: NodeType.Heading,
				level: atx[1]!.length,
				children: parseInline(atx[2]!),
			});
			i++;
			continue;
		}

		/* Setext Heading */
		if (i + 1 < lines.length && /^(=+|-+)\s*$/.test(lines[i + 1]!)) {
			push({
				type: NodeType.Heading,
				level: lines[i + 1]![0] === "=" ? 1 : 2,
				children: parseInline(line.trim()),
			});
			i += 2;
			continue;
		}

		/* 表格 */
		// 定义一个更宽松的正则，允许类似 "--- | ---" 或 "| --- | --- |" 的格式
		// 逻辑：
		// ^ *\|?         -> 行首，允许空格，允许可选的 '|'
		// \s*:?-+:?\s*   -> 第一个单元格的分隔符 (如 "---" 或 ":-:")
		// (\|\s*:?-+:?\s*)+ -> 后续必须至少有一个以 '|' 开头的单元格分隔符
		// \|? * $        -> 行尾，允许可选的 '|' 和空格
		const tableSeparatorRegex =
			/^ *\|? *(:?-+:?) *(?:\| *(:?-+:?) *)+ *\|? *$/;

		if (
			line.includes("|") &&
			i + 1 < lines.length &&
			tableSeparatorRegex.test(lines[i + 1]!)
		) {
			const align = splitTableRow(lines[i + 1]!).map((cell) => {
				const s = cell.startsWith(":"),
					e = cell.endsWith(":");
				return s && e ? "center" : s ? "left" : e ? "right" : "none";
			});

			const header: TableHeaderNode = {
				type: NodeType.TableHeader,
				children: splitTableRow(line).map((cell) => ({
					type: NodeType.TableCell,
					children: parseInline(cell),
				})),
			};

			const rows: TableRowNode[] = [];
			i += 2;

			// 修改循环条件：只要行里有 '|' 就尝试解析，或者你可以用更复杂的逻辑判断是否结束
			while (
				i < lines.length &&
				lines[i]!.trim() !== "" &&
				lines[i]!.includes("|")
			) {
				rows.push({
					type: NodeType.TableRow,
					children: splitTableRow(lines[i++]!).map((cell) => ({
						type: NodeType.TableCell,
						children: parseInline(cell),
					})),
				});
			}

			push({
				type: NodeType.Table,
				align,
				children: [header, ...rows],
			} as TableNode);
			continue;
		}

		/* 脚注定义 */
		const footDef = /^\[\^([^\]]+)\]:\s+(.*)$/.exec(line);
		if (footDef) {
			push({
				type: NodeType.FootnoteDef,
				id: footDef[1]!,
				children: parseInline(footDef[2]!),
			});
			i++;
			continue;
		}

		/* HTML Block */
		if (/^<[a-zA-Z]/.test(line)) {
			const htmlLines: string[] = [];
			while (i < lines.length && lines[i]!.trim() !== "")
				htmlLines.push(lines[i++]!);
			push({ type: NodeType.HtmlBlock, value: htmlLines.join("\n") });
			continue;
		}

		/* 段落 */
		const paraLines: string[] = [];
		while (i < lines.length && lines[i]!.trim() !== "")
			paraLines.push(lines[i++]!);
		push({
			type: NodeType.Paragraph,
			children: parseInline(paraLines.join(" ")),
		});
	}

	return root;
}

/* ── 列表递归解析（模块级，避免重复创建函数）────────────────────────────── */

function parseList(
	lines: string[],
	startIdx: number,
	baseIndent: number,
	level: number,
): { node: MarkdownNode; nextIdx: number } {
	const LIST_RE = /^([ \t]*)([-+*]|\d+\.)\s+(.*)$/;
	const firstLi = LIST_RE.exec(lines[startIdx]!);
	const ordered = /\d+\./.test(firstLi?.[2] ?? "");
	const items: MarkdownNode[] = [];
	let i = startIdx;

	while (i < lines.length) {
		const cur = lines[i]!;
		if (cur.trim() === "") {
			i++;
			break;
		}

		const li = LIST_RE.exec(cur);
		if (!li) break;

		const indent = li[1]!.length;
		if (indent < baseIndent) break;

		if (indent > baseIndent) {
			const { node: subList, nextIdx } = parseList(
				lines,
				i,
				indent,
				level + 1,
			);
			const lastItem = items[items.length - 1];
			if (lastItem) {
				(lastItem.children ??= []).push(subList);
			}
			i = nextIdx;
			continue;
		}

		const taskMatch = /^\[( |x)\]\s+/.exec(li[3]!);
		const content = taskMatch ? li[3]!.slice(taskMatch[0].length) : li[3]!;
		const numMatch = ordered ? /^(\d+)\./.exec(li[2]!) : null;

		items.push({
			type: NodeType.ListItem,
			task: taskMatch ? taskMatch[1] === "x" : undefined,
			level,
			number: numMatch ? parseInt(numMatch[1]!, 10) : undefined,
			children: parseInline(content),
		} as ListItemNode);
		i++;
	}

	return {
		node: { type: NodeType.List, ordered, level, children: items },
		nextIdx: i,
	};
}

/* ── 行内解析器 ──────────────────────────────────────────────────────────── */

function parseInline(text: string): MarkdownNode[] {
	const nodes: MarkdownNode[] = [];
	let i = 0;
	let buf = "";

	const flush = () => {
		if (buf) {
			nodes.push({ type: NodeType.Text, value: buf });
			buf = "";
		}
	};

	const push = (node: MarkdownNode, advance: number) => {
		flush();
		nodes.push(node);
		i += advance;
	};

	/** 尝试匹配配对定界符，返回内容区间或 -1。 */
	const findClose = (delim: string, from: number): number =>
		text.indexOf(delim, from);

	while (i < text.length) {
		const ch = text[i]!;
		const rest = text.slice(i);

		/* 反斜杠转义 */
		if (ch === "\\" && i + 1 < text.length) {
			flush();
			nodes.push({ type: NodeType.EscapedChar, value: text[i + 1]! });
			i += 2;
			continue;
		}

		/* 行内代码 ` */
		if (ch === "`") {
			const end = findClose("`", i + 1);
			if (end !== -1) {
				push(
					{
						type: NodeType.InlineCode,
						value: text.slice(i + 1, end),
					},
					end + 1 - i,
				);
				continue;
			}
		}

		/* 行内数学 $ */
		if (ch === "$" && text[i + 1] !== "$") {
			const end = findClose("$", i + 1);
			if (end !== -1) {
				push(
					{ type: NodeType.MathSpan, value: text.slice(i + 1, end) },
					end + 1 - i,
				);
				continue;
			}
		}

		/* Wikilink / Embed ![[…]] 或 [[…]] */
		if (rest.startsWith("![[") || rest.startsWith("[[")) {
			const embed = rest.startsWith("![[");
			const offset = embed ? 3 : 2;
			const end = text.indexOf("]]", i + offset);
			if (end !== -1) {
				const content = text.slice(i + offset, end).trim();
				const pipeIdx = content.indexOf("|");
				const main =
					pipeIdx !== -1 ? content.slice(0, pipeIdx).trim() : content;
				const alias =
					pipeIdx !== -1
						? content.slice(pipeIdx + 1).trim()
						: undefined;
				const hashIdx = main.startsWith("#") ? 0 : main.indexOf("#");
				const file =
					hashIdx === 0
						? undefined
						: hashIdx !== -1
							? main.slice(0, hashIdx).trim()
							: main;
				const heading =
					hashIdx !== -1
						? main.slice(hashIdx === 0 ? 1 : hashIdx + 1).trim()
						: undefined;

				if (file && IMG_EXT.test(file)) {
					push(
						{
							type: NodeType.Image,
							alt: alias,
							url: file,
							description: undefined,
							wiki: true,
							embed,
						} as ImageNode,
						end + 2 - i,
					);
				} else {
					const linkType = embed
						? LinkType.Embed
						: heading && file
							? LinkType.External_Heading
							: heading
								? LinkType.Internal_Heading
								: LinkType.Article;
					push(
						{
							type: embed ? NodeType.Embed : NodeType.WikiLink,
							value: content,
							file,
							heading,
							alias,
							linkType,
						},
						end + 2 - i,
					);
				}
				continue;
			}
		}

		/* 脚注引用 [^ */
		if (rest.startsWith("[^")) {
			const end = text.indexOf("]", i + 2);
			if (end !== -1) {
				push(
					{ type: NodeType.FootnoteRef, id: text.slice(i + 2, end) },
					end + 1 - i,
				);
				continue;
			}
		}

		/* 图片 ![alt](url "desc") */
		const imgMatch =
			/^!\[([^\]]*)\]\(([^\s"']+)(?:\s+["'](.*?)["'])?\)/.exec(rest);
		if (imgMatch) {
			const [full, alt, url, description] = imgMatch;
			push(
				{
					type: NodeType.Image,
					alt,
					url,
					description: description || undefined,
					wiki: false,
					embed: true,
				} as ImageNode,
				full.length,
			);
			continue;
		}

		/* 链接 [label](url) */
		if (ch === "[") {
			const altEnd = text.indexOf("]", i + 1);
			if (altEnd !== -1) {
				const parenStart = text.indexOf("(", altEnd);
				const parenEnd =
					parenStart !== -1 ? text.indexOf(")", parenStart) : -1;
				if (parenEnd !== -1) {
					const label = text.slice(i + 1, altEnd);
					const url = text.slice(parenStart + 1, parenEnd);
					push(
						IMG_EXT.test(url)
							? ({
									type: NodeType.Image,
									alt: label,
									url,
									description: undefined,
									wiki: false,
									embed: false,
								} as ImageNode)
							: { type: NodeType.Link, label, url },
						parenEnd + 1 - i,
					);
					continue;
				}
			}
		}

		/* 高亮 ==text== */
		if (rest.startsWith("==")) {
			const end = findClose("==", i + 2);
			if (end !== -1) {
				push(
					{
						type: NodeType.Highlight,
						children: parseInline(text.slice(i + 2, end)),
					},
					end + 2 - i,
				);
				continue;
			}
		}

		/* 删除线 ~~ */
		if (rest.startsWith("~~")) {
			const end = findClose("~~", i + 2);
			if (end !== -1) {
				push(
					{
						type: NodeType.Strike,
						children: parseInline(text.slice(i + 2, end)),
					},
					end + 2 - i,
				);
				continue;
			}
		}

		/* 强调 *** / ** / * */
		let matched = false;
		for (const [delim, nodeType] of [
			["***", NodeType.StrongEmphasis],
			["**", NodeType.Strong],
		] as [string, NodeType][]) {
			if (rest.startsWith(delim)) {
				const end = findClose(delim, i + delim.length);
				if (end !== -1) {
					push(
						{
							type: nodeType,
							children: parseInline(
								text.slice(i + delim.length, end),
							),
						},
						end + delim.length - i,
					);
					matched = true;
					break;
				}
			}
		}
		if (matched) continue; // ← 关键：跳过后续的单 * 判断
		// 单 *（需单独处理，避免与 ** 冲突）
		if (ch === "*" && text[i + 1] !== "*") {
			const end = text.indexOf("*", i + 1);
			if (end !== -1) {
				push(
					{
						type: NodeType.Emphasis,
						children: parseInline(text.slice(i + 1, end)),
					},
					end + 1 - i,
				);
				continue;
			}
		}

		/* HTML inline */
		if (ch === "<") {
			const end = text.indexOf(">", i + 1);
			if (end !== -1) {
				push(
					{
						type: NodeType.HtmlInline,
						value: text.slice(i, end + 1),
					},
					end + 1 - i,
				);
				continue;
			}
		}

		/* 自动链接 */
		const auto = /^(https?:\/\/[^\s]+)/.exec(rest);
		if (auto) {
			push({ type: NodeType.AutoLink, url: auto[1]! }, auto[1]!.length);
			continue;
		}

		/* 默认文本 */
		buf += ch;
		i++;
	}

	flush();
	return nodes;
}
