import { afterAll, beforeAll, describe, expect, it, test, vi } from "vitest";
import { createCommand, createProgram, flag } from '../src';
import { withArgv } from "./utils";

describe("Flags", () => {
    const consoleErrorTrap = vi.fn()
    const consoleError = console.error
    beforeAll(() => {
        console.error = (...data) => consoleErrorTrap(data.join(" "))
    })
    afterAll(() => {
        console.error = consoleError
    })

    it("parses boolean flags", () => {
        const fooAction = vi.fn()
        const fooCmd = createCommand("foo")
            .flags({
                verbose: flag("")
            })
            .action(fooAction)
        const cli = createProgram("test").commands(fooCmd).build()

        cli.run(undefined, withArgv("foo"))
        expect(fooAction.mock.lastCall[0].flags).toStrictEqual({ verbose: false })

        cli.run(undefined, withArgv("foo --verbose"))
        expect(fooAction.mock.lastCall[0].flags).toStrictEqual({ verbose: true })
    })

    describe("parses param flags", () => {
        const fooAction = vi.fn()
        const fooCmd = createCommand("foo")
            .flags({
                name: flag("").requiredParam("string"),
                color: flag("").optionalParam("string"),
                theme: flag("").optionalParam("string", "primary"),
                score: flag("").optionalParam("number"),
                others: flag("").optionalParam("array"),
            })
            .action(fooAction)
        const cli = createProgram("test").commands(fooCmd).build()

        it("fails on missing required param", () => {
            cli.run(undefined, withArgv("foo"))
            expect(consoleErrorTrap).toHaveBeenLastCalledWith(expect.stringContaining("`--name` value is missing"))
        })

        it("fails on invalid param type", () => {
            cli.run(undefined, withArgv("foo --name myname --color"))
            expect(consoleErrorTrap).toHaveBeenLastCalledWith(expect.stringContaining("`--color` value is missing"))

            cli.run(undefined, withArgv("foo --name myname --score john"))
            expect(consoleErrorTrap).toHaveBeenLastCalledWith(expect.stringContaining("`--score` value is not a number"))

            cli.run(undefined, withArgv("foo --name myname --others"))
            expect(consoleErrorTrap).toHaveBeenLastCalledWith(expect.stringContaining("`--others` value is not an array"))
        })

        it("defaults missing optional param", () => {
            cli.run(undefined, withArgv("foo --name myname"))
            expect(fooAction.mock.lastCall[0].flags.color).toBe(undefined)
            expect(fooAction.mock.lastCall[0].flags.theme).toBe("primary")
            expect(fooAction.mock.lastCall[0].flags.score).toBe(undefined)
            expect(fooAction.mock.lastCall[0].flags.others).toBe(undefined)
        })

        it("parses string params", () => {
            cli.run(undefined, withArgv("foo --name myname --color red --theme secondary"))
            expect(fooAction.mock.lastCall[0].flags.name).toBe("myname")
            expect(fooAction.mock.lastCall[0].flags.color).toBe("red")
            expect(fooAction.mock.lastCall[0].flags.theme).toBe("secondary")
        })

        it("parses number params", () => {
            cli.run(undefined, withArgv("foo --name myname --score 50"))
            expect(fooAction.mock.lastCall[0].flags.score).toBe(50)
        })

        it("parses array params", () => {
            cli.run(undefined, withArgv("foo --name myname --others one"))
            expect(fooAction.mock.lastCall[0].flags.others).toStrictEqual(["one"])

            cli.run(undefined, withArgv("foo --name myname --others one --others two"))
            expect(fooAction.mock.lastCall[0].flags.others).toStrictEqual(["one", "two"])
        })
    })

    test("flag char", () => {
        const fooAction = vi.fn()
        const fooCmd = createCommand("foo")
            .flags({
                color: flag("").char("c").optionalParam("string"),
            })
            .action(fooAction)
        const cli = createProgram("test").commands(fooCmd).build()

        cli.run(undefined, withArgv("foo"))
        cli.run(undefined, withArgv("foo --color red"))
        cli.run(undefined, withArgv("foo --c blue"))
        cli.run(undefined, withArgv("foo --c blue --color red"))
        cli.run(undefined, withArgv("foo --color red --c blue"))
        fooAction.mock.calls.forEach((args) => {
            expect(args[0].flags.color).toBe(args[0].flags.c)
        })

        expect(() => {
            const barCmd = createCommand("foo").flags({ color: flag("").char("co") }).action(() => { })
            createProgram("test").commands(barCmd).build().program()
        }).toThrow("char cannot be more than 1 character")
    })

    it("preserves flag casing when specified", () => {
        const fooAction = vi.fn()
        const fooCmd = createCommand("foo")
            .flags({
                deviceType: flag(""),
                deviceName: flag("").preserveCase(),
            })
            .action(fooAction)
        const cli = createProgram("test").commands(fooCmd).build()

        cli.run(undefined, withArgv("foo"))
        expect(fooAction.mock.lastCall[0].flags).toHaveProperty("device-type")
        expect(fooAction.mock.lastCall[0].flags).toHaveProperty("deviceName")
    })

    describe("negated flags", () => {
        it("throws on negated flags with param", () => {
            expect(() => {
                const cmd = createCommand("foo")
                    .flags({
                        bar: flag("").withNegated("").optionalParam("string"),
                    })
                    .action(() => { })
                createProgram("test").commands(cmd).build().program()
            }).toThrow("cannot have param")

            expect(() => {
                const cmd = createCommand("foo")
                    .flags({
                        noBar: flag("").optionalParam("string"),
                    })
                    .action(() => { })
                createProgram("test").commands(cmd).build().program()
            }).toThrow("cannot have param")
        })

        it("throws on negated flags with existing param flag", () => {
            expect(() => {
                const cmd = createCommand("foo")
                    .flags({
                        bar: flag("").optionalParam("string"),
                        noBar: flag(""),
                    })
                    .action(() => { })
                createProgram("test").commands(cmd).build().program()
            }).toThrow("can only be used with boolean flags")
        })

        it("throws on negated flags with char", () => {
            expect(() => {
                const cmd = createCommand("foo")
                    .flags({
                        noBar: flag("").char("b"),
                    })
                    .action(() => { })
                createProgram("test").commands(cmd).build().program()
            }).toThrow("cannot have char")

            expect(() => {
                const cmd = createCommand("foo")
                    .flags({
                        "no-bar": flag("").char("b"),
                    })
                    .action(() => { })
                createProgram("test").commands(cmd).build().program()
            }).toThrow("cannot have char")
        })

        it("parses negated flags", () => {
            const fooAction = vi.fn()
            const fooCmd = createCommand("foo")
                .flags({
                    abort: flag("").withNegated(""),
                    verify: flag(""),
                    noVerify: flag(""),
                    noClose: flag(""),
                    noBreak: flag("").preserveCase(),
                    "no-follow": flag(""),
                })
                .action(fooAction)
            const cli = createProgram("test").commands(fooCmd).build()

            cli.run(undefined, withArgv("foo"))
            expect(fooAction.mock.lastCall[0].flags).toHaveProperty("abort")
            expect(fooAction.mock.lastCall[0].flags).toHaveProperty("verify")
            expect(fooAction.mock.lastCall[0].flags).not.toHaveProperty("noVerify")
            expect(fooAction.mock.lastCall[0].flags).not.toHaveProperty("noClose")
            expect(fooAction.mock.lastCall[0].flags).toHaveProperty("close")
            expect(fooAction.mock.lastCall[0].flags).toHaveProperty("noBreak")
            expect(fooAction.mock.lastCall[0].flags).not.toHaveProperty("break")
            expect(fooAction.mock.lastCall[0].flags).not.toHaveProperty("no-follow")
            expect(fooAction.mock.lastCall[0].flags).toHaveProperty("follow")

            expect(fooAction.mock.lastCall[0].flags.abort, "default withNegated to true").toBe(true)
            expect(fooAction.mock.lastCall[0].flags.verify, "default existing flag and negated flag to false").toBe(false)
            expect(fooAction.mock.lastCall[0].flags.close, "default only negated to true").toBe(true)
            expect(fooAction.mock.lastCall[0].flags.follow, "default only negated to true").toBe(true)
        })
    })
})
