import { InitFactory } from "hollywood-di"
import { Sade } from "sade"
import { Arg, ParsedArgs } from "./arg"
import { CommandError } from "./errors"
import { Flag, ParsedFlags } from "./flag"
import { CombineInitFactoryDeps, Spread } from "./utils/types"
import { validateArguments } from "./validate"

export type Command<
    Name extends string,
    Args extends Record<string, Arg<any, any>>,
    Flags extends Record<string, Flag<any, any, any>>,
    Container extends Record<string, any>,
    Single extends boolean,
> = InitFactory<Container, CommandDef<Name, Args, Flags, Single>>

export type ActionContext<A extends Record<string, Arg<any, any>>, F extends Record<string, Flag<any, any, any>>, C extends Record<string, any>> = {
    args: Spread<ParsedArgs<A>>
    flags: Spread<ParsedFlags<F>>
    container: C
}

class CommandDef<
    Name extends string,
    Args extends Record<string, Arg<any, any>>,
    Flags extends Record<string, Flag<any, any, any>>,
    Single extends boolean,
> {
    constructor(
        public name: Name,
        public description: string | undefined,
        public isSingle: Single,
        public isDefault: boolean,
        public aliases: string[],
        public examples: string[],
        public version: string | undefined = undefined,
        public help: string | undefined = undefined,
        public args: Args,
        public flags: Flags,
        public subcommands: Command<`${Name} ${string}`, any, any, any, Single>[],
        public action: (context: Pick<ActionContext<Args, Flags, any>, "args" | "flags">) => any | Promise<any>,
    ) { }

    public getCommandName() {
        // validate command arguments
        let hasOptional = false, hasVariadic = false
        const argsNames = Object.entries(this.args).map(([name, arg]) => {
            const argObj = Arg.toObject(arg)
            if (hasVariadic) {
                throw new CommandError("invalid_arg", `positional argument ${"`" + Arg.toString(arg, name) + "`"} cannot appear after a variadic argument`)
            }
            if (argObj.required && hasOptional) {
                throw new CommandError("invalid_arg", `required positional argument ${"`" + Arg.toString(arg, name) + "`"} cannot appear after an optional argument`)
            }
            hasOptional ||= !argObj.required
            hasVariadic ||= argObj.variadic
            return Arg.toString(arg, name)
        }).join(" ")

        return `${this.name} ${argsNames}`.trim()
    }

    public setupCommand(command: Sade) {
        // add command examples
        for (const example of this.examples) command.example(example)

        // register option flags
        for (const [name, flag] of Object.entries(this.flags)) {
            const flagObj = Flag.toObject(flag)
            if (flagObj.char && flagObj.char.length > 1) {
                throw new CommandError("invalid_flag", `option ${"`" + Flag.toString(flag, name) + "`"} char cannot be more than 1 character`)
            }
            command.option(Flag.toString(flag, name), flagObj.desc, flagObj.negate && true)
            if (flagObj.negate) {
                command.option(Flag.toNegatedString(flag, name), flagObj.negate)
            }
        }

        command.action((...fnArgs) => {
            const validated = validateArguments(this.args, this.flags, fnArgs)
            return this.action(validated)
        })
    }
}

class CommandBuilder<
    Name extends string,
    Args extends Record<string, Arg<any, any>>,
    Flags extends Record<string, Flag<any, any, any>>,
    Container extends Record<string, any>,
    Subcommands extends Command<`${Name} ${string}`, any, any, any, Single>[],
    Single extends boolean,
> {
    private _description: string | undefined = undefined
    private _isDefault: boolean = false
    private _aliases: string[] = []
    private _examples: string[] = []
    private _version: string | undefined = undefined
    private _help: string | undefined = undefined
    private _subcommands: Command<`${Name} ${string}`, any, any, any, Single>[] = []
    private _args: Record<string, Arg<any, any>> = {}
    private _flags: Record<string, Flag<any, any, any>> = {}

    constructor(public name: Name, public isSingle: Single) { }

    public describe(text: string) {
        this._description = text
        return this
    }

    public isDefault() {
        this._isDefault = true
        return this
    }

    public addAlias(...aliases: string[]) {
        this._aliases.push(...aliases)
        return this
    }

    public addExample(example: string) {
        this._examples.push(example)
        return this
    }

    public version(version: Single extends true ? string : never) {
        this._version = version
        return this
    }

    public help(help: Single extends true ? string : never) {
        this._help = help
        return this
    }

    public subcommands<S extends Command<`${Name} ${string}`, any, any, any, Single>[]>(
        ...commands: Single extends true ? never : S
    ): CommandBuilder<Name, Args, Flags, Container, S, Single> {
        this._subcommands = commands
        return this as unknown as CommandBuilder<Name, Args, Flags, Container, S, Single>
    }

    public args<A extends Record<string, Arg<any, any>>>(args: A): CommandBuilder<Name, A, Flags, Container, Subcommands, Single> {
        this._args = args
        return this as unknown as CommandBuilder<Name, A, Flags, Container, Subcommands, Single>
    }

    public flags<F extends Record<string, Flag<any, any, any>>>(flags: F): CommandBuilder<Name, Args, F, Container, Subcommands, Single> {
        this._flags = flags
        return this as unknown as CommandBuilder<Name, Args, F, Container, Subcommands, Single>
    }

    public action<C extends Record<string, any> = {}>(
        actionFn: (context: ActionContext<Args, Flags, C>) => any | Promise<any>
    ): Command<Name, Args, Flags, Spread<C & CombineInitFactoryDeps<Subcommands>>, Single> {
        return {
            init: (container) => {
                return new CommandDef(
                    this.name,
                    this._description,
                    this.isSingle,
                    this._isDefault,
                    this._aliases,
                    this._examples,
                    this._version,
                    this._help,
                    this._args as Args,
                    this._flags as Flags,
                    this._subcommands,
                    (ctx) => actionFn({ ...ctx, container }),
                )
            }
        }
    }
}

export function createCommand<Name extends string>(name: Name): CommandBuilder<Name, {}, {}, {}, [], false> {
    return new CommandBuilder(name, false)
}

export function createSingleCommand<Name extends string>(name: Name): CommandBuilder<Name, {}, {}, {}, [], true> {
    return new CommandBuilder(name, true)
}
