import { Hollywood } from "hollywood-di"
import sade from "sade"
import { commandstruct, createCommand, run } from "../../src"

const cli = sade("test")
const container = Hollywood.create({})

const fooCmd = createCommand("foo")
	.action(() => {
		console.log("bar")
	})

commandstruct(cli, container)
	.commands(fooCmd)

run(cli)
