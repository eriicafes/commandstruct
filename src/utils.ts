import { Sade } from "sade"
import { Arg, ParsedArgs } from "./arg"
import { CommandError } from "./errors"
import { Flag, ParsedFlags } from "./flag"

export function registerFlags(program: Sade, flags: Record<string, Flag>) {
    for (const [name, flag] of Object.entries(flags)) {
        const flagObj = Flag.toObject(flag)
        if (flagObj.char !== undefined && flagObj.char.length !== 1) {
            throw new CommandError("invalid_flag", `option ${"`" + Flag.toString(flag, name) + "`"} char must be 1 character`)
        }
        if (flagObj.param && flagObj.negate !== undefined) {
            throw new CommandError("invalid_flag", `negated option ${name} ${"`" + Flag.toString(flag, name) + "`"} cannot have param`)
        }
        const key = flagObj.preserveCase ? name : Flag.toKebabCase(name)
        if (Flag.isNegated(key)) {
            if (flagObj.param) {
                throw new CommandError("invalid_flag", `negated option ${name} ${"`" + Flag.toString(flag, name) + "`"} cannot have param`)
            }
            if (flagObj.char !== undefined) {
                throw new CommandError("invalid_flag", `negated option ${name} ${"`" + Flag.toString(flag, name) + "`"} cannot have char`)
            }
            if (flagObj.negate !== undefined) {
                throw new CommandError("invalid_flag", `negated option ${name} ${"`" + Flag.toString(flag, name) + "`"} is already negated`)
            }
            const existingKey = flags[key.slice(3)]
            if (existingKey && Flag.toObject(existingKey).param) {
                throw new CommandError("invalid_flag", `negated option ${name} ${"`" + Flag.toString(flag, name) + "`"} can only be used with boolean flags`)
            }
        }
        program.option(Flag.toString(flag, name), flagObj.desc, flagObj.negate && true)
        if (flagObj.negate !== undefined) {
            program.option(Flag.toNegatedString(flag, name), flagObj.negate)
        }
    }
}

export function commandUsage(baseCmd: string | undefined, cmd: string, args: Record<string, Arg>) {
    let usage = cmd
    if (baseCmd) usage = baseCmd + " " + cmd

    let hasOptional = false
    for (const [name, arg] of Object.entries(args)) {
        const argObj = Arg.toObject(arg)
        if (argObj.type === "required" && hasOptional) {
            throw new CommandError("invalid_arg", `required positional argument ${"`" + Arg.toString(arg, name) + "`"} cannot appear after an optional argument`)
        }
        hasOptional ||= argObj.type === "optional"
        usage += " " + Arg.toString(arg, name)
    }

    return usage
}

export function commandContext<
    Args extends Record<string, Arg> = {},
    Flags extends Record<string, Flag> = {},
>(args: Args, flags: Flags, fnArgs: any[]) {
    // get args from function arguments and convert to object
    const _args = Object.keys(args).reduce((acc, name, index) => {
        acc[name] = fnArgs[index]
        return acc
    }, {} as any)

    // get flags from last function argument
    const { _, ...opts } = fnArgs[fnArgs.length - 1]

    // validate flags
    for (const [name, flag] of Object.entries(flags)) {
        const flagObj = Flag.toObject(flag)
        const key = (flagObj.preserveCase ? name : Flag.toKebabCase(name))
        const value = opts[key]

        if (!flagObj.param) {
            // delete negated keys
            if (flagObj.negate || Flag.isNegated(key)) {
                const negatedKey = (flagObj.negate ? `no-${key}` : key)
                delete opts[negatedKey]
            }
            // set missing boolean flags to false
            if (value === undefined) {
                // handle negated flags specially
                if (Flag.isNegated(key)) {
                    const negatedKey = (key).slice(3)
                    if (opts[negatedKey] === undefined) {
                        opts[negatedKey] = true
                    }
                    continue
                }
                opts[key] = false
                if (flagObj.char) opts[flagObj.char] = false
            } else if (typeof value !== "boolean") {
                // set boolean flag to true for any value that is not a boolean or undefined
                opts[key] = true
                if (flagObj.char) opts[flagObj.char] = true
            }
            continue
        }

        if (value === undefined) {
            if (flagObj.param._type === "optional") {
                if (flagObj.param.defaultValue !== undefined) {
                    opts[key] = flagObj.param.defaultValue
                    if (flagObj.char) opts[flagObj.char] = flagObj.param.defaultValue
                }
                continue
            }
            throw new CommandError("invalid_flag", `option ${"`" + Flag.toString(flag, name) + "`"} value is missing`)
        }

        if (flagObj.param.type === "string" && typeof value !== "string") {
            if (typeof value !== "object") {
                // fail if no value was passed to flag
                if (value === true || value === undefined) throw new CommandError("invalid_flag", `option ${"`" + Flag.toString(flag, name) + "`"} value is missing`)

                const parsedValue = String(value)
                // modify flag fields including char field if available
                opts[key] = parsedValue
                if (flagObj.char) opts[flagObj.char] = parsedValue
            } else if (Array.isArray(value)) {
                // get last element of array
                const val = value[value.length - 1]
                const parsedValue = (val === true ? "" : String(val))
                // modify flag fields including char field if available
                opts[key] = parsedValue
                if (flagObj.char) opts[flagObj.char] = parsedValue
            } else {
                throw new CommandError("invalid_flag", `option ${"`" + Flag.toString(flag, name) + "`"} value is not a string`)
            }
        }

        if (flagObj.param.type === "number" && typeof value !== "number") {
            // parse value to number
            const parsedValue = Number(value)
            // throw error if parsing fails
            if (typeof value !== "string" || Number.isNaN(parsedValue)) {
                throw new CommandError("invalid_flag", `option ${"`" + Flag.toString(flag, name) + "`"} value is not a number`)
            }
            // modify flag fields including char field if available
            opts[key] = parsedValue
            if (flagObj.char) opts[flagObj.char] = parsedValue
        }

        if (flagObj.param.type === "array") {
            if (Array.isArray(value)) {
                const parsedValue = value.map((val) => val === true ? "" : String(val))
                // modify flag fields including char field if available
                opts[key] = parsedValue
                if (flagObj.char) opts[flagObj.char] = parsedValue
            } else {
                // check if value is a string instead of array
                if (typeof value === "object" || value === true) throw new CommandError("invalid_flag", `option ${"`" + Flag.toString(flag, name) + "`"} value is not an array`)
                // parsed value is an array containing just that string
                const parsedValue = [String(value)]
                // modify flag fields including char field if available
                opts[key] = parsedValue
                if (flagObj.char) opts[flagObj.char] = parsedValue
            }
        }
    }

    return {
        args: _args as ParsedArgs<Args>,
        flags: opts as ParsedFlags<Flags>,
        restArgs: _ as string[],
    }
}
