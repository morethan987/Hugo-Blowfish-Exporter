import { NodeType, MarkdownNode } from "src/components/ast/node";
import { RuleBuilder } from "src/components/ast/rule";


export const calloutRuleHugo = new RuleBuilder('callout转换')
  .describe('将callout块转换为对应的hugo简码')
  .matchType(NodeType.Callout)
  .transform((node, context) => {
    const type = (node.calloutType as string) || 'note';
    const processor = (context as any).processor;
    
    // 统一处理children
    let callout_children: MarkdownNode[] = [];
    if (node.children && processor) {
      node.children.map(child => {
        if (child.role === 'title') {
          // 如果是标题节点，直接跳过
          return '';
        }
        callout_children.push(processor.executor.execute(child, context)); // 递归解析
      });
    }
    
    const attributes = getCalloutAttributes(type);
    const front_wrapper = {
      type: NodeType.Text,
      value: `\n{{< alert ${attributes} >}}\n`
    };
    const back_wrapper = {
      type: NodeType.Text,
      value: `{{< /alert >}}\n`
    };

    return {
      type: NodeType.Nop,
      children: [front_wrapper, ...callout_children, back_wrapper]
    };
  })
  .build();

export function getCalloutAttributes(type: string): string {
    switch (type.toLowerCase()) {
        case 'note':
            return 'icon="pencil" cardColor="#1E3A8A" textColor="#E0E7FF"';
        case 'info':
            return 'icon="circle-info" cardColor="#b0c4de" textColor="#333333"';
        case 'todo':
            return 'icon="square-check" iconColor="#4682B4" cardColor="#e0ffff" textColor="#333333"';
        case 'tip':
        case 'hint':
        case 'important':
            return 'icon="lightbulb" cardColor="#fff5b7" textColor="#333333"';
        case 'success':
        case 'check':
        case 'done':
            return 'icon="check" cardColor="#32CD32" textColor="#fff" iconColor="#ffffff"';
        case 'warning':
        case 'caution':
        case 'attention':
            return 'icon="triangle-exclamation" cardColor="#ffcc00" textColor="#333333" iconColor="#8B6914"';
        case 'question':
        case 'help':
        case 'faq':
            return 'icon="circle-question" cardColor="#ffeb3b" textColor="#333333" iconColor="#3b3b3b"';
        case 'danger':
        case 'error':
            return 'icon="fire" cardColor="#e63946" iconColor="#ffffff" textColor="#ffffff"';
        case 'example':
            return 'icon="list" cardColor="#d8bfd8" iconColor="#8B008B" textColor="#333333"';
        default:
            return '';

    }
}