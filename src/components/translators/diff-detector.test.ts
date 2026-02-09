import { describe, it, expect } from "vitest";

interface DiffChange {
	oldStart: number;
	oldCount: number;
	newStart: number;
	newCount: number;
	removedLines: string[];
	addedLines: string[];
}

interface GitDiffResult {
	hasChanges: boolean;
	changes: DiffChange[];
}

function parseDiffOutput(diffOutput: string): GitDiffResult {
	const lines = diffOutput.split("\n");
	const changes: DiffChange[] = [];
	let currentChange: DiffChange | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line === undefined) {
			continue;
		}

		if (line.startsWith("@@")) {
			const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@.*$/);

			if (match && match[1] && match[3]) {
				if (currentChange) {
					changes.push(currentChange);
				}

				currentChange = {
					oldStart: parseInt(match[1]),
					oldCount: !match[2] ? 1 : parseInt(match[2]),
					newStart: parseInt(match[3]),
					newCount: !match[4] ? 1 : parseInt(match[4]),
					removedLines: [],
					addedLines: [],
				};
			}
		} else if (
			currentChange &&
			line.startsWith("-") &&
			!line.startsWith("---")
		) {
			const content = line.substring(1);
			currentChange.removedLines.push(content);
		} else if (
			currentChange &&
			line.startsWith("+") &&
			!line.startsWith("+++")
		) {
			const content = line.substring(1);
			currentChange.addedLines.push(content);
		}
	}

	if (currentChange) {
		changes.push(currentChange);
	}

	return {
		hasChanges: changes.length > 0,
		changes,
	};
}

describe("parseDiffOutput", () => {
	describe("basic parsing", () => {
		it("should return hasChanges: false for empty string", () => {
			const result = parseDiffOutput("");
			expect(result.hasChanges).toBe(false);
			expect(result.changes).toHaveLength(0);
		});

		it("should return hasChanges: false when no @@ markers present", () => {
			const diffOutput = `diff --git a/file.txt b/file.txt
--- a/file.txt
+++ b/file.txt`;
			const result = parseDiffOutput(diffOutput);
			expect(result.hasChanges).toBe(false);
			expect(result.changes).toHaveLength(0);
		});

		it("should parse single hunk with additions", () => {
			const diffOutput = `@@ -1,1 +1,2 @@
 unchanged
+added line`;
			const result = parseDiffOutput(diffOutput);
			expect(result.hasChanges).toBe(true);
			expect(result.changes).toHaveLength(1);
			expect(result.changes[0]?.addedLines).toEqual(["added line"]);
			expect(result.changes[0]?.removedLines).toEqual([]);
		});

		it("should parse single hunk with deletions", () => {
			const diffOutput = `@@ -1,2 +1,1 @@
 unchanged
-removed line`;
			const result = parseDiffOutput(diffOutput);
			expect(result.hasChanges).toBe(true);
			expect(result.changes).toHaveLength(1);
			expect(result.changes[0]?.removedLines).toEqual(["removed line"]);
			expect(result.changes[0]?.addedLines).toEqual([]);
		});

		it("should parse single hunk with both additions and deletions", () => {
			const diffOutput = `@@ -1,3 +1,4 @@
 unchanged line
-removed line
+added line 1
+added line 2
 another unchanged`;
			const result = parseDiffOutput(diffOutput);
			expect(result.hasChanges).toBe(true);
			expect(result.changes).toHaveLength(1);
			expect(result.changes[0]?.removedLines).toEqual(["removed line"]);
			expect(result.changes[0]?.addedLines).toEqual([
				"added line 1",
				"added line 2",
			]);
		});

		it("should parse multiple hunks in one diff", () => {
			const diffOutput = `@@ -1,1 +1,2 @@
 line 1
+added in first hunk
@@ -5,1 +6,2 @@
 line 5
+added in second hunk`;
			const result = parseDiffOutput(diffOutput);
			expect(result.hasChanges).toBe(true);
			expect(result.changes).toHaveLength(2);
			expect(result.changes[0]?.addedLines).toEqual(["added in first hunk"]);
			expect(result.changes[1]?.addedLines).toEqual(["added in second hunk"]);
		});
	});

	describe("line number parsing", () => {
		it("should parse oldStart correctly", () => {
			const diffOutput = `@@ -42,5 +50,6 @@
+added`;
			const result = parseDiffOutput(diffOutput);
			expect(result.changes[0]?.oldStart).toBe(42);
		});

		it("should parse newStart correctly", () => {
			const diffOutput = `@@ -1,5 +87,6 @@
+added`;
			const result = parseDiffOutput(diffOutput);
			expect(result.changes[0]?.newStart).toBe(87);
		});

		it("should parse oldCount when specified", () => {
			const diffOutput = `@@ -1,10 +1,10 @@
+added`;
			const result = parseDiffOutput(diffOutput);
			expect(result.changes[0]?.oldCount).toBe(10);
		});

		it("should parse newCount when specified", () => {
			const diffOutput = `@@ -1,5 +1,25 @@
+added`;
			const result = parseDiffOutput(diffOutput);
			expect(result.changes[0]?.newCount).toBe(25);
		});

		it("should use count=1 when oldCount not specified", () => {
			const diffOutput = `@@ -5 +5,2 @@
+added`;
			const result = parseDiffOutput(diffOutput);
			expect(result.changes[0]?.oldCount).toBe(1);
		});

		it("should use count=1 when newCount not specified", () => {
			const diffOutput = `@@ -1,2 +5 @@
+added`;
			const result = parseDiffOutput(diffOutput);
			expect(result.changes[0]?.newCount).toBe(1);
		});
	});

	describe("edge cases", () => {
		it("should ignore --- file header lines", () => {
			const diffOutput = `--- a/file.txt
@@ -1,1 +1,2 @@
+added`;
			const result = parseDiffOutput(diffOutput);
			expect(result.changes[0]?.removedLines).toEqual([]);
			expect(result.changes[0]?.addedLines).toEqual(["added"]);
		});

		it("should ignore +++ file header lines", () => {
			const diffOutput = `+++ b/file.txt
@@ -1,1 +1,2 @@
+added`;
			const result = parseDiffOutput(diffOutput);
			expect(result.changes[0]?.removedLines).toEqual([]);
			expect(result.changes[0]?.addedLines).toEqual(["added"]);
		});

		it("should handle diff with context info after @@", () => {
			const diffOutput = `@@ -10,5 +15,6 @@ function myFunction() {
+added line`;
			const result = parseDiffOutput(diffOutput);
			expect(result.hasChanges).toBe(true);
			expect(result.changes[0]?.newStart).toBe(15);
			expect(result.changes[0]?.addedLines).toEqual(["added line"]);
		});

		it("should handle empty lines in diff without breaking parsing", () => {
			const diffOutput = `@@ -1,3 +1,4 @@
 line 1

+added
 line 3`;
			const result = parseDiffOutput(diffOutput);
			expect(result.hasChanges).toBe(true);
			expect(result.changes[0]?.addedLines).toEqual(["added"]);
		});

		it("should correctly extract added line content", () => {
			const diffOutput = `@@ -1,1 +1,3 @@
 unchanged
+hello world
+another added line`;
			const result = parseDiffOutput(diffOutput);
			expect(result.changes[0]?.addedLines).toEqual([
				"hello world",
				"another added line",
			]);
		});

		it("should correctly extract removed line content", () => {
			const diffOutput = `@@ -1,3 +1,1 @@
 unchanged
-removed content
-another removed`;
			const result = parseDiffOutput(diffOutput);
			expect(result.changes[0]?.removedLines).toEqual([
				"removed content",
				"another removed",
			]);
		});

		it("should handle diff with spaces in added lines", () => {
			const diffOutput = `@@ -1,1 +1,2 @@
 unchanged
+   leading spaces`;
			const result = parseDiffOutput(diffOutput);
			expect(result.changes[0]?.addedLines).toEqual(["   leading spaces"]);
		});

		it("should handle diff with empty added line", () => {
			const diffOutput = `@@ -1,1 +1,2 @@
 unchanged
+`;
			const result = parseDiffOutput(diffOutput);
			expect(result.changes[0]?.addedLines).toEqual([""]);
		});

		it("should handle real-world diff example", () => {
			const diffOutput = `diff --git a/file.txt b/file.txt
--- a/file.txt
+++ b/file.txt
@@ -1,3 +1,4 @@
 unchanged line
-removed line
+added line 1
+added line 2
 another unchanged`;
			const result = parseDiffOutput(diffOutput);
			expect(result.hasChanges).toBe(true);
			expect(result.changes).toHaveLength(1);
			expect(result.changes[0]?.oldStart).toBe(1);
			expect(result.changes[0]?.oldCount).toBe(3);
			expect(result.changes[0]?.newStart).toBe(1);
			expect(result.changes[0]?.newCount).toBe(4);
			expect(result.changes[0]?.removedLines).toEqual(["removed line"]);
			expect(result.changes[0]?.addedLines).toEqual([
				"added line 1",
				"added line 2",
			]);
		});
	});
});
