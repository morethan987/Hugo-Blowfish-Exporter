import { RuleBuilder, RuleContext } from "components/ast/rule";
import { NodeType, MarkdownNode, ImageNode } from "components/ast/node";
import { HugoBlowfishExporterSettings } from "types/settings";
import { App } from "obsidian";
import { copyImageFile } from "components/rules/utils";

export const imageRuleHugo = new RuleBuilder("图片链接转换")
	.describe("将图片链接转换为对应的hugo简码")
	.matchType(NodeType.Image)
	.transform(async (node: MarkdownNode, context?: RuleContext) => {
		const image = node as ImageNode;
		const app = context?.data?.app as App | undefined;
		const settings = context?.data?.settings as HugoBlowfishExporterSettings | undefined;
		const slug = context?.data?.slug as string | undefined;

		if (app && settings && slug && image.url) {
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			copyImageFile(
				app,
				image.url,
				settings,
				slug,
			);
			image.url = settings.imageExportPath + "/" + image.url;
		}
		return image;
	})
	.build();
