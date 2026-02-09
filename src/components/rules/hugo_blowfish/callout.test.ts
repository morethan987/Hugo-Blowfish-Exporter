import { describe, it, expect } from "vitest";
import { getCalloutAttributes } from "./callout";

describe("getCalloutAttributes", () => {
	it("note returns pencil icon", () => {
		const result = getCalloutAttributes("note");
		expect(result).toContain('icon="pencil"');
		expect(result).toContain('cardColor="#1E3A8A"');
		expect(result).toContain('textColor="#E0E7FF"');
	});

	it("info returns circle-info icon", () => {
		const result = getCalloutAttributes("info");
		expect(result).toContain('icon="circle-info"');
		expect(result).toContain('cardColor="#b0c4de"');
		expect(result).toContain('textColor="#333333"');
	});

	it("todo returns square-check icon", () => {
		const result = getCalloutAttributes("todo");
		expect(result).toContain('icon="square-check"');
		expect(result).toContain('iconColor="#4682B4"');
		expect(result).toContain('cardColor="#e0ffff"');
		expect(result).toContain('textColor="#333333"');
	});

	it("tip returns lightbulb icon", () => {
		const result = getCalloutAttributes("tip");
		expect(result).toContain('icon="lightbulb"');
		expect(result).toContain('cardColor="#fff5b7"');
		expect(result).toContain('textColor="#333333"');
	});

	it("hint returns same as tip", () => {
		const tipResult = getCalloutAttributes("tip");
		const hintResult = getCalloutAttributes("hint");
		expect(hintResult).toBe(tipResult);
	});

	it("important returns same as tip", () => {
		const tipResult = getCalloutAttributes("tip");
		const importantResult = getCalloutAttributes("important");
		expect(importantResult).toBe(tipResult);
	});

	it("success returns check icon", () => {
		const result = getCalloutAttributes("success");
		expect(result).toContain('icon="check"');
		expect(result).toContain('cardColor="#32CD32"');
		expect(result).toContain('textColor="#fff"');
		expect(result).toContain('iconColor="#ffffff"');
	});

	it("check returns same as success", () => {
		const successResult = getCalloutAttributes("success");
		const checkResult = getCalloutAttributes("check");
		expect(checkResult).toBe(successResult);
	});

	it("done returns same as success", () => {
		const successResult = getCalloutAttributes("success");
		const doneResult = getCalloutAttributes("done");
		expect(doneResult).toBe(successResult);
	});

	it("warning returns triangle-exclamation icon", () => {
		const result = getCalloutAttributes("warning");
		expect(result).toContain('icon="triangle-exclamation"');
		expect(result).toContain('cardColor="#ffcc00"');
		expect(result).toContain('textColor="#333333"');
		expect(result).toContain('iconColor="#8B6914"');
	});

	it("caution returns same as warning", () => {
		const warningResult = getCalloutAttributes("warning");
		const cautionResult = getCalloutAttributes("caution");
		expect(cautionResult).toBe(warningResult);
	});

	it("attention returns same as warning", () => {
		const warningResult = getCalloutAttributes("warning");
		const attentionResult = getCalloutAttributes("attention");
		expect(attentionResult).toBe(warningResult);
	});

	it("question returns circle-question icon", () => {
		const result = getCalloutAttributes("question");
		expect(result).toContain('icon="circle-question"');
		expect(result).toContain('cardColor="#ffeb3b"');
		expect(result).toContain('textColor="#333333"');
		expect(result).toContain('iconColor="#3b3b3b"');
	});

	it("help returns same as question", () => {
		const questionResult = getCalloutAttributes("question");
		const helpResult = getCalloutAttributes("help");
		expect(helpResult).toBe(questionResult);
	});

	it("faq returns same as question", () => {
		const questionResult = getCalloutAttributes("question");
		const faqResult = getCalloutAttributes("faq");
		expect(faqResult).toBe(questionResult);
	});

	it("danger returns fire icon", () => {
		const result = getCalloutAttributes("danger");
		expect(result).toContain('icon="fire"');
		expect(result).toContain('cardColor="#e63946"');
		expect(result).toContain('iconColor="#ffffff"');
		expect(result).toContain('textColor="#ffffff"');
	});

	it("error returns same as danger", () => {
		const dangerResult = getCalloutAttributes("danger");
		const errorResult = getCalloutAttributes("error");
		expect(errorResult).toBe(dangerResult);
	});

	it("example returns list icon", () => {
		const result = getCalloutAttributes("example");
		expect(result).toContain('icon="list"');
		expect(result).toContain('cardColor="#d8bfd8"');
		expect(result).toContain('iconColor="#8B008B"');
		expect(result).toContain('textColor="#333333"');
	});

	it("unknown type returns empty string", () => {
		const result = getCalloutAttributes("unknown");
		expect(result).toBe("");
	});

	it("case insensitive - NOTE works like note", () => {
		const lowerResult = getCalloutAttributes("note");
		const upperResult = getCalloutAttributes("NOTE");
		expect(upperResult).toBe(lowerResult);
	});

	it("case insensitive - Note works like note", () => {
		const lowerResult = getCalloutAttributes("note");
		const mixedResult = getCalloutAttributes("Note");
		expect(mixedResult).toBe(lowerResult);
	});

	it("case insensitive - TIP works like tip", () => {
		const lowerResult = getCalloutAttributes("tip");
		const upperResult = getCalloutAttributes("TIP");
		expect(upperResult).toBe(lowerResult);
	});

	it("case insensitive - Success works like success", () => {
		const lowerResult = getCalloutAttributes("success");
		const mixedResult = getCalloutAttributes("Success");
		expect(mixedResult).toBe(lowerResult);
	});

	it("case insensitive - WARNING works like warning", () => {
		const lowerResult = getCalloutAttributes("warning");
		const upperResult = getCalloutAttributes("WARNING");
		expect(upperResult).toBe(lowerResult);
	});

	it("returns complete attribute strings with all properties", () => {
		const noteResult = getCalloutAttributes("note");
		const parts = noteResult.split(" ");
		expect(parts.length).toBeGreaterThanOrEqual(3);
		expect(noteResult).toContain('icon=');
		expect(noteResult).toContain('cardColor=');
		expect(noteResult).toContain('textColor=');
	});

	it("attributes follow correct format with quotes", () => {
		const result = getCalloutAttributes("success");
		expect(result).toMatch(/icon="[^"]+"/);
		expect(result).toMatch(/cardColor="#[0-9A-Fa-f]{6}"/);
		expect(result).toMatch(/textColor="#[0-9A-Fa-f]{3,6}"/);
	});
});
