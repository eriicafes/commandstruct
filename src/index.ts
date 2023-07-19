import { AnyHollywood, inferContainer } from "hollywood-di"
import sade, { Sade } from "sade"
import { Command } from "./command"

export interface Commandstruct<Container extends AnyHollywood> {
    commands(...commands: Command<string, any, any, inferContainer<Container>, false>[]): this
}

export function commandstruct<Container extends AnyHollywood>(cli: Sade, container: Container): Commandstruct<Container>
export function commandstruct<Container extends AnyHollywood>(cmd: Command<any, any, any, inferContainer<Container>, true>, container: Container): Sade
export function commandstruct<Container extends AnyHollywood>(
    cli: Sade | Command<any, any, any, inferContainer<Container>, true>,
    container: Container,
): Commandstruct<Container> | Sade {
    if (isCmd(cli)) {
        const command = container.resolve(cli as Command<any, any, any, {}, true>)

        const cmd = sade(command.getCommandName(), true)
        command.setupCommand(cmd)

        return cmd
    }

    return {
        commands(...commands) {
            registerCommands(cli, container, commands)
            return this as Commandstruct<Container>
        },
    }
}

function registerCommands<Container extends AnyHollywood>(
    cli: Sade,
    container: Container,
    commands: Command<any, any, any, inferContainer<Container>, false>[],
) {
    for (const commandInit of commands) {
        const command = container.resolve(commandInit as Command<any, any, any, {}, false>)

        const cmd = cli.command(command.getCommandName(), command.description, {
            alias: command.aliases,
            default: command.isDefault,
        })
        command.setupCommand(cmd)

        if (command.subcommands.length) registerCommands(cli, container, command.subcommands)
    }
}

function isCmd<Container extends AnyHollywood>(cli: Sade | Command<any, any, any, inferContainer<Container>, true>): cli is Command<any, any, any, inferContainer<Container>, true> {
    return typeof (cli as any).init === "function"
}

export { arg } from "./arg"
export { ActionContext, Command, createCommand, createSingleCommand } from "./command"
export { flag } from "./flag"
export { run, RunOptions } from "./run"

