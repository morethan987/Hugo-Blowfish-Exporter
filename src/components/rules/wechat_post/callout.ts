import { NodeType, MarkdownNode } from "src/components/ast/node";
import { RuleBuilder } from "src/components/ast/rule";


export const calloutRuleWechat = new RuleBuilder('callout转换')
  .describe('将callout块转换为对应的Wechat Html Tag')
  .matchType(NodeType.Callout)
  .transform(async (node, context) => {
    const type = (node.calloutType as string) || 'note';
    const processor = (context as any).processor;
    
    // 提取标题和内容
    let title = '';
    let contentHtml = '';
    
    if (node.children && processor) {
      // 查找标题节点
      const titleNode = node.children.find((child: any) => child.role === 'title');
      if (titleNode && titleNode.children && titleNode.children.length > 0) {
        title = titleNode.children[0].value || '';
      }
      
      // 处理内容节点
      const contentNodes = node.children.filter((child: any) => child.role !== 'title');
      if (contentNodes.length > 0) {
        // 递归处理内容节点，生成HTML
        const processedContent = await Promise.all(contentNodes.map(async child => {
          const processed = await processor.executor.execute(child, context);
          return processor.astToHtml(processed)
        }));
        contentHtml = `<p class="callout-body">${processedContent.join('')}</p>`;
      }
    }
    
    // 生成完整的HTML字符串
    const fullHtml = `${getFrontWrapper(type, title)}${contentHtml}</blockquote>`;

    return {
      type: NodeType.HtmlBlock,
      value: fullHtml
    };
  })
  .build();

function getFrontWrapper(type: string, title: string): string {
    switch (type.toLowerCase()) {
      case 'note':
            return `<blockquote class="callout is-note"><p class="callout-title">
      <span class="callout-icon" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-line-icon lucide-pencil-line"><path d="M13 21h8"/><path d="m15 5 4 4"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
      </span>${title}
    </p>`;
        case 'info':
            return `<blockquote class="callout is-info"><p class="callout-title">
      <span class="callout-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info-icon lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
      </span>${title}
    </p>`;
        case 'todo':
            return `<blockquote class="callout is-todo"><p class="callout-title">
            <span class="callout-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-check-big-icon lucide-circle-check-big"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>            </span>${title}
            </p>`;
        case 'tip':
        case 'hint':
        case 'important':
            return `<blockquote class="callout is-tip"><p class="callout-title">
            <span class="callout-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flame-icon lucide-flame"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>            </span>${title}
            </p>`;
        case 'success':
        case 'check':
        case 'done':
            return `<blockquote class="callout is-success"><p class="callout-title">
      <span class="callout-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info-icon lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
      </span>${title}
    </p>`;
        case 'warning':
        case 'caution':
        case 'attention':
            return `<blockquote class="callout is-warning"><p class="callout-title">
      <span class="callout-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info-icon lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
      </span>${title}
    </p>`;
        case 'question':
        case 'help':
        case 'faq':
            return `<blockquote class="callout is-question"><p class="callout-title">
            <span class="callout-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-question-mark-icon lucide-circle-question-mark"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>            </span>${title}
            </p>`;
        case 'danger':
        case 'error':
            return `<blockquote class="callout is-danger"><p class="callout-title">
      <span class="callout-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info-icon lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
      </span>${title}
    </p>`;
        case 'example':
            return `<blockquote class="callout is-example"><p class="callout-title">
      <span class="callout-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-icon lucide-list"><path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/></svg>            </span>${title}
    </p>`;
        default:
            return `<blockquote class="callout is-note"><p class="callout-title">
      <span class="callout-icon" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-line-icon lucide-pencil-line"><path d="M13 21h8"/><path d="m15 5 4 4"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
      </span>${title}
    </p>`;
    }
}

