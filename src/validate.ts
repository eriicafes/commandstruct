import { Arg, ParsedArgs } from "./arg"
import { CommandError } from "./errors"
import { Flag, ParsedFlags } from "./flag"

export function validateArguments<
    Args extends Record<string, Arg<any, any>> = {},
    Flags extends Record<string, Flag<any, any, any>> = {},
>(args: Args, flags: Flags, fnArgs: any[]) {
    // get args from function arguments and convert to object
    const parsedArgs = Object.keys(args).reduce((acc, name, index) => {
        acc[name as keyof ParsedArgs<Args>] = fnArgs[index]
        return acc
    }, {} as ParsedArgs<Args>)

    // get flags from last function argument
    const parsedFlags = fnArgs[fnArgs.length - 1] as ParsedFlags<Flags>

    // validate flags
    for (const [name, flag] of Object.entries(flags)) {
        const flagObj = Flag.toObject(flag)
        const key = (flagObj.preserveCase ? name : Flag.toKebabCase(name)) as keyof ParsedFlags<Flags>
        const value = parsedFlags[key]

        if (!flagObj.param) {
            // set missing boolean flags to false
            if (value === undefined) {
                // ignore negated flags
                if (Flag.isNegated(flagObj.preserveCase ? name : Flag.toKebabCase(name))) continue
                parsedFlags[key] = false as ParsedFlags<Flags>[keyof ParsedFlags<Flags>]
                if (flagObj.char) parsedFlags[flagObj.char as keyof ParsedFlags<Flags>] = false as ParsedFlags<Flags>[keyof ParsedFlags<Flags>]
            } else if (typeof value !== "boolean") {
                // set boolean flag to true for any value that is not a boolean or undefined
                parsedFlags[key] = true as ParsedFlags<Flags>[keyof ParsedFlags<Flags>]
                if (flagObj.char) parsedFlags[flagObj.char as keyof ParsedFlags<Flags>] = true as ParsedFlags<Flags>[keyof ParsedFlags<Flags>]
            }
            continue
        }

        if (value === undefined) {
            if (!flagObj.param.required) continue
            if (flagObj.param.default !== undefined) {
                parsedFlags[key] = flagObj.param.default as ParsedFlags<Flags>[keyof ParsedFlags<Flags>]
                if (flagObj.char) parsedFlags[flagObj.char as keyof ParsedFlags<Flags>] = flagObj.param.default as ParsedFlags<Flags>[keyof ParsedFlags<Flags>]
                continue
            }
            throw new CommandError("invalid_flag", `option ${"`" + Flag.toString(flag, name) + "`"} value is missing`)
        }

        if (flagObj.param.type === "string" && typeof value !== "string") {
            if (typeof value !== "object") {
                // fail if no value was passed to flag
                if (value === true) throw new CommandError("invalid_flag", `option ${"`" + Flag.toString(flag, name) + "`"} value is missing`)

                const parsedValue = String(value) as ParsedFlags<Flags>[keyof ParsedFlags<Flags>]
                // modify flag fields including char field if available
                parsedFlags[key] = parsedValue
                if (flagObj.char) parsedFlags[flagObj.char as keyof ParsedFlags<Flags>] = parsedValue
            } else if (Array.isArray(value)) {
                // get last element of array
                const val = value[value.length - 1]
                const parsedValue = (val === true ? "" : String(val)) as ParsedFlags<Flags>[keyof ParsedFlags<Flags>]
                // modify flag fields including char field if available
                parsedFlags[key] = parsedValue
                if (flagObj.char) parsedFlags[flagObj.char as keyof ParsedFlags<Flags>] = parsedValue
            } else {
                throw new CommandError("invalid_flag", `option ${"`" + Flag.toString(flag, name) + "`"} value is not a string`)
            }
        }

        if (flagObj.param.type === "number" && typeof value !== "number") {
            // parse value to number
            const parsedValue = Number(value) as ParsedFlags<Flags>[keyof ParsedFlags<Flags>]
            // throw error if parsing fails
            if (typeof value !== "string" || Number.isNaN(parsedValue)) {
                throw new CommandError("invalid_flag", `option ${"`" + Flag.toString(flag, name) + "`"} value is not a number`)
            }
            // modify flag fields including char field if available
            parsedFlags[key] = parsedValue
            if (flagObj.char) parsedFlags[flagObj.char as keyof ParsedFlags<Flags>] = parsedValue
        }

        if (flagObj.param.type === "array") {
            if (Array.isArray(value)) {
                const parsedValue = value.map((val) => val === true ? "" : String(val)) as ParsedFlags<Flags>[keyof ParsedFlags<Flags>]
                // modify flag fields including char field if available
                parsedFlags[key] = parsedValue
                if (flagObj.char) parsedFlags[flagObj.char as keyof ParsedFlags<Flags>] = parsedValue
            } else {
                // check if value is a string instead of array
                if (typeof value === "object") throw new CommandError("invalid_flag", `option ${"`" + Flag.toString(flag, name) + "`"} value is not an array`)
                // parsed value is an array containing just that string
                const parsedValue = [value === true ? "" : String(value)] as ParsedFlags<Flags>[keyof ParsedFlags<Flags>]
                // modify flag fields including char field if available
                parsedFlags[key] = parsedValue
                if (flagObj.char) parsedFlags[flagObj.char as keyof ParsedFlags<Flags>] = parsedValue
            }
        }
    }

    return {
        args: parsedArgs,
        flags: parsedFlags,
    }
}
