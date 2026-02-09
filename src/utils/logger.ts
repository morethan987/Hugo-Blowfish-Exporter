export type LogLevel = "debug" | "warn" | "error";

export interface Logger {
	debug: (message: string, ...args: unknown[]) => void;
	warn: (message: string, ...args: unknown[]) => void;
	error: (message: string, ...args: unknown[]) => void;
}

export function createLogger(tag: string): Logger {
	const formatMessage = (level: LogLevel, message: string): string => {
		const timestamp = new Date().toISOString().slice(11, 23);
		return `[${timestamp}] [${level.toUpperCase()}] [${tag}] ${message}`;
	};

	return {
		debug: (message: string, ...args: unknown[]): void => {
			console.debug(formatMessage("debug", message), ...args);
		},
		warn: (message: string, ...args: unknown[]): void => {
			console.warn(formatMessage("warn", message), ...args);
		},
		error: (message: string, ...args: unknown[]): void => {
			console.error(formatMessage("error", message), ...args);
		},
	};
}

export class Log {
	static debug = (tag: string, message: string, ...args: unknown[]): void => {
		console.debug(`[DEBUG] [${tag}] ${message}`, ...args);
	};

	static warn = (tag: string, message: string, ...args: unknown[]): void => {
		console.warn(`[WARN] [${tag}] ${message}`, ...args);
	};

	static error = (tag: string, message: string, ...args: unknown[]): void => {
		console.error(`[ERROR] [${tag}] ${message}`, ...args);
	};
}
