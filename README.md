# Commandstruct

🛠️ Typesafe and modular CLIs with [sade](https://github.com/lukeed/sade).

Commandstruct is a simple and powerful tool for building fast and typesafe command-line applications.

It supports CLI commands, sub-commands, positional arguments and flags. It also supports dependency injection using [getbox](https://github.com/eriicafes/getbox).

## Installation

Commandstruct has both `sade` and `getbox` as peer-dependencies.

```sh
npm i commandstruct
```

## Usage

### A Regular Program

```ts
import { arg, program, command, flag } from "commandstruct";

const commitCmd = command("commit")
  .describe("make a commit")
  .flags({
    message: flag("commit message").char("m").requiredParam("string"),
  })
  .action(({ flags }) => {
    console.log("committing with message", flags.message);
  });

const pushCmd = command("push")
  .describe("push changes")
  .args({
    repo: arg(),
    branch: arg().optional(),
  })
  .action(({ args }) => {
    console.log("pushing repo", args.repo, "at", args.branch || "HEAD");
  });

const prog = program("notgit")
  .describe("not your regular git")
  .flags({ verbose: flag("display extra information on command run") })
  .commands(commitCmd, pushCmd)
  .build();

prog.run();
```

### A Single Program

```ts
import { arg, singleProgram, flag } from "commandstruct";

const prog = singleProgram("mycat")
  .describe("print contents of file to stdout")
  .args({ 
    file: arg(),
  })
  .flags({
    number: flag("number output lines").char("n"),
  })
  .action(({ args, flags, restArgs }) => {
    console.log(
      "printing contents of file",
      args.file,
      flags.n ? "with lines" : "without lines",
      restArgs
    );
  });

prog.run();
```

## Program

A program defines it's commands and an optional default command.
When running the program, one of it's commands must be executed otherwise you get a `"No command specified"` error if no default command is set. Program wide flags can be defined on the program.

```ts
const prog = program("notgit")
  .describe("not your regular git")
  .example("notgit commit -m 'my first commit'")
  .example("notgit push origin main")
  .version("v1.0.0")
  .flags({
    /** program flags */
  })
  .commands(/** commands */)
  .default(/** default command */)
  .build();
```

## Single Program

A single program unlike a regular program does not have any commands, the entire program executes as one command. A single program supports `args` and `action`.

```ts
const prog = singleProgram("mycat")
  .describe("print contents of file to stdout")
  .example("mycat")
  .example("git push origin main")
  .version("v1.0.0")
  .args({
    /** program args */
  })
  .flags({
    /** program flags */
  })
  .action(() => {
    /** program action */
  });
```

## Command

A command defines its `flags`, `actions` and also additional `subcommands` if needed.

```ts
const programFlags = {
  /** program flags */
};

const cmd = command("commit")
  .describe("make a commit")
  .alias("cm", "com")
  .alias("comit")
  .example("git commit -m 'my first commit'")
  .example("git cm -m 'another commit")
  .programFlags<typeof programFlags>()
  .subcommands(/** subcommands */)
  .args({
    /** command args */
  })
  .flags({
    /** command flags */
  })
  .action(({ args, flags, restArgs }, box) => {
    /** command action - box is the getbox Box instance */
  });
```

## Default Command

You can make any command or subcommand the default command. This will execute that command when no command was passed to the program.

```ts
import { commitCmd, pushCmd } from "./commands";

const prog = program("nogit")
  .commands(commitCmd, pushCmd)
  .default(commitCmd) // commitCmd will be executed by default
  .build();
```

## Args

Positional arguments are declared in the order they should be provided. Optional arguments must be placed after required arguments.

```ts
command("example")
  .args({
    foo: arg(),
    bar: arg(),
    baz: arg().optional(),
  })
  .action(({ args, restArgs }) => {
    /**
    args: {
        foo: string;
        bar: string;
        baz: string | undefined;
    }
    restArgs: string[]
    */
  });
```

Variadic arguments can be accessed using restArgs.

## Flags

By default flags are boolean values and default to false. Flag keys are also converted to kebab-case except when explicitly disabled using `.preserveCase()`.

```ts
command("example")
  .flags({
    foo: flag("foo description"),
    anotherFoo: flag("another foo description"),
    lastFoo: flag("last foo description").preserveCase(),
  })
  .action(({ flags }) => {
    /**
    flags: {
        foo: boolean;
        "another-foo": boolean;
        lastFoo: boolean;
    }
    */
  });
```

### Char Flag

Allow passing flags with short character.

```ts
command("example")
  .flags({
    foo: flag("foo description").char("f"),
  })
  .action(({ flags }) => {
    // flags.foo === flags.f
  });
```

### Flag Params

Accept values with flags.

```ts
command("example")
  .flags({
    foo: flag("foo description").requiredParam("string"),
    bar: flag("bar description").optionalParam("number"),
    baz: flag("baz description").optionalParam("array", ["1"]), // with default
  })
  .action(({ flags }) => {
    /**
    flags: {
        foo: string;
        bar: number | undefined;
        baz: string[];
    };
    */
  });
```

CLI usage examples:

```sh
# String params
example --foo "hello world"
example --foo hello

# Number params
example --foo hello --bar 42
example --foo hello --bar 3.14
example --foo hello --bar -10

# Array params (can be specified multiple times)
example --foo hello --baz one
example --foo hello --baz one --baz two --baz three

# Mixed params
example --foo hello --bar 100 --baz item1 --baz item2
```

### Negated Flags

Sade supports negating flags by supplying `--no-xxx` where `xxx` is the name of the flag. Flag values are `false` by default and passing `--no-xxx` would set the flag value to `false`, hence, this has no effect by default.
However, many usecases of negated flags are for flags that should be defaulted to `true`. There are 3 ways to use negated flags in commandstruct.
All these 3 methods adds the `--no-xxx` option to the command description but they differ in the default value of the flag.

```ts
// using withNegated
command("example")
  .flags({
    foo: flag("foo description").withNegated("negated description"),
  })
  .action(({ flags }) => {
    // flags.foo is true by default (default shown in description)
  });
```

```ts
// only negated flag
command("example")
  .flags({
    noFoo: flag("turn off foo description"),
    "no-bar": flag("turn off bar description"),
  })
  .action(({ flags }) => {
    // flags.foo is true by default (default not shown in description)
    // flags.bar is true by default (default not shown in description)
  });

// NOTE: noFoo is converted to kebab-case
// if it's case was preserved it would not count as a negated flag.
```

You may not be able to use only negated flag if you enable the `errorOnUnknown` run option.

```ts
// both existing flag and negated flag
command("example")
  .flags({
    foo: flag("foo description"),
    noFoo: flag("turn off bar description"),
  })
  .action(({ flags }) => {
    // flags.foo is false by default (default not shown in description)
  });
```

## Program Flags

Use program flags from a command. The program flags can then be accessed in the command action.

```ts
const programFlags = {
  dryRun: flag("run command but do not commit results"),
};

const cmd = command("example")
  .programFlags<typeof programFlags>()
  .flags({
    message: flag("commit message"),
  })
  .action(({ flags }) => {
    /**
    flags: {
        message: boolean;
        "dry-run": boolean;
    }
    */
  });

const prog = program("test").flags(programFlags).commands(cmd).build();
```

## Dependency Injection

Commandstruct is designed to work with [getbox](https://github.com/eriicafes/getbox). Commands receive the Box instance as the second parameter to their action function, allowing them to retrieve dependencies.

```sh
npm i getbox
```

### Example

```ts
import { arg, command, program } from "commandstruct";
import { Box } from "getbox";

class Logger {
  log(message: string) {
    console.log(`[LOG] ${message}`);
  }
}

class UserService {
  constructor(private logger: Logger) {}

  static init(box: Box) {
    // Called automatically when box.get(UserService) is used
    const logger = box.get(Logger);
    return new UserService(logger);
  }

  createUser(name: string) {
    this.logger.log(`Creating user: ${name}`);
  }
}

const createCmd = command("create")
  .args({ name: arg() })
  .action(({ args }, box) => {
    // UserService is auto-initialized with Logger dependency
    const service = box.get(UserService);
    service.createUser(args.name);
  });

// The program creates a default box automatically
const prog = program("user-utils").commands(createCmd).build();

// Or you can provide your own box
const box = new Box();
const prog2 = program("user-utils", box).commands(createCmd).build();
```

## Run

Run executes any sade program with some useful options.

```ts
const prog = program("test")
  .flags(/** program flags */)
  .commands(/** commands */)
  .build();

run(prog.program());
```

If you like to configure all available options.

```ts
run(
  prog.program(),
  {
    errorOnUnknown(flag) {
      return `flag not supported '${flag}'`;
    },
    onError(err) {
      console.error(err);
    },
  },
  process.argv
);
```

### Run Options

- errorOnUnknown: by default unknown options/flags are allowed, set to true to return a default error message or pass a function that returns a custom error message when an unknown option/flag is encountered.

- onError: catch error thrown in the executing command before the program terminates.

As a convenience, a run methods exists on the commandstruct program itself.

```ts
const prog = program("test")
  .flags(/** program flags */)
  .commands(/** commands */)
  .build();

prog.run();
```

## Incremental Adoption

Commandstruct can be added to an existing sade program.

```ts
import sade from "sade";
import { Box } from "getbox";
import { command, flag, run } from "commandstruct";

const prog = sade("notgit")
  .command("push <repo> [branch]")
  .describe("push changes")
  .action((repo, branch, opts) => {
    console.log("pushing repo", repo, "at", branch || "HEAD");
  });

const cmd = command("commit")
  .describe("make a commit")
  .flags({
    message: flag("commit message").char("m").requiredParam("string"),
  })
  .action(({ flags }) => {
    console.log("committing with message", flags.message);
  });

const box = new Box();
cmd.command(box, { program: prog, programFlags: {} });

run(prog);
```

A commandstruct program can also be further modified just like a regular sade program.

```ts
import { command, program, flag, run } from "commandstruct";

const cmd = command("commit")
  .describe("make a commit")
  .flags({
    message: flag("commit message").char("m").requiredParam("string"),
  })
  .action(({ flags }) => {
    console.log("committing with message", flags.message);
  });

const prog = program("notgit").commands(cmd).build().program(); // returns a new sade instance

prog
  .command("push <repo> [branch]")
  .describe("push changes")
  .action((repo, branch, opts) => {
    console.log("pushing repo", repo, "at", branch || "HEAD");
  });

run(prog);
```
