import { spawnSync } from 'child_process'
import { factory, Hollywood } from "hollywood-di"
import path from "path"
import { describe, expect, it, test } from "vitest"
import { arg, createCommand, flag } from "../src"

function execScript(file: "default" | "single" | "help", argv: string[]) {
    return spawnSync('pnpm', ["tsx", path.join(process.cwd(), "tests", "scripts", file), ...argv]);
}

describe("Command", () => {
    test("command action can access args flags and context", () => {
        const container = Hollywood.create({
            env: factory(() => "testing"),
        })

        const echoCmd = createCommand("echo")
            .subcommands()
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

    it("executes commands", async () => {
        const pid = execScript("default", ["hello"]);
        expect(pid.status).toBe(0);
        expect(pid.stderr.length).toBe(0);
        expect(pid.stdout.toString()).toBe("world\n");

        const pid2 = execScript("default", ["foo"]);
        expect(pid2.status).toBe(0);
        expect(pid2.stderr.length).toBe(0);
        expect(pid2.stdout.toString()).toBe("bar\n");
    })

    it("executes subcommand", async () => {
        const pid = execScript("default", ["foo", "bar"]);
        expect(pid.status).toBe(0);
        expect(pid.stderr.length).toBe(0);
        expect(pid.stdout.toString()).toBe("testing baz\n");
    })

    it("executes default command", async () => {
        const pid = execScript("default", []);
        expect(pid.status).toBe(0);
        expect(pid.stderr.length).toBe(0);
        expect(pid.stdout.toString()).toBe("world\n");
    })

    it("executes in single command mode", async () => {
        const pid = execScript("single", ["foo"]);
        expect(pid.status).toBe(0);
        expect(pid.stderr.length).toBe(0);
        expect(pid.stdout.toString()).toBe("echo foo from testing\n");

        const pid2 = execScript("single", ["foo", "-d"]);
        expect(pid2.status).toBe(0);
        expect(pid2.stderr.length).toBe(0);
        expect(pid2.stdout.toString()).toBe("> echo foo from testing\n");
    })

    it("displays help message", async () => {
        const pid = execScript("help", ["foo", "-h"]);
        expect(pid.status).toBe(0);
        expect(pid.stderr.length).toBe(0);
        expect(pid.stdout.toString().trim().split("\n").at(-1)?.trim()).toBe("-h, --help    Displays this message")
    })
})
