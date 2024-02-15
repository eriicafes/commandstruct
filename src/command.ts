import { AnyHollywood, ContainerOptions, Hollywood, HollywoodOf, InferContainer, RegisterTokens } from "hollywood-di"
import { Sade } from "sade"
import { Arg, ParsedArgs } from "./arg"
import { Flag, ParsedFlags } from "./flag"
import { Merge, Spread } from "./types"
import { commandContext, commandUsage, registerFlags } from "./utils"

type SubcommandOptions<
    ProgramFlags extends Record<string, Flag>,
    Deps extends Record<string, any>,
> = {
    program: Sade,
    programFlags: ProgramFlags,
    baseCmd?: string | undefined,
    defaultCmd?: Subcommand<any, any>,
    container: {} extends Deps ? HollywoodOf<Deps> | undefined : HollywoodOf<Deps>,
}

export type Subcommand<ProgramFlags extends Record<string, Flag>, Deps extends Record<string, any>> = {
    command: (options: SubcommandOptions<ProgramFlags, Deps>) => void
}

type CommandOptions<
    Name extends string,
    Args extends Record<string, Arg>,
    Flags extends Record<string, Flag>,
    ProgramFlags extends Record<string, Flag>,
    Deps extends Record<string, any>,
    Container extends AnyHollywood | undefined,
    Instances extends Container extends AnyHollywood ? InferContainer<Container> : Deps,
> = {
    name: Name
    description: string | undefined
    aliases: string[]
    examples: string[]
    args: Args
    flags: Flags
    action: (
        ctx: { args: Spread<ParsedArgs<Args>>, flags: Spread<ParsedFlags<Merge<Flags, ProgramFlags>>>, restArgs: string[] },
        container: Instances,
    ) => any | Promise<any>
    subcommands: [{ tokens: RegisterTokens<any, any>, options?: ContainerOptions } | undefined, Subcommand<ProgramFlags, Instances>[]][]
}

export type AnyCommand = Command<any, any, any, any, any>

export class Command<
    Name extends string,
    Args extends Record<string, Arg>,
    Flags extends Record<string, Flag>,
    ProgramFlags extends Record<string, Flag>,
    Deps extends Record<string, any>,
> {
    constructor(private options: CommandOptions<Name, Args, Flags, ProgramFlags, Deps, any, any>) { }

    public command(options: SubcommandOptions<ProgramFlags, Deps>) {
        const { program, programFlags, baseCmd, defaultCmd, container: parentContainer } = options
        const command = program.command(commandUsage(baseCmd, this.options.name, this.options.args), this.options.description, {
            default: defaultCmd && defaultCmd === this
        })
        if (this.options.aliases.length) command.alias(...this.options.aliases)
        for (const example of this.options.examples) command.example(example)

        registerFlags(program, this.options.flags)

        let container = parentContainer
        const subcommandTasks: (() => void)[] = []
        for (const [tokens, subcommands] of this.options.subcommands) {
            let subContainer = container
            if (tokens && subContainer) subContainer = Hollywood.createWithParent(subContainer, tokens.tokens, tokens.options)
            else if (tokens) subContainer = Hollywood.create(tokens.tokens, tokens.options)
            container = subContainer
            for (const subcommand of subcommands) {
                subcommandTasks.push(() => {
                    subcommand.command({
                        program,
                        programFlags,
                        baseCmd: `${baseCmd ? baseCmd + " " + this.options.name : this.options.name}`,
                        defaultCmd: defaultCmd === this ? undefined : defaultCmd,
                        container: subContainer,
                    })
                })
            }
        }

        const instances = container?.instances ?? {}
        command.action((...fnArgs) => {
            const { flags, ...context } = commandContext(this.options.args, { ...programFlags, ...this.options.flags }, fnArgs)
            return this.options.action({ ...context, flags: flags as unknown as ParsedFlags<Merge<Flags, ProgramFlags>> }, instances)
        })
        for (const task of subcommandTasks) task()
    }
}

class CommandBuilder<
    Name extends string,
    Args extends Record<string, Arg>,
    Flags extends Record<string, Flag>,
    ProgramFlags extends Record<string, Flag>,
    Deps extends Record<string, any>,
    Container extends AnyHollywood | undefined,
> {
    private options: Omit<CommandOptions<Name, Args, Flags, ProgramFlags, Deps, Container, Container extends AnyHollywood ? InferContainer<Container> : Deps>, "action">

    constructor(name: Name) {
        this.options = {
            name,
            description: undefined,
            aliases: [],
            examples: [],
            args: {} as Args,
            flags: {} as Flags,
            subcommands: [],
        }
    }

    public describe(description: string) {
        this.options.description = description
        return this
    }

    public alias(...aliases: string[]) {
        this.options.aliases.push(...aliases)
        return this
    }

    public example(example: string) {
        this.options.examples.push(example)
        return this
    }

    public args<A extends Record<string, Arg> extends Args ? Record<string, Arg> : never>(args: A) {
        this.options.args = args as unknown as Args
        return this as unknown as Record<string, Arg> extends Args ? CommandBuilder<Name, A, Flags, ProgramFlags, Deps, Container> : never
    }

    public flags<F extends Record<string, Flag> extends Flags ? Record<string, Flag> : never>(flags: F) {
        this.options.flags = flags as unknown as Flags
        return this as unknown as Record<string, Flag> extends Flags ? CommandBuilder<Name, Args, F, ProgramFlags, Deps, Container> : never
    }

    public useFlags<F extends Record<string, Flag> extends ProgramFlags ? Record<string, Flag> : never>() {
        return this as unknown as Record<string, Flag> extends ProgramFlags ? CommandBuilder<Name, Args, Flags, F, Deps, Container> : never
    }

    public use<C extends Container extends AnyHollywood ? never : Record<string, any>>() {
        return this as unknown as Container extends AnyHollywood ? never : CommandBuilder<Name, Args, Flags, ProgramFlags, Spread<C>, Hollywood<Spread<C>, any>>
    }

    public provide<T extends Record<string, any> = {}>(
        tokens: RegisterTokens<T, Container extends AnyHollywood ? InferContainer<Container> : {}>,
        options?: ContainerOptions,
    ) {
        this.options.subcommands.push([{ tokens, options }, []])
        return this as unknown as CommandBuilder<Name, Args, Flags, ProgramFlags, Deps, Container extends AnyHollywood ? Hollywood<T, InferContainer<Container>> : Hollywood<T, {}>>
    }

    public subcommands<C extends Subcommand<ProgramFlags, Container extends AnyHollywood ? InferContainer<Container> : Deps>[]>(
        ...commands: C
    ) {
        if (!this.options.subcommands.length) this.options.subcommands.push([undefined, []])
        const [, subcommands] = this.options.subcommands[this.options.subcommands.length - 1]
        subcommands.push(...commands)
        return this
    }

    public action(
        fn: (
            ctx: { args: Spread<ParsedArgs<Args>>, flags: Spread<ParsedFlags<Merge<Flags, ProgramFlags>>>, restArgs: string[] },
            container: Container extends AnyHollywood ? InferContainer<Container> : {},
        ) => any | Promise<any>
    ) {
        return new Command<
            Name,
            Args,
            Flags,
            ProgramFlags,
            Deps
        >({ ...this.options, action: fn })
    }
}

export function createCommand<Name extends string>(name: Name): CommandBuilder<Name, {}, {}, {}, {}, undefined> {
    return new CommandBuilder(name)
}
