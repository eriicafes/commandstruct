import { AnyHollywood, inferContainer } from "hollywood-di"
import { Sade } from "sade"
import { Command } from "./command"

export interface Commandstruct<Container extends AnyHollywood> {
    commands(...commands: Command<string, any, any, inferContainer<Container>>[]): this
}

export function commandstruct<Container extends AnyHollywood>(cli: Sade, container: Container): Commandstruct<Container> {
    return {
        commands(...commands) {
            registerCommands(cli, container, commands)
            return this
        },
    }
}

function registerCommands<Container extends AnyHollywood>(
    cli: Sade,
    container: Container,
    commands: Command<any, any, any, inferContainer<Container>>[],
) {
    for (const commandInit of commands) {
        const command = container.resolve(commandInit as Command<any, any, any, {}>)
        command.mountTo(cli)
        if (command.subcommands.length) registerCommands(cli, container, command.subcommands)
    }
}

export { arg } from "./arg"
export { ActionContext, Command, createCommand } from "./command"
export { flag } from "./flag"
export { run, RunOptions } from "./run"
