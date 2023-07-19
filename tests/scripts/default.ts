import { factory, Hollywood } from "hollywood-di"
import sade from "sade"
import { commandstruct, createCommand, run } from "../../src"

const cli = sade("test")
const container = Hollywood.create({
	env: factory(() => "testing"),
})

const helloCmd = createCommand("hello")
	.isDefault()
	.action(() => {
		console.log("world")
	})

const fooBarCmd = createCommand("foo bar")
	.action<{ env: string }>((ctx) => {
		console.log(`${ctx.container.env} baz`)
	})

const fooCmd = createCommand("foo")
	.subcommands(fooBarCmd)
	.action(() => {
		console.log("bar")
	})

commandstruct(cli, container)
	.commands(helloCmd, fooCmd)

run(cli)
