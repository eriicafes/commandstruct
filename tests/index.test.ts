import { beforeEach, describe, expect, it, test, vi } from "vitest";
import { createCommand, createProgram, createSingleProgram } from '../src';
import { withArgv } from "./utils";

describe("Command", () => {
    it("executes command", () => {
        const fooAction = vi.fn()
        const fooCmd = createCommand("foo").action(fooAction)
        const cli = createProgram("test").commands(fooCmd).build()

        cli.run(undefined, withArgv("foo"))
        expect(fooAction).toBeCalledTimes(1)
    })

    it("executes in single program mode", () => {
        const action = vi.fn()
        const cli = createSingleProgram("test").action(action)

        cli.run(undefined, withArgv(""))
        expect(action).toBeCalledTimes(1)
    })

    it("executes subcommand", () => {
        const fooAction = vi.fn(), barAction = vi.fn()
        const barCmd = createCommand("bar").action(barAction)
        const fooCmd = createCommand("foo").subcommands(barCmd).action(fooAction)
        const cli = createProgram("test").commands(fooCmd).build()

        cli.run(undefined, withArgv("foo bar"))
        expect(fooAction).toBeCalledTimes(0)
        expect(barAction).toBeCalledTimes(1)
    })

    describe("executes default command", () => {
        const fooAction = vi.fn(), barAction = vi.fn()
        const fooCmd = createCommand("foo").action(fooAction)
        const barCmd = createCommand("bar").action(barAction)

        beforeEach(() => {
            fooAction.mockReset()
            barAction.mockReset()
        })

        test("with default first", () => {
            const cli = createProgram("test")
                .commands(fooCmd, barCmd)
                .default(fooCmd)
                .build()

            cli.run(undefined, withArgv(""))
            expect(fooAction).toBeCalledTimes(1)
            expect(barAction).toBeCalledTimes(0)
        })

        test("with default last", () => {
            const cli = createProgram("test")
                .commands(barCmd, fooCmd)
                .default(fooCmd)
                .build()

            cli.run(undefined, withArgv(""))
            expect(fooAction).toBeCalledTimes(1)
            expect(barAction).toBeCalledTimes(0)
        })
    })
})
