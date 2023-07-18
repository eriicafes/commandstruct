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
> = InitFactory<Container, CommandDef<Name, Args, Flags>>

export type ActionContext<A extends Record<string, Arg<any, any>>, F extends Record<string, Flag<any, any, any>>, C extends Record<string, any>> = {
    args: Spread<ParsedArgs<A>>
    flags: Spread<ParsedFlags<F>>
    container: C
}

class CommandDef<
    Name extends string,
    Args extends Record<string, Arg<any, any>>,
    Flags extends Record<string, Flag<any, any, any>>,
> {
    constructor(
        public name: Name,
        public description: string | undefined,
        public args: Args,
        public flags: Flags,
        public subcommands: Command<`${Name} ${string}`, any, any, any>[],
        public action: (context: Pick<ActionContext<Args, Flags, any>, "args" | "flags">) => any | Promise<any>,
        public isDefault: boolean,
        public aliases: string[],
        public examples: string[],
    ) { }

    public mountTo(cli: Sade) {
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

        const commandName = `${this.name} ${argsNames}`.trim()

        // create command
        let command = cli.command(commandName, this.description, {
            alias: this.aliases,
            default: this.isDefault,
        })
        // add command examples
        for (const example of this.examples) command = command.example(example)

        // register option flags
        for (const [name, flag] of Object.entries(this.flags)) {
            const flagObj = Flag.toObject(flag)
            if (flagObj.char && flagObj.char.length > 1) {
                throw new CommandError("invalid_flag", `option ${"`" + Flag.toString(flag, name) + "`"} char cannot be more than 1 character`)
            }
            command = command.option(Flag.toString(flag, name), flagObj.desc, flagObj.negate && true)
            if (flagObj.negate) {
                command = command.option(Flag.toNegatedString(flag, name), flagObj.negate)
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
    Subcommands extends Command<`${Name} ${string}`, any, any, any>[],
> {
    private _name: Name
    private _description: string | undefined = undefined
    private _isDefault: boolean = false
    private _args: Record<string, Arg<any, any>> = {}
    private _flags: Record<string, Flag<any, any, any>> = {}
    private _subcommands: Command<`${Name} ${string}`, any, any, any>[] = []
    private _aliases: string[] = []
    private _examples: string[] = []

    constructor(name: Name) {
        this._name = name
    }

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

    public subcommands<S extends Command<`${Name} ${string}`, any, any, any>[]>(
        ...commands: S
    ): CommandBuilder<Name, Args, Flags, Container, S> {
        this._subcommands = commands
        return this as unknown as CommandBuilder<Name, Args, Flags, Container, S>
    }

    public args<A extends Record<string, Arg<any, any>>>(args: A): CommandBuilder<Name, A, Flags, Container, Subcommands> {
        this._args = args
        return this as unknown as CommandBuilder<Name, A, Flags, Container, Subcommands>
    }

    public flags<F extends Record<string, Flag<any, any, any>>>(flags: F): CommandBuilder<Name, Args, F, Container, Subcommands> {
        this._flags = flags
        return this as unknown as CommandBuilder<Name, Args, F, Container, Subcommands>
    }

    public action<C extends Record<string, any> = {}>(
        actionFn: (context: ActionContext<Args, Flags, C>) => any | Promise<any>
    ): Command<Name, Args, Flags, Spread<C & CombineInitFactoryDeps<Subcommands>>> {
        return {
            init: (container) => {
                return new CommandDef(
                    this._name,
                    this._description,
                    this._args as Args,
                    this._flags as Flags,
                    this._subcommands,
                    (ctx) => actionFn({ ...ctx, container }),
                    this._isDefault,
                    this._examples,
                    this._aliases,
                )
            }
        }
    }
}

export function createCommand<Name extends string>(name: Name): CommandBuilder<Name, {}, {}, {}, []> {
    return new CommandBuilder(name)
}
