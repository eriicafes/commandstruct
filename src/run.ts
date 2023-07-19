import { Sade } from "sade";
import { CommandError } from "./errors";

export type RunOptions = {
    errorOnUnknown?: boolean | ((flag: string) => string)
    onError?(err: any): void
}

export async function run(cli: Sade, options?: RunOptions, argv = process.argv) {
    try {
        const output = cli.parse(argv, {
            lazy: true,
            unknown: options?.errorOnUnknown === true
                // will execute default unknown callback if true
                ? (() => { })
                // executes provided callback or allows unknown if undefined
                : options?.errorOnUnknown === false ? undefined : options?.errorOnUnknown,
        });
        const res = await output.handler.apply(null, output.args)
        return res
    } catch (err) {
        if (process.exitCode === undefined) process.exitCode = 1
        if (options?.onError) options.onError(err)
        else if (err instanceof CommandError) console.error("error:", err.message)
        else throw err
    }
}
