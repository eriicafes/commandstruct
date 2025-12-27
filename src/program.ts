import sade, { Sade } from "sade";
import { Command } from "./command";
import { Flag } from "./flag";
import { run, RunOptions } from "./run";
import { registerFlags } from "./utils";
import { Box } from "getbox";

type ProgramOptions<Name extends string, Flags extends Record<string, Flag>> = {
  name: Name;
  version: string | undefined;
  description: string | undefined;
  examples: string[];
  flags: Flags;
  commands: Command<any, any, any, Flags>[];
  default: Command<any, any, any, Flags> | undefined;
};

export type AnyProgram = Program<any, any>;

export class Program<Name extends string, Flags extends Record<string, Flag>> {
  constructor(private box: Box, private options: ProgramOptions<Name, Flags>) {}

  public program(): Sade {
    const program = sade(this.options.name);
    if (this.options.version) program.version(this.options.version);
    if (this.options.description) program.describe(this.options.description);
    for (const example of this.options.examples) program.example(example);

    registerFlags(program, this.options.flags);

    for (const command of this.options.commands) {
      command.command(this.box, {
        program,
        programFlags: this.options.flags,
        defaultCmd: this.options.default,
      });
    }
    return program;
  }

  public run(options?: RunOptions, argv?: string[]) {
    return run(this.program(), options, argv);
  }
}

class ProgramBuilder<Name extends string, Flags extends Record<string, Flag>> {
  private options: ProgramOptions<Name, Flags>;

  constructor(private box: Box, name: Name) {
    this.options = {
      name,
      version: undefined,
      description: undefined,
      examples: [],
      flags: {} as Flags,
      commands: [],
      default: undefined,
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

  public flags<
    F extends Record<string, Flag> extends Flags ? Record<string, Flag> : never
  >(flags: F) {
    this.options.flags = flags as unknown as Flags;
    return this as unknown as Record<string, Flag> extends Flags
      ? ProgramBuilder<Name, F>
      : never;
  }

  public commands<C extends Command<any, any, any, Flags>[]>(...commands: C) {
    this.options.commands.push(...commands);
    return this;
  }

  public default(command: Command<any, any, any, Flags>) {
    this.options.default = command;
    return this;
  }

  public build() {
    return new Program<Name, Flags>(this.box, this.options);
  }
}

export function program<Name extends string>(name: Name, box = new Box()) {
  return new ProgramBuilder(box, name);
}
