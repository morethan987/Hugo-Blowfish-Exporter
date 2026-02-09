import { RuleBuilder } from "components/ast/rule";
import { NodeType } from "components/ast/node";
import { App } from "obsidian";
import { imageToBase64 } from "components/rules/utils";

export const imageRuleWechat = new RuleBuilder("图片转换为HTML")
	.describe("将图片转换为HTML格式")
	.matchType(NodeType.Image)
	.transform(async (node, context) => {
		const imageFile = node.url as string;
		const alt = (node.alt as string) || "";
		const app = context.data?.app as App | undefined;
		if (!app) return node;

		const img_base64 = await imageToBase64(app, imageFile);

		// 如果有标题，包装在figure中
		if (node.title) {
			return {
				type: NodeType.HtmlBlock,
				value: `<figure><img src="${img_base64}" alt="${alt}"><figcaption>${(node.title as string)}</figcaption></figure>`,
			};
		}

		return {
			type: NodeType.HtmlInline,
			value: `<img src="${img_base64}" alt="${alt}">`,
		};
	})
	.build();
