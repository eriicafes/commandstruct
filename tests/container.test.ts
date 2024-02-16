import { Hollywood, scoped } from "hollywood-di";
import { describe, expect, it, vi } from "vitest";
import { createCommand, createProgram } from '../src';
import { withArgv } from "./utils";

class Counter {
    public count = 0
}

describe("Container", () => {
    const counterInitTrap = vi.fn()
    const fooAction = vi.fn()
    const barAction = vi.fn()
    const bazAction = vi.fn()
    const container = Hollywood.create({
        counter: scoped(Counter, { afterInit: counterInitTrap })
    })
    const prog = createProgram("test", container)
        .commands(
            createCommand("foo")
                .use<{ counter: Counter }>()
                .action(fooAction),

            createCommand("bar")
                .provide({ counter: Counter })
                .action(barAction),

            createCommand("baz")
                .use<{ counter: Counter }>()
                .provide({})
                .action(bazAction),
        )
        .build()

    it("'use' reuses the parent container", async () => {
        prog.run(undefined, withArgv("foo"))
        expect(fooAction.mock.lastCall[1].counter).toBe(container.instances.counter)
    })

    it("'provides' creates a child container", async () => {
        prog.run(undefined, withArgv("bar"))
        prog.run(undefined, withArgv("baz"))
        expect(barAction.mock.lastCall[1].counter).not.toBe(container.instances.counter)
        expect(bazAction.mock.lastCall[1].counter).not.toBe(container.instances.counter)

        expect(barAction.mock.lastCall[1].counter).toStrictEqual(container.instances.counter)
        expect(bazAction.mock.lastCall[1].counter).toStrictEqual(container.instances.counter)

        container.instances.counter.count++
        expect(barAction.mock.lastCall[1].counter).not.toStrictEqual(container.instances.counter)
        expect(bazAction.mock.lastCall[1].counter).not.toStrictEqual(container.instances.counter)
    })
})
