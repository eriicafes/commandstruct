import { Sade } from "sade";
import { Arg, ParsedArgs } from "./arg";
import { Flag, ParsedFlags } from "./flag";
import { Invalid, Merge, Spread } from "./types";
import { commandContext, commandUsage, registerFlags } from "./utils";
import { Box } from "getbox";

type SubcommandOptions<ProgramFlags extends Record<string, Flag>> = {
  program: Sade;
  programFlags: ProgramFlags;
  baseCmd?: string | undefined;
  defaultCmd?: Command<any, any, any, ProgramFlags>;
};

type CommandOptions<
  Name extends string,
  Args extends Record<string, Arg>,
  Flags extends Record<string, Flag>,
  ProgramFlags extends Record<string, Flag>
> = {
  name: Name;
  description: string | undefined;
  aliases: string[];
  examples: string[];
  args: Args;
  flags: Flags;
  action: (
    ctx: {
      args: ParsedArgs<Args>;
      flags: ParsedFlags<Merge<ProgramFlags, Flags>>;
      restArgs: string[];
    },
    box: Box
  ) => any | Promise<any>;
  subcommands: Command<any, any, any, ProgramFlags>[];
};

export type AnyCommand = Command<any, any, any, any>;

export class Command<
  Name extends string,
  Args extends Record<string, Arg>,
  Flags extends Record<string, Flag>,
  ProgramFlags extends Record<string, Flag>
> {
  constructor(
    private options: CommandOptions<Name, Args, Flags, ProgramFlags>
  ) {}

  public command(box: Box, options: SubcommandOptions<ProgramFlags>) {
    const { program, programFlags, baseCmd, defaultCmd } = options;
    const usage = commandUsage(baseCmd, this.options.name, this.options.args);
    const command = program.command(usage, this.options.description, {
      default: defaultCmd === this,
    });
    if (this.options.aliases.length) command.alias(...this.options.aliases);
    for (const example of this.options.examples) command.example(example);

    registerFlags(command, this.options.flags);

    command.action((...fnArgs) => {
      const ctx = commandContext(
        this.options.args,
        this.options.flags,
        programFlags,
        fnArgs
      );
      return this.options.action(ctx, box);
    });

    for (const subcommand of this.options.subcommands) {
      subcommand.command(box, {
        program,
        programFlags,
        baseCmd: baseCmd
          ? baseCmd + " " + this.options.name
          : this.options.name,
        defaultCmd: defaultCmd === this ? undefined : defaultCmd,
      });
    }
  }
}

class CommandBuilder<
  Name extends string,
  Args extends Record<string, Arg>,
  Flags extends Record<string, Flag>,
  ProgramFlags extends Record<string, Flag>
> {
  private options: Omit<
    CommandOptions<Name, Args, Flags, ProgramFlags>,
    "action"
  >;

  constructor(name: Name) {
    this.options = {
      name,
      description: undefined,
      aliases: [],
      examples: [],
      args: {} as Args,
      flags: {} as Flags,
      subcommands: [],
    };
  }

  public describe(description: string) {
    this.options.description = description;
    return this;
  }

  public alias(...aliases: string[]) {
    this.options.aliases.push(...aliases);
    return this;
  }

  public example(example: string) {
    this.options.examples.push(example);
    return this;
  }

  public args<
    A extends Record<string, Arg> extends Args
      ? Record<string, Arg>
      : Invalid<"args can only be set once">
  >(args: A) {
    this.options.args = args as unknown as Args;
    return this as unknown as Record<string, Arg> extends Args
      ? CommandBuilder<Name, A, Flags, ProgramFlags>
      : never;
  }

  public flags<
    F extends Record<string, Flag> extends Flags
      ? Record<string, Flag>
      : Invalid<"flags can only be set once">
  >(flags: F) {
    this.options.flags = flags as unknown as Flags;
    return this as unknown as Record<string, Flag> extends Flags
      ? CommandBuilder<Name, Args, F, ProgramFlags>
      : never;
  }

  public programFlags<
    F extends Record<string, Flag> extends ProgramFlags
      ? Record<string, Flag>
      : Invalid<"programFlags can only be set once">
  >() {
    return this as unknown as Record<string, Flag> extends ProgramFlags
      ? CommandBuilder<Name, Args, Flags, F>
      : never;
  }

  public subcommands<C extends Command<any, any, any, ProgramFlags>[]>(
    ...commands: C
  ) {
    this.options.subcommands.push(...commands);
    return this;
  }

  public action(
    fn: (
      ctx: {
        args: Spread<ParsedArgs<Args>>;
        flags: Spread<ParsedFlags<Merge<ProgramFlags, Flags>>>;
        restArgs: string[];
      },
      box: Box
    ) => any | Promise<any>
  ) {
    return new Command<Name, Args, Flags, ProgramFlags>({
      ...this.options,
      action: fn,
    });
  }
}

export function command<Name extends string>(
  name: Name
): CommandBuilder<Name, {}, {}, {}> {
  return new CommandBuilder(name);
}
