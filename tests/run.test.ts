import sade from "sade";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { run } from "../src";
import { withArgv } from "./utils";

describe("Run", () => {
  const consoleErrorTrap = vi.fn();
  const consoleError = console.error;
  const processExitTrap = vi.fn(() => undefined as never);
  const processExit = process.exit;
  beforeAll(() => {
    console.error = (...data) => consoleErrorTrap(data.join(" "));
    process.exit = processExitTrap;
  });
  afterAll(() => {
    console.error = consoleError;
    process.exit = processExit;
  });

  it("returns action return value", async () => {
    const prog = sade("test")
      .command("foo")
      .action(() => "done");

    const res = await run(prog, undefined, withArgv("foo"));
    expect(res).toBe("done");
  });

  describe("error on unknown", () => {
    beforeEach(() => {
      processExitTrap.mockReset();
    });

    const prog = sade("test")
      .option("-i, --inspect", "")
      .command("foo")
      .action(() => {});

    it("allows unknown options by default", async () => {
      await run(prog, undefined, withArgv("foo -f"));
      expect(consoleErrorTrap).toBeCalledTimes(0);

      await run(prog, { errorOnUnknown: false }, withArgv("foo -f"));
      expect(consoleErrorTrap).toBeCalledTimes(0);
    });

    it("errors on unknown options", async () => {
      await run(
        prog,
        {
          errorOnUnknown: true,
        },
        withArgv("foo -f")
      );
      expect(consoleErrorTrap).toHaveBeenLastCalledWith(
        expect.stringContaining("Parsed unknown option")
      );
      expect(processExitTrap).toBeCalledTimes(1);
    });

    it("errors on unknown options with callback error message", async () => {
      await run(
        prog,
        {
          errorOnUnknown(flag) {
            return `bad flag ${flag}`;
          },
        },
        withArgv("foo -f")
      );
      expect(consoleErrorTrap).toHaveBeenLastCalledWith(
        expect.stringContaining("bad flag -f")
      );
      expect(processExitTrap).toBeCalledTimes(1);
    });
  });

  describe("error handler", () => {
    const prog = sade("test")
      .command("foo")
      .action(() => {
        throw new Error("something went wrong");
      });

    it("rethrows command action error", async () => {
      await expect(run(prog, undefined, withArgv("foo"))).rejects.toThrow(
        "something went wrong"
      );
    });

    it("handles command action error with error handler", async () => {
      await expect(
        run(
          prog,
          {
            onError(err) {
              console.error("handled error:", err.message);
            },
          },
          withArgv("foo")
        )
      ).resolves.toBe(undefined);
      expect(consoleErrorTrap).toBeCalledWith(
        "handled error: something went wrong"
      );
    });
  });
});
