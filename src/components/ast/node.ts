// 结点类型定义


export enum NodeType {
  // 文档根
  Document = 'Document',
  // Front‑matter / 注释
  FrontMatter = 'FrontMatter',
  HtmlComment = 'HtmlComment',

  // 区块级元素
  CodeBlock = 'CodeBlock',
  MathBlock = 'MathBlock',
  Callout = 'Callout',
  BlockQuote = 'BlockQuote',
  List = 'List',
  ListItem = 'ListItem',
  HorizontalRule = 'HorizontalRule',
  Heading = 'Heading',
  Table = 'Table',
  TableHeader = 'TableHeader',
  TableRow = 'TableRow',
  TableCell = 'TableCell',
  FootnoteDef = 'FootnoteDef',
  HtmlBlock = 'HtmlBlock',
  Paragraph = 'Paragraph',

  // 行内元素
  Text = 'Text',
  InlineCode = 'InlineCode',
  MathSpan = 'MathSpan',
  WikiLink = 'WikiLink',
  Embed = 'Embed',
  FootnoteRef = 'FootnoteRef',
  Image = 'Image',
  Link = 'Link',
  Highlight = 'Highlight',
  Strike = 'Strike',
  StrongEmphasis = 'StrongEmphasis',
  Strong = 'Strong',
  Emphasis = 'Emphasis',
  HtmlInline = 'HtmlInline',
  AutoLink = 'AutoLink',
  EscapedChar = 'EscapedChar',

  // 特殊节点
  Nop = 'Nop', // 空结点，没有value属性
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
    TableHeaderNode,    // 表头节点
    ...TableRowNode[]   // 数据行节点
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
  children: MarkdownNode[];  // 单元格内容
}