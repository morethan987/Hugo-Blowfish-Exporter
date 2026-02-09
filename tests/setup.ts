/**
 * Vitest global setup file
 * This file runs before each test file
 */

import { beforeEach, vi } from "vitest";

// Clear all mocks before each test
beforeEach(() => {
	vi.clearAllMocks();
});

// Mock console methods if needed for cleaner test output
// Uncomment if tests are too noisy
// vi.spyOn(console, 'log').mockImplementation(() => {});
// vi.spyOn(console, 'warn').mockImplementation(() => {});

// Global test utilities can be added here
