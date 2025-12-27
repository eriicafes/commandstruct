import { afterAll, beforeAll, describe, expect, it, test, vi } from "vitest";
import { command, program, flag } from "../src";
import { withArgv } from "./utils";

describe("Flags", () => {
  const consoleErrorTrap = vi.fn();
  const consoleError = console.error;
  beforeAll(() => {
    console.error = (...data) => consoleErrorTrap(data.join(" "));
  });
  afterAll(() => {
    console.error = consoleError;
  });

  it("parses boolean flags", () => {
    const fooAction = vi.fn();
    const fooCmd = command("foo")
      .flags({
        verbose: flag(""),
      })
      .action(fooAction);
    const cli = program("test").commands(fooCmd).build();

    cli.run(undefined, withArgv("foo"));
    expect(fooAction.mock.lastCall?.[0].flags).toStrictEqual({
      verbose: false,
    });

    cli.run(undefined, withArgv("foo --verbose"));
    expect(fooAction.mock.lastCall?.[0].flags).toStrictEqual({ verbose: true });
  });

  describe("string param flags", () => {
    const fooAction = vi.fn();
    const fooCmd = command("foo")
      .flags({
        name: flag("").requiredParam("string"),
        color: flag("").optionalParam("string"),
        theme: flag("").optionalParam("string", "primary"),
      })
      .action(fooAction);
    const cli = program("test").commands(fooCmd).build();

    it("fails on missing required string param", () => {
      cli.run(undefined, withArgv("foo"));
      expect(consoleErrorTrap).toHaveBeenLastCalledWith(
        expect.stringContaining("`--name` value is missing")
      );
    });

    it("fails on missing optional string param value", () => {
      cli.run(undefined, withArgv("foo --name myname --color"));
      expect(consoleErrorTrap).toHaveBeenLastCalledWith(
        expect.stringContaining("`--color` value is missing")
      );
    });

    it("defaults missing optional string param to undefined", () => {
      cli.run(undefined, withArgv("foo --name myname"));
      expect(fooAction.mock.lastCall?.[0].flags.color).toBe(undefined);
    });

    it("uses default value for optional string param", () => {
      cli.run(undefined, withArgv("foo --name myname"));
      expect(fooAction.mock.lastCall?.[0].flags.theme).toBe("primary");
    });

    it("parses string params", () => {
      cli.run(
        undefined,
        withArgv("foo --name myname --color red --theme secondary")
      );
      expect(fooAction.mock.lastCall?.[0].flags.name).toBe("myname");
      expect(fooAction.mock.lastCall?.[0].flags.color).toBe("red");
      expect(fooAction.mock.lastCall?.[0].flags.theme).toBe("secondary");
    });

    it("parses string params with special characters", () => {
      cli.run(undefined, withArgv("foo --name user@example.com"));
      expect(fooAction.mock.lastCall?.[0].flags.name).toBe("user@example.com");
    });

    it("parses multiple word strings as separate args", () => {
      cli.run(undefined, withArgv("foo --name hello --color world test"));
      expect(fooAction.mock.lastCall?.[0].flags.name).toBe("hello");
      expect(fooAction.mock.lastCall?.[0].flags.color).toBe("world");
    });
  });

  describe("number param flags", () => {
    const fooAction = vi.fn();
    const fooCmd = command("foo")
      .flags({
        count: flag("").requiredParam("number"),
        score: flag("").optionalParam("number"),
        rating: flag("").optionalParam("number", 5),
      })
      .action(fooAction);
    const cli = program("test").commands(fooCmd).build();

    it("fails on missing required number param", () => {
      cli.run(undefined, withArgv("foo"));
      expect(consoleErrorTrap).toHaveBeenLastCalledWith(
        expect.stringContaining("`--count` value is missing")
      );
    });

    it("fails on non-numeric value for number param", () => {
      cli.run(undefined, withArgv("foo --count abc"));
      expect(consoleErrorTrap).toHaveBeenLastCalledWith(
        expect.stringContaining("`--count` value is not a number")
      );

      cli.run(undefined, withArgv("foo --count 10 --score john"));
      expect(consoleErrorTrap).toHaveBeenLastCalledWith(
        expect.stringContaining("`--score` value is not a number")
      );
    });

    it("defaults missing optional number param to undefined", () => {
      cli.run(undefined, withArgv("foo --count 10"));
      expect(fooAction.mock.lastCall?.[0].flags.score).toBe(undefined);
    });

    it("uses default value for optional number param", () => {
      cli.run(undefined, withArgv("foo --count 10"));
      expect(fooAction.mock.lastCall?.[0].flags.rating).toBe(5);
    });

    it("parses positive integers", () => {
      cli.run(undefined, withArgv("foo --count 42 --score 100"));
      expect(fooAction.mock.lastCall?.[0].flags.count).toBe(42);
      expect(fooAction.mock.lastCall?.[0].flags.score).toBe(100);
    });

    it("parses floating point numbers", () => {
      cli.run(undefined, withArgv("foo --count 3.14 --score 2.5"));
      expect(fooAction.mock.lastCall?.[0].flags.count).toBe(3.14);
      expect(fooAction.mock.lastCall?.[0].flags.score).toBe(2.5);
    });

    it("parses zero", () => {
      cli.run(undefined, withArgv("foo --count 0 --score 0"));
      expect(fooAction.mock.lastCall?.[0].flags.count).toBe(0);
      expect(fooAction.mock.lastCall?.[0].flags.score).toBe(0);
    });

    it("parses scientific notation", () => {
      cli.run(undefined, withArgv("foo --count 1e5 --score 2.5e-3"));
      expect(fooAction.mock.lastCall?.[0].flags.count).toBe(100000);
      expect(fooAction.mock.lastCall?.[0].flags.score).toBe(0.0025);
    });

    it("parses large numbers", () => {
      cli.run(undefined, withArgv("foo --count 999999999"));
      expect(fooAction.mock.lastCall?.[0].flags.count).toBe(999999999);
    });
  });

  describe("array param flags", () => {
    const fooAction = vi.fn();
    const fooCmd = command("foo")
      .flags({
        tags: flag("").requiredParam("array"),
        labels: flag("").optionalParam("array"),
        defaults: flag("").optionalParam("array", ["a", "b"]),
      })
      .action(fooAction);
    const cli = program("test").commands(fooCmd).build();

    it("fails on missing required array param", () => {
      cli.run(undefined, withArgv("foo"));
      expect(consoleErrorTrap).toHaveBeenLastCalledWith(
        expect.stringContaining("`--tags` value is missing")
      );
    });

    it("fails on missing optional array param value", () => {
      cli.run(undefined, withArgv("foo --tags one --labels"));
      expect(consoleErrorTrap).toHaveBeenLastCalledWith(
        expect.stringContaining("`--labels` value is not an array")
      );
    });

    it("defaults missing optional array param to undefined", () => {
      cli.run(undefined, withArgv("foo --tags one"));
      expect(fooAction.mock.lastCall?.[0].flags.labels).toBe(undefined);
    });

    it("uses default value for optional array param", () => {
      cli.run(undefined, withArgv("foo --tags one"));
      expect(fooAction.mock.lastCall?.[0].flags.defaults).toStrictEqual([
        "a",
        "b",
      ]);
    });

    it("parses single array value", () => {
      cli.run(undefined, withArgv("foo --tags one"));
      expect(fooAction.mock.lastCall?.[0].flags.tags).toStrictEqual(["one"]);
    });

    it("parses multiple array values", () => {
      cli.run(undefined, withArgv("foo --tags one --tags two --tags three"));
      expect(fooAction.mock.lastCall?.[0].flags.tags).toStrictEqual([
        "one",
        "two",
        "three",
      ]);
    });

    it("parses array with numeric strings", () => {
      cli.run(undefined, withArgv("foo --tags 1 --tags 2 --tags 3"));
      expect(fooAction.mock.lastCall?.[0].flags.tags).toStrictEqual([
        "1",
        "2",
        "3",
      ]);
    });

    it("parses array with special characters", () => {
      cli.run(
        undefined,
        withArgv("foo --tags user@example.com --tags test@test.com")
      );
      expect(fooAction.mock.lastCall?.[0].flags.tags).toStrictEqual([
        "user@example.com",
        "test@test.com",
      ]);
    });

    it("overrides default array when provided", () => {
      cli.run(undefined, withArgv("foo --tags one --defaults x --defaults y"));
      expect(fooAction.mock.lastCall?.[0].flags.defaults).toStrictEqual([
        "x",
        "y",
      ]);
    });

    it("parses mixed array flags", () => {
      cli.run(
        undefined,
        withArgv("foo --tags one --tags two --labels a --labels b")
      );
      expect(fooAction.mock.lastCall?.[0].flags.tags).toStrictEqual([
        "one",
        "two",
      ]);
      expect(fooAction.mock.lastCall?.[0].flags.labels).toStrictEqual([
        "a",
        "b",
      ]);
    });
  });

  test("flag char", () => {
    const fooAction = vi.fn();
    const fooCmd = command("foo")
      .flags({
        color: flag("").char("c").optionalParam("string"),
      })
      .action(fooAction);
    const cli = program("test").commands(fooCmd).build();

    cli.run(undefined, withArgv("foo"));
    cli.run(undefined, withArgv("foo --color red"));
    cli.run(undefined, withArgv("foo --c blue"));
    cli.run(undefined, withArgv("foo --c blue --color red"));
    cli.run(undefined, withArgv("foo --color red --c blue"));
    fooAction.mock.calls.forEach((args: any) => {
      expect(args[0].flags.color).toBe(args[0].flags.c);
    });

    expect(() => {
      const barCmd = command("foo")
        .flags({ color: flag("").char("co") })
        .action(() => {});
      program("test").commands(barCmd).build().program();
    }).toThrow("char must be 1 character");
  });

  it("preserves flag casing when specified", () => {
    const fooAction = vi.fn();
    const fooCmd = command("foo")
      .flags({
        deviceType: flag(""),
        deviceName: flag("").preserveCase(),
      })
      .action(fooAction);
    const cli = program("test").commands(fooCmd).build();

    cli.run(undefined, withArgv("foo"));
    expect(fooAction.mock.lastCall?.[0].flags).toHaveProperty("device-type");
    expect(fooAction.mock.lastCall?.[0].flags).toHaveProperty("deviceName");
  });

  it("allows commands to access program flags", () => {
    const fooAction = vi.fn();

    const programFlags = {
      verbose: flag("display extra information"),
      dryRun: flag("run without making changes"),
    };

    const fooCmd = command("foo")
      .programFlags<typeof programFlags>()
      .flags({
        force: flag("force the operation"),
      })
      .action(fooAction);

    const barCmd = command("bar")
      .action(() => {});

    const cli = program("test")
      .flags(programFlags)
      .commands(fooCmd, barCmd)
      .build();

    // Test without any flags
    cli.run(undefined, withArgv("foo"));
    expect(fooAction.mock.lastCall?.[0].flags).toStrictEqual({
      verbose: false,
      "dry-run": false,
      force: false,
    });

    // Test with program flags
    cli.run(undefined, withArgv("foo --verbose --dry-run"));
    expect(fooAction.mock.lastCall?.[0].flags).toStrictEqual({
      verbose: true,
      "dry-run": true,
      force: false,
    });

    // Test with command flags
    cli.run(undefined, withArgv("foo --force"));
    expect(fooAction.mock.lastCall?.[0].flags).toStrictEqual({
      verbose: false,
      "dry-run": false,
      force: true,
    });

    // Test with both program and command flags
    cli.run(undefined, withArgv("foo --verbose --force"));
    expect(fooAction.mock.lastCall?.[0].flags).toStrictEqual({
      verbose: true,
      "dry-run": false,
      force: true,
    });
  });

  describe("negated flags", () => {
    it("throws on negated flags with param", () => {
      expect(() => {
        const cmd = command("foo")
          .flags({
            bar: flag("").withNegated("").optionalParam("string"),
          })
          .action(() => {});
        program("test").commands(cmd).build().program();
      }).toThrow("cannot have param");

      expect(() => {
        const cmd = command("foo")
          .flags({
            noBar: flag("").optionalParam("string"),
          })
          .action(() => {});
        program("test").commands(cmd).build().program();
      }).toThrow("cannot have param");
    });

    it("throws on negated flags with witNegated", () => {
      expect(() => {
        const cmd = command("foo")
          .flags({
            noBar: flag("").withNegated(""),
          })
          .action(() => {});
        program("test").commands(cmd).build().program();
      }).toThrow("is already negated");
    });

    it("throws on negated flags with existing param flag", () => {
      expect(() => {
        const cmd = command("foo")
          .flags({
            bar: flag("").optionalParam("string"),
            noBar: flag(""),
          })
          .action(() => {});
        program("test").commands(cmd).build().program();
      }).toThrow("can only be used with boolean flags");
    });

    it("throws on negated flags with char", () => {
      expect(() => {
        const cmd = command("foo")
          .flags({
            noBar: flag("").char("b"),
          })
          .action(() => {});
        program("test").commands(cmd).build().program();
      }).toThrow("cannot have char");

      expect(() => {
        const cmd = command("foo")
          .flags({
            "no-bar": flag("").char("b"),
          })
          .action(() => {});
        program("test").commands(cmd).build().program();
      }).toThrow("cannot have char");
    });

    it("parses negated flags", () => {
      const fooAction = vi.fn();
      const fooCmd = command("foo")
        .flags({
          abort: flag("").withNegated(""),
          verify: flag(""),
          noVerify: flag(""),
          noClose: flag(""),
          noBreak: flag("").preserveCase(),
          "no-follow": flag(""),
        })
        .action(fooAction);
      const cli = program("test").commands(fooCmd).build();

      cli.run(undefined, withArgv("foo"));
      expect(fooAction.mock.lastCall?.[0].flags).toHaveProperty("abort");
      expect(fooAction.mock.lastCall?.[0].flags).toHaveProperty("verify");
      expect(fooAction.mock.lastCall?.[0].flags).not.toHaveProperty("noVerify");
      expect(fooAction.mock.lastCall?.[0].flags).not.toHaveProperty("noClose");
      expect(fooAction.mock.lastCall?.[0].flags).toHaveProperty("close");
      expect(fooAction.mock.lastCall?.[0].flags).toHaveProperty("noBreak");
      expect(fooAction.mock.lastCall?.[0].flags).not.toHaveProperty("break");
      expect(fooAction.mock.lastCall?.[0].flags).not.toHaveProperty(
        "no-follow"
      );
      expect(fooAction.mock.lastCall?.[0].flags).toHaveProperty("follow");

      expect(
        fooAction.mock.lastCall?.[0].flags.abort,
        "default withNegated to true"
      ).toBe(true);
      expect(
        fooAction.mock.lastCall?.[0].flags.verify,
        "default existing flag and negated flag to false"
      ).toBe(false);
      expect(
        fooAction.mock.lastCall?.[0].flags.close,
        "default only negated to true"
      ).toBe(true);
      expect(
        fooAction.mock.lastCall?.[0].flags.follow,
        "default only negated to true"
      ).toBe(true);
    });
  });
});
