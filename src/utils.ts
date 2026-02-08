export function get_error_message(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	} else if (typeof error === "string") {
		return error;
	} else {
		return "An unknown error occurred.";
	}
}

export function get_error_stack(error: unknown): string {
	if (error instanceof Error) {
		return error.stack || "No stack trace available.";
	} else {
		return "No stack trace available.";
	}
}
