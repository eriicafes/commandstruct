import { factory, Hollywood } from "hollywood-di"
import { arg, commandstruct, createSingleCommand, flag, run } from "../../src"

const container = Hollywood.create({
	env: factory(() => "testing"),
})

const echoCmd = createSingleCommand("echo")
	.isDefault()
	.args({
		target: arg(),
	})
	.flags({
		debug: flag("debug mode").char("d"),
	})
	.action<{ env: string }>((ctx) => {
		console.log(`${ctx.flags.debug ? "> " : ""}` + `echo ${ctx.args.target} from ${ctx.container.env}`)
	})

const cli = commandstruct(echoCmd, container)

run(cli)
