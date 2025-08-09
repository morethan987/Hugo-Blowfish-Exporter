import { RuleBuilder } from 'src/components/ast/rule';
import { NodeType } from 'src/components/ast/node';

export const imageRuleHugo = new RuleBuilder('图片链接转换')
    .describe('将图片链接转换为对应的hugo简码')
    .matchType(NodeType.Image)
    .transform((node, context) => {
        if (!context.data.imageFiles) context.data.imageFiles = [];
        context.data.imageFiles.push(node.url);
        node.url = context.data.settings.imageExportPath + '/' + node.url
        return node;
    })
    .build();
