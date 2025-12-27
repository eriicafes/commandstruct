import { beforeEach, describe, expect, it, vi } from "vitest";
import { command, program } from "../src";
import { withArgv } from "./utils";
import { Box } from "getbox";

describe("Container", () => {
  let counterInitTrap: ReturnType<typeof vi.fn>;
  let fooAction: ReturnType<typeof vi.fn>;
  let barAction: ReturnType<typeof vi.fn>;
  let box: Box;

  class Counter {
    public count = 0;

    constructor() {
      counterInitTrap();
    }
  }

  beforeEach(() => {
    counterInitTrap = vi.fn();
    fooAction = vi.fn();
    barAction = vi.fn();
    box = new Box();
  });

  it("creates a default box when not provided", () => {
    const prog = program("test")
      .commands(
        command("foo").action((ctx, receivedBox) => {
          fooAction(ctx, receivedBox);
        }),
        command("bar").action((ctx, receivedBox) => {
          barAction(ctx, receivedBox);
        })
      )
      .build();

    prog.run(undefined, withArgv("foo"));
    prog.run(undefined, withArgv("bar"));

    const fooBox = fooAction.mock.lastCall?.[1];
    const barBox = barAction.mock.lastCall?.[1];

    // Should create a box instance
    expect(fooBox).toBeInstanceOf(Box);
    // All actions should receive the same box reference
    expect(fooBox).toBe(barBox);
  });

  it("actions receive the same box reference", () => {
    const prog = program("test", box)
      .commands(
        command("foo").action((ctx, receivedBox) => {
          fooAction(ctx, receivedBox);
        }),
        command("bar").action((ctx, receivedBox) => {
          barAction(ctx, receivedBox);
        })
      )
      .build();

    prog.run(undefined, withArgv("foo"));
    prog.run(undefined, withArgv("bar"));

    const fooBox = fooAction.mock.lastCall?.[1];
    const barBox = barAction.mock.lastCall?.[1];

    // All actions should receive the same box reference
    expect(fooBox).toBe(box);
    expect(barBox).toBe(box);
  });

  it("box.get reuses the same instance across commands", () => {
    const prog = program("test", box)
      .commands(
        command("foo").action((ctx, box) => {
          const counter = box.get(Counter);
          fooAction(ctx, counter);
        }),
        command("bar").action((ctx, box) => {
          const counter = box.get(Counter);
          barAction(ctx, counter);
        })
      )
      .build();

    prog.run(undefined, withArgv("foo"));
    prog.run(undefined, withArgv("bar"));

    const fooCounter = fooAction.mock.lastCall?.[1];
    const barCounter = barAction.mock.lastCall?.[1];

    // Constructor should only be called once despite multiple box.get() calls
    expect(counterInitTrap).toHaveBeenCalledTimes(1);

    // All references should point to the same cached instance
    expect(fooCounter).toBe(barCounter);
  });

  it("box.new creates new instances each time", () => {
    const newAction = vi.fn();
    const newCmd = command("new").action((ctx, box) => {
      const counter = box.new(Counter);
      newAction(ctx, counter);
    });

    const newProg = program("test", box).commands(newCmd).build();

    newProg.run(undefined, withArgv("new"));
    newProg.run(undefined, withArgv("new"));

    const firstCounter = newAction.mock.calls[0]?.[1];
    const secondCounter = newAction.mock.calls[1]?.[1];

    // Each call to box.new should create a different instance
    expect(firstCounter).not.toBe(secondCounter);
    // Constructor should be called once for each box.new() call
    expect(counterInitTrap).toHaveBeenCalledTimes(2);
  });
});
