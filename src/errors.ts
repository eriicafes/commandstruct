export class CommandError extends Error {
    constructor(
        public reason: "invalid_arg" | "invalid_flag",
        public message: string,
    ) {
        super(message)
    }
}
