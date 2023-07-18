import { factory, Hollywood } from "hollywood-di"
import sade from "sade"
import { describe, expect, test } from "vitest"
import { arg, commandstruct, createCommand, flag, run } from "../src"

describe("Command", () => {
    const container = Hollywood.create({
        env: factory(() => "testing"),
    })

    const echoCmd = createCommand("echo")
        .args({
            target: arg(),
        })
        .flags({
            verbose: flag(""),
        })
        .action<{ env: string }>((ctx) => {
            return {
                isVerbose: ctx.flags.verbose,
                env: ctx.container.env,
                result: ctx.args.target,
            }
        })

    test("command action can access args flags and context", () => {
        const res = container.resolve(echoCmd).action({
            args: { target: "hello" },
            flags: { verbose: false, _: [] },
        })

        expect(res).toStrictEqual({
            isVerbose: false,
            env: container.instances.env,
            result: "hello",
        })
    })

    test("command parses args and flags correctly", async () => {
        const cli = sade("test")

        commandstruct(cli, container).commands(echoCmd)

        const res = await run(cli, undefined, ["world"])

        expect(res).toStrictEqual({
            isVerbose: false,
            env: container.instances.env,
            result: "world",
        })
    })
})
