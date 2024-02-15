import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { arg, createCommand, createProgram } from '../src';
import { withArgv } from "./utils";

describe("Args", () => {
    const consoleErrorTrap = vi.fn()
    const consoleError = console.error
    const processExitTrap = vi.fn<[code: number | undefined], never>()
    const processExit = process.exit
    beforeAll(() => {
        console.error = (...data) => consoleErrorTrap(data.join(" "))
        process.exit = processExitTrap
    })
    afterAll(() => {
        console.error = consoleError
        process.exit = processExit
    })

    it("parses positional args", () => {
        const fooAction = vi.fn()
        const fooCmd = createCommand("foo")
            .args({
                bar: arg(),
                baz: arg(),
            })
            .action(fooAction)
        const cli = createProgram("test").commands(fooCmd).build()

        cli.run(undefined, withArgv("foo one two"))
        expect(fooAction.mock.lastCall[0].args).toStrictEqual({ bar: "one", baz: "two" })
    })

    it("parses optional positional args", () => {
        const fooAction = vi.fn()
        const fooCmd = createCommand("foo")
            .args({
                bar: arg(),
                baz: arg().optional(),
            })
            .action(fooAction)
        const cli = createProgram("test").commands(fooCmd).build()

        cli.run(undefined, withArgv("foo one"))
        expect(fooAction.mock.lastCall[0].args).toStrictEqual({ bar: "one", baz: undefined })
    })

    it("throws on insufficient arguments", () => {
        const fooAction = vi.fn()
        const fooCmd = createCommand("foo")
            .args({
                bar: arg(),
                baz: arg().optional(),
            })
            .action(fooAction)
        const cli = createProgram("test").commands(fooCmd).build()

        cli.run(undefined, withArgv("foo"))
        expect(fooAction).toBeCalledTimes(0)
        expect(consoleErrorTrap).toBeCalledWith(expect.stringContaining("Insufficient arguments"))
        expect(processExitTrap).toBeCalledTimes(1)
    })

    it("throws on required arg after an optional arg", () => {
        expect(() => {
            const cmd = createCommand("foo")
                .args({
                    bar: arg().optional(),
                    baz: arg(),
                })
                .action(() => { })
            createProgram("test").commands(cmd).build().program()
        }).toThrow("cannot appear after an optional argument")
    })
})
