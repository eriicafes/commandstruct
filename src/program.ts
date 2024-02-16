import { AnyHollywood, ContainerOptions, Hollywood, HollywoodOf, InferContainer, RegisterTokens } from "hollywood-di"
import sade, { Sade } from "sade"
import { Subcommand } from "./command"
import { Flag } from "./flag"
import { run, RunOptions } from "./run"
import { registerFlags } from "./utils"

type ProgramOptions<
    Name extends string,
    Flags extends Record<string, Flag>,
    Container extends AnyHollywood | undefined,
    Instances extends Container extends AnyHollywood ? InferContainer<Container> : {},
> = {
    name: Name
    version: string | undefined
    description: string | undefined
    examples: string[]
    flags: Flags
    container: Container
    commands: [HollywoodOf<Instances>, Subcommand<Flags, Instances>[]][]
    default: Subcommand<any, any> | undefined
}

export type AnyProgram = Program<any, any, any>

export class Program<
    Name extends string,
    Flags extends Record<string, Flag>,
    Container extends AnyHollywood | undefined,
> {
    constructor(private options: ProgramOptions<Name, Flags, Container, Container extends AnyHollywood ? InferContainer<Container> : {}>) { }

    public program(): Sade {
        const program = sade(this.options.name)
        if (this.options.version) program.version(this.options.version)
        if (this.options.description) program.describe(this.options.description)
        for (const example of this.options.examples) program.example(example)

        registerFlags(program, this.options.flags)

        for (const [container, commands] of this.options.commands) {
            for (const command of commands) {
                command.command({
                    program,
                    programFlags: this.options.flags,
                    defaultCmd: this.options.default,
                    container: container,
                })
            }
        }
        return program
    }

    public run(options?: RunOptions, argv?: string[]) {
        return run(this.program(), options, argv)
    }
}

class ProgramBuilder<
    Name extends string,
    Flags extends Record<string, Flag>,
    Container extends AnyHollywood | undefined,
> {
    private options: ProgramOptions<Name, Flags, Container, Container extends AnyHollywood ? InferContainer<Container> : {}>

    constructor(name: Name, container: Container) {
        this.options = {
            name,
            version: undefined,
            description: undefined,
            examples: [],
            flags: {} as Flags,
            container,
            commands: [],
            default: undefined,
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

    public flags<F extends Record<string, Flag> extends Flags ? Record<string, Flag> : never>(flags: F) {
        this.options.flags = flags as unknown as Flags
        return this as unknown as Record<string, Flag> extends Flags ? ProgramBuilder<Name, F, Container> : never
    }

    public provide<T extends Record<string, any> = {}>(
        tokens: RegisterTokens<T, Container extends AnyHollywood ? InferContainer<Container> : {}>,
        options?: ContainerOptions,
    ) {
        let parent = this.options.container
        if (parent) this.options.container = Hollywood.createWithParent(parent, tokens as RegisterTokens<T, InferContainer<AnyHollywood>>, options) as Container
        else this.options.container = Hollywood.create(tokens as RegisterTokens<T, {}>, options) as Container
        this.options.commands.push([this.options.container as HollywoodOf<Container extends AnyHollywood ? InferContainer<Container> : {}>, []])
        return this as unknown as ProgramBuilder<Name, Flags, Container extends AnyHollywood ? Hollywood<T, InferContainer<Container>> : Hollywood<T, {}>>
    }

    public commands<C extends Subcommand<Flags, Container extends AnyHollywood ? InferContainer<Container> : {}>[]>(
        ...commands: C
    ) {
        if (!this.options.commands.length) this.options.commands.push([this.options.container as HollywoodOf<Container extends AnyHollywood ? InferContainer<Container> : {}>, []])
        const [, subcommands] = this.options.commands[this.options.commands.length - 1]
        subcommands.push(...commands)
        return this
    }

    public default(command: Subcommand<any, any>) {
        this.options.default = command
        return this
    }

    public build() {
        return new Program<Name, Flags, Container>(this.options)
    }
}

export function createProgram<Name extends string>(name: Name): ProgramBuilder<Name, {}, undefined>
export function createProgram<Name extends string, Container extends AnyHollywood>(name: Name, container: Container): ProgramBuilder<Name, {}, Container>
export function createProgram<Name extends string, Container extends AnyHollywood>(name: Name, container?: Container) {
    return new ProgramBuilder(name, container)
}
