import { describe, it, expect } from "vitest";
import { get_error_message, get_error_stack } from "./utils";

describe("get_error_message", () => {
	it("returns message from Error instance", () => {
		const error = new Error("Test error message");
		expect(get_error_message(error)).toBe("Test error message");
	});

	it("returns string directly when error is string", () => {
		const errorString = "String error message";
		expect(get_error_message(errorString)).toBe("String error message");
	});

	it("returns default message for null", () => {
		expect(get_error_message(null)).toBe("An unknown error occurred.");
	});

	it("returns default message for undefined", () => {
		expect(get_error_message(undefined)).toBe("An unknown error occurred.");
	});

	it("returns default message for number", () => {
		expect(get_error_message(42)).toBe("An unknown error occurred.");
	});

	it("returns default message for object", () => {
		expect(get_error_message({ custom: "object" })).toBe("An unknown error occurred.");
	});
});

describe("get_error_stack", () => {
	it("returns stack from Error instance with stack", () => {
		const error = new Error("Test error");
		const stack = get_error_stack(error);
		expect(stack).toContain("Test error");
		expect(stack.length > 0).toBe(true);
	});

	it("returns fallback when Error has no stack", () => {
		const error = new Error("No stack error");
		error.stack = undefined;
		expect(get_error_stack(error)).toBe("No stack trace available.");
	});

	it("returns fallback for string error", () => {
		expect(get_error_stack("string error")).toBe("No stack trace available.");
	});

	it("returns fallback for null", () => {
		expect(get_error_stack(null)).toBe("No stack trace available.");
	});

	it("returns fallback for undefined", () => {
		expect(get_error_stack(undefined)).toBe("No stack trace available.");
	});

	it("returns fallback for number", () => {
		expect(get_error_stack(123)).toBe("No stack trace available.");
	});
});
