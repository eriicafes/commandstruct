import { AnyHollywood, ContainerOptions, Hollywood, InferContainer, RegisterTokens } from "hollywood-di"
import sade, { Sade } from "sade"
import { Arg, ParsedArgs } from "./arg"
import { Flag, ParsedFlags } from "./flag"
import { run, RunOptions } from "./run"
import { Spread } from "./types"
import { commandContext, commandUsage, registerFlags } from "./utils"

type SingleProgramOptions<
    Name extends string,
    Args extends Record<string, Arg>,
    Flags extends Record<string, Flag>,
    Container extends AnyHollywood | undefined,
    Instances extends Container extends AnyHollywood ? InferContainer<Container> : {},
> = {
    name: Name
    version: string | undefined
    description: string | undefined
    examples: string[]
    args: Args
    flags: Flags
    container: Container
    action: (
        ctx: { args: Spread<ParsedArgs<Args>>, flags: Spread<ParsedFlags<Flags>>, restArgs: string[] },
        container: Instances,
    ) => any | Promise<any>
}

export type AnySingleProgram = SingleProgram<any, any, any, any>

export class SingleProgram<
    Name extends string,
    Args extends Record<string, Arg>,
    Flags extends Record<string, Flag>,
    Container extends AnyHollywood | undefined,
> {
    constructor(private options: SingleProgramOptions<Name, Args, Flags, Container, Container extends AnyHollywood ? InferContainer<Container> : {}>) { }

    public program(): Sade {
        const program = sade(commandUsage(undefined, this.options.name, this.options.args), true)
        if (this.options.version) program.version(this.options.version)
        if (this.options.description) program.describe(this.options.description)
        for (const example of this.options.examples) program.example(example)

        registerFlags(program, this.options.flags)

        const instances = (this.options.container?.instances ?? {}) as Container extends AnyHollywood ? InferContainer<Container> : {}
        return program.action((...fnArgs) => {
            const ctx = commandContext(this.options.args, this.options.flags, fnArgs)
            return this.options.action(ctx, instances)
        })
    }

    public run(options?: RunOptions, argv?: string[]) {
        return run(this.program(), options, argv)
    }
}

class SingleProgramBuilder<
    Name extends string,
    Args extends Record<string, Arg>,
    Flags extends Record<string, Flag>,
    Container extends AnyHollywood | undefined,
> {
    private options: Omit<SingleProgramOptions<Name, Args, Flags, Container, Container extends AnyHollywood ? InferContainer<Container> : {}>, "action">

    constructor(name: Name, container: Container) {
        this.options = {
            name,
            version: undefined,
            description: undefined,
            examples: [],
            args: {} as Args,
            flags: {} as Flags,
            container,
        }
    }

    public version(version: string) {
        this.options.version = version
        return this
    }

    public describe(description: string) {
        this.options.description = description
        return this
    }

    public example(example: string) {
        this.options.examples.push(example)
        return this
    }

    public args<A extends Record<string, Arg> extends Args ? Record<string, Arg> : never>(args: A) {
        this.options.args = args as unknown as Args
        return this as unknown as Record<string, Arg> extends Args ? SingleProgramBuilder<Name, A, Flags, Container> : never
    }

    public flags<F extends Record<string, Flag> extends Flags ? Record<string, Flag> : never>(flags: F) {
        this.options.flags = flags as unknown as Flags
        return this as unknown as Record<string, Flag> extends Flags ? SingleProgramBuilder<Name, Args, F, Container> : never
    }

    public provide<T extends Record<string, any> = {}>(
        tokens: RegisterTokens<T, Container extends AnyHollywood ? InferContainer<Container> : {}>,
        options?: ContainerOptions,
    ) {
        let parent = this.options.container
        if (parent) this.options.container = Hollywood.createWithParent(parent, tokens as RegisterTokens<T, InferContainer<AnyHollywood>>, options) as Container
        else this.options.container = Hollywood.create(tokens as RegisterTokens<T, {}>, options) as Container
        return this as unknown as SingleProgramBuilder<Name, Args, Flags, Container extends AnyHollywood ? Hollywood<T, InferContainer<Container>> : Hollywood<T, {}>>
    }

    public action(
        fn: (
            ctx: { args: Spread<ParsedArgs<Args>>, flags: Spread<ParsedFlags<Flags>>, restArgs: string[] },
            container: Container extends AnyHollywood ? InferContainer<Container> : {},
        ) => any | Promise<any>
    ) {
        return new SingleProgram<Name, Args, Flags, Container>({ ...this.options, action: fn })
    }
}

export function createSingleProgram<Name extends string>(name: Name): SingleProgramBuilder<Name, {}, {}, undefined>
export function createSingleProgram<Name extends string, Container extends AnyHollywood>(name: Name, container: Container): SingleProgramBuilder<Name, {}, {}, Container>
export function createSingleProgram<Name extends string, Container extends AnyHollywood>(name: Name, container?: Container) {
    return new SingleProgramBuilder(name, container)
}
