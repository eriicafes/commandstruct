import { Box } from "getbox";
import sade, { Sade } from "sade";
import { Arg, ParsedArgs } from "./arg";
import { Flag, ParsedFlags } from "./flag";
import { run, RunOptions } from "./run";
import { Invalid, Spread } from "./types";
import { commandContext, commandUsage, registerFlags } from "./utils";

type SingleProgramOptions<
  Name extends string,
  Args extends Record<string, Arg>,
  Flags extends Record<string, Flag>
> = {
  name: Name;
  version: string | undefined;
  description: string | undefined;
  examples: string[];
  args: Args;
  flags: Flags;
  action: (
    ctx: {
      args: ParsedArgs<Args>;
      flags: ParsedFlags<Flags>;
      restArgs: string[];
    },
    box: Box
  ) => any | Promise<any>;
};

export type AnySingleProgram = SingleProgram<any, any, any>;

export class SingleProgram<
  Name extends string,
  Args extends Record<string, Arg>,
  Flags extends Record<string, Flag>
> {
  constructor(
    private box: Box,
    private options: SingleProgramOptions<Name, Args, Flags>
  ) {}

  public program(): Sade {
    const usage = commandUsage(undefined, this.options.name, this.options.args)
    const program = sade(usage, true);
    if (this.options.version) program.version(this.options.version);
    if (this.options.description) program.describe(this.options.description);
    for (const example of this.options.examples) program.example(example);

    registerFlags(program, this.options.flags);

    return program.action((...fnArgs) => {
      const ctx = commandContext(
        this.options.args,
        this.options.flags,
        {},
        fnArgs
      );
      return this.options.action(ctx, this.box);
    });
  }

  public run(options?: RunOptions, argv?: string[]) {
    return run(this.program(), options, argv);
  }
}

class SingleProgramBuilder<
  Name extends string,
  Args extends Record<string, Arg>,
  Flags extends Record<string, Flag>
> {
  private options: Omit<SingleProgramOptions<Name, Args, Flags>, "action">;

  constructor(private box: Box, name: Name) {
    this.options = {
      name,
      version: undefined,
      description: undefined,
      examples: [],
      args: {} as Args,
      flags: {} as Flags,
    };
  }

  public version(version: string) {
    this.options.version = version;
    return this;
  }

  public describe(description: string) {
    this.options.description = description;
    return this;
  }

  public example(example: string) {
    this.options.examples.push(example);
    return this;
  }

  public args<
    A extends Record<string, Arg> extends Args ? Record<string, Arg> : Invalid<"args can only be set once">
  >(args: A) {
    this.options.args = args as unknown as Args;
    return this as unknown as Record<string, Arg> extends Args
      ? SingleProgramBuilder<Name, A, Flags>
      : never;
  }

  public flags<
    F extends Record<string, Flag> extends Flags ? Record<string, Flag> : Invalid<"flags can only be set once">
  >(flags: F) {
    this.options.flags = flags as unknown as Flags;
    return this as unknown as Record<string, Flag> extends Flags
      ? SingleProgramBuilder<Name, Args, F>
      : never;
  }

  public action(
    fn: (
      ctx: {
        args: Spread<ParsedArgs<Args>>;
        flags: Spread<ParsedFlags<Flags>>;
        restArgs: string[];
      },
      box: Box
    ) => any | Promise<any>
  ) {
    return new SingleProgram<Name, Args, Flags>(this.box, {
      ...this.options,
      action: fn,
    });
  }
}

export function singleProgram<Name extends string>(
  name: Name,
  box = new Box()
): SingleProgramBuilder<Name, {}, {}> {
  return new SingleProgramBuilder(box, name);
}
