// 结点类型定义

export enum NodeType {
	// 文档根
	Document = "Document",
	// Front‑matter / 注释
	FrontMatter = "FrontMatter",
	HtmlComment = "HtmlComment",

	// 区块级元素
	CodeBlock = "CodeBlock",
	MathBlock = "MathBlock",
	Callout = "Callout",
	BlockQuote = "BlockQuote",
	List = "List",
	ListItem = "ListItem",
	HorizontalRule = "HorizontalRule",
	Heading = "Heading",
	Table = "Table",
	TableHeader = "TableHeader",
	TableRow = "TableRow",
	TableCell = "TableCell",
	FootnoteDef = "FootnoteDef",
	HtmlBlock = "HtmlBlock",
	Paragraph = "Paragraph",

	// 行内元素
	Text = "Text",
	InlineCode = "InlineCode",
	MathSpan = "MathSpan",
	WikiLink = "WikiLink",
	Embed = "Embed",
	FootnoteRef = "FootnoteRef",
	Image = "Image",
	Link = "Link",
	Highlight = "Highlight",
	Strike = "Strike",
	StrongEmphasis = "StrongEmphasis",
	Strong = "Strong",
	Emphasis = "Emphasis",
	HtmlInline = "HtmlInline",
	AutoLink = "AutoLink",
	EscapedChar = "EscapedChar",

	// 特殊节点
	Nop = "Nop", // 空结点，没有value属性
}

// 基础markdown结点结构
export interface MarkdownNode {
	type: NodeType;
	children?: MarkdownNode[];
	value?: string;
	// 额外属性（例如 heading level / list ordered 等）
	[key: string]: unknown;
}

// 表格节点结构
export interface TableNode extends MarkdownNode {
	type: NodeType.Table;
	align: string[];
	children: [
		TableHeaderNode, // 表头节点
		...TableRowNode[], // 数据行节点
	];
}

export interface TableHeaderNode extends MarkdownNode {
	type: NodeType.TableHeader;
	children: TableCellNode[];
}

export interface TableRowNode extends MarkdownNode {
	type: NodeType.TableRow;
	children: TableCellNode[];
}

export interface TableCellNode extends MarkdownNode {
	type: NodeType.TableCell;
	children: MarkdownNode[]; // 单元格内容
}

// Heading node
export interface HeadingNode extends MarkdownNode {
	type: NodeType.Heading;
	level: number;
}

// Code block node
export interface CodeBlockNode extends MarkdownNode {
	type: NodeType.CodeBlock;
	lang?: string;
}

// Callout node with typed children
export interface CalloutNode extends MarkdownNode {
	type: NodeType.Callout;
	calloutType: string;
	auto_fold: boolean | undefined;
	children?: CalloutChildNode[];
}

export interface CalloutChildNode extends MarkdownNode {
	role?: "title" | "content";
}

// List nodes
export interface ListNode extends MarkdownNode {
	type: NodeType.List;
	ordered: boolean;
}

export interface ListItemNode extends MarkdownNode {
	type: NodeType.ListItem;
	level: number;
	task?: boolean;
	number?: number;
}

// Link and Image nodes
export interface LinkNode extends MarkdownNode {
	type: NodeType.Link;
	url: string;
	label?: string;
}

export interface ImageNode extends MarkdownNode {
	type: NodeType.Image;
	url: string;
	alt?: string;
	title?: string;
	wiki: boolean;
	embed?: boolean;
}

export enum LinkType {
	Internal_Heading = "internal-heading",
	External_Heading = "external-heading",
	Embed = "embed",
	Article = "article",
}

// Wiki and Embed nodes
export interface WikiLinkNode extends MarkdownNode {
	type: NodeType.WikiLink;
	linkType?: LinkType;
	alias?: string;
	file?: string;
	heading?: string;
}

export interface EmbedNode extends MarkdownNode {
	type: NodeType.Embed;
	linkType?: LinkType;
	alias?: string;
	file?: string;
	heading?: string;
}

// Footnote nodes
export interface FootnoteRefNode extends MarkdownNode {
	type: NodeType.FootnoteRef;
	id: string;
}

export interface FootnoteDefNode extends MarkdownNode {
	type: NodeType.FootnoteDef;
	id: string;
}

// Other inline nodes
export interface AutoLinkNode extends MarkdownNode {
	type: NodeType.AutoLink;
	url: string;
}

export interface MathBlockNode extends MarkdownNode {
	type: NodeType.MathBlock;
}

export interface MathSpanNode extends MarkdownNode {
	type: NodeType.MathSpan;
}

// Union type for type narrowing
export type TypedMarkdownNode =
	| HeadingNode
	| CodeBlockNode
	| CalloutNode
	| ListNode
	| ListItemNode
	| LinkNode
	| ImageNode
	| WikiLinkNode
	| EmbedNode
	| FootnoteRefNode
	| FootnoteDefNode
	| AutoLinkNode
	| MathBlockNode
	| MathSpanNode
	| TableNode
	| TableHeaderNode
	| TableRowNode
	| TableCellNode
	| MarkdownNode; // fallback for untyped nodes
