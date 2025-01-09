export class CalloutExporter {
    transformCallouts(content: string): string {
        // 识别代码块的位置
        const codeBlockPositions: {start: number, end: number}[] = [];
        const codeBlockRegex = /```[\s\S]*?```/g;
        let match: RegExpExecArray | null;
        while ((match = codeBlockRegex.exec(content)) !== null) {
            codeBlockPositions.push({
                start: match.index,
                end: match.index + match[0].length
            });
        }

        const calloutRegex = /^>\s*\[!(\w+)\]\s*(.*)?\n((?:>[^\n]*\n?)*)/gm;
        let result = '';
        let lastIndex = 0;

        while ((match = calloutRegex.exec(content)) !== null) {
            // 检查当前匹配是否在任何代码块内
            const isInCodeBlock = codeBlockPositions.some(pos => 
                match !== null && match.index >= pos.start && match.index < pos.end
            );

            if (isInCodeBlock) {
                // 如果在代码块内，保持原样
                result += content.slice(lastIndex, match.index + match[0].length);
            } else {
                // 如果不在代码块内，进行转换
                result += content.slice(lastIndex, match.index);
                const type = match[1];
                const contents = match[3];
                const cleanContents = this.cleanCalloutContent(contents);
                const contributes = this.getCalloutAttributes(type);
                result += this.generateCalloutHtml(cleanContents, contributes);
            }
            lastIndex = match.index + match[0].length;
        }

        // 添加剩余内容
        result += content.slice(lastIndex);
        return result;
    }

    private cleanCalloutContent(contents: string): string {
        return contents
            .split('\n')
            .map((line: string) => line.replace(/^>\s?/, '').trim())
            .filter((line: string) => line.length > 0)
            .join('\n');
    }

    private getCalloutAttributes(type: string): string {
        switch (type.toLowerCase()) {
            case 'note':
                return 'icon="pencil"';
            case 'info':
                return 'icon="circle-info"';
            case 'todo':
                return 'icon="square-check" iconColor="#F0FFFF" cardColor="#4682B4"';
            case 'tip':
            case 'hint':
            case 'important':
                return 'icon="lightbulb" cardColor="#7FFFD4" textColor="#696969"';
            case 'success':
            case 'check':
            case 'done':
                return 'icon="check" cardColor="#00EE00" textColor="#F0FFFF" iconColor="#F0FFFF"';
            case 'warning':
            case 'caution':
            case 'attention':
                return 'cardColor="#FFD700" iconColor="#8B6914" textColor="#696969"';
            case 'question':
            case 'help':
            case 'faq':
                return 'icon="circle-question" cardColor="#FF7F24" textColor="#F0FFFF"';
            case 'danger':
            case 'error':
                return 'icon="fire" cardColor="#e63946" iconColor="#1d3557" textColor="#f1faee"';
            case 'example':
                return 'icon="list" cardColor="#9370DB" iconColor="#8B008B" textColor="#F0FFFF"';
            default:
                return '';
        }
    }

    private generateCalloutHtml(content: string, attributes: string): string {
        return `{{< alert ${attributes} >}}
${content}
{{< /alert >}}`;
	}
}
