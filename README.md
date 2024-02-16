# Commandstruct

🛠️ Typesafe and modular CLIs with [Sade](https://github.com/lukeed/sade).

Commandstruct is a simple and powerful tool for building fast and typesafe command-line applications.

It supports CLI commands, sub-commands, positional arguments and flags. It also supports dependency injection using [Hollywood DI](https://github.com/eriicafes/hollywood-di).

## Installation

Commandstruct has both sade and hollywood-di as peer-dependencies so make sure to install them along side it.

```sh
npm i commandstruct sade hollywood-di
```

## Usage

### A Regular Program

```ts
import { arg, createProgram, createCommand, flag } from "commandstruct";

const commitCmd = createCommand("commit")
  .describe("make a commit")
  .flags({
    message: flag("commit message").char("m").requiredParam("string"),
  })
  .action(({ flags }) => {
    console.log("committing with message", flags.message);
  });

const pushCmd = createCommand("push")
  .describe("push changes")
  .args({
    repo: arg(),
    branch: arg().optional(),
  })
  .action(({ args }) => {
    console.log("pushing repo", args.repo, "at", args.branch || "HEAD");
  });

const prog = createProgram("notgit")
  .describe("not your regular git")
  .flags({ verbose: flag("display extra information on command run") })
  .commands(commitCmd, pushCmd)
  .build();

prog.run();
```

### A Single Program

```ts
import { arg, createSingleProgram, flag } from "commandstruct";

const prog = createSingleProgram("mycat")
  .describe("print contents of file to stdout")
  .args({ file: arg() })
  .flags({ number: flag("number output lines").char("n") })
  .action(({ args, flags, restArgs }) => {
    console.log(
      "printing contents of file",
      args.file,
      flags.n ? "with lines" : "without lines"
    );
    if (restArgs.length) console.log("maybe print these", restArgs);
  });

prog.run();
```

## Program

A program defines it's commands and an optional default command.
When running the program, one of it's commands must be executed otherwise you get a `"No command specified"` error if no default command is set. Program wide flags can be defined on the program.

```ts
const prog = createProgram("notgit")
  .describe("not your regular git")
  .example("notgit commit -m 'my first commit'")
  .example("notgit push origin main")
  .version("v1.0.0")
  .provide({
    /** register tokens */
  })
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
const prog = createSingleProgram("mycat")
  .describe("print contents of file to stdout")
  .example("mycat")
  .example("git push origin main")
  .version("v1.0.0")
  .provide({
    /** register tokens */
  })
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

const cmd = createCommand("commit")
  .describe("make a commit")
  .alias("cm", "com")
  .alias("comit")
  .example("git commit -m 'my first commit'")
  .example("git cm -m 'another commit")
  .useFlags<typeof programFlags>()
  .use<{
    /** dependencies */
  }>()
  .provide({
    /** register tokens */
  })
  .subcommands(/** subcommands */)
  .args({
    /** command args */
  })
  .flags({
    /** command flags */
  })
  .action(({ args, flags, restArgs }, container) => {
    /** command action */
  });
```

## Default Command

You can make any command or subcommand the default command. This will execute that command when no command was passed to the program.

```ts
import { commitCmd, pushCmd } from "./commands";

const prog = createProgram("nogit")
  .commands(commitCmd, pushCmd)
  .default(commitCmd) // commitCmd will be executed by default
  .build();
```

## Args

Positional arguments are declared in the order they should be provided. Optional arguments must be placed after required arguments.

```ts
createCommand("example")
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
createCommand("example")
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
createCommand("example")
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
createCommand("example")
  .flags({
    foo: flag("foo description").requiredParam("string"),
    bar: flag("bar description").optionalParam("number"),
    baz: flag("baz description").optionalParam("array", ["1"]), // with default
  })
  .action(({ flag }) => {
    /**
    flags: {
        foo: string;
        bar: number | undefined;
        baz: string[];
    };
    */
  });
```

### Negated Flags

Sade supports negating flags by supplying `--no-xxx` where `xxx` is the name of the flag. Flag values are `false` by default and passing `--no-xxx` would set the flag value to `false`, hence, this has no effect by default.
However, many usecases of negated flags are for flags that should be defaulted to `true`. There are 3 ways to use negated flags in commandstruct.
All these 3 methods adds the `--no-xxx` option to the command description but they differ in the default value of the flag.

```ts
// using withNegated
createCommand("example")
  .flags({
    foo: flag("foo description").withNegated("negated description"),
  })
  .action(({ flags }) => {
    // flags.foo is true by default (default shown in description)
  });
```

```ts
// only negated flag
createCommand("example")
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
createCommand("example")
  .flags({
    foo: flag("foo description"),
    noFoo: flag("turn off bar description"),
  })
  .action(({ flags }) => {
    // flags.foo is false by default (default not shown in description)
  });
```

## Use Flags

Use program flags from a command. The program flags can then be accessed in the command action.

```ts
const programFlags = {
  dryRun: flag("run command but do not commit results"),
};

const cmd = createCommand("example")
  .useFlags<typeof programFlags>()
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

const prog = createProgram("test").flags(programFlags).commands(cmd).build();
```

## Use

Define command dependencies. The command can then only be added as a command or subcommand to a program/command that satisfies it's dependencies. The command dependencies can be accessed in the command action.

You can only call `use` once and only before calling `provide`.

```ts
interface Counter {
  count: number;
  increment(): void;
}

const cmd = createCommand("commit")
  .use<{ counter: Counter }>()
  .action((ctx, container) => {
    /**
    container: {
         counter: Counter;
    }
    */
  });

class LinearCounter {
  public count = 0;
  public increment() {
    this.count++;
  }
}

const prog = createProgram("test")
  .flags(programFlags)
  .provide({ counter: LinearCounter })
  .commands(cmd)
  .build();
```

## Provide

Provide creates a new child container. Registered tokens can then be used in the commmand action and in futher calls to `provide`. See more about register tokens in [Hollywood DI](https://github.com/eriicafes/hollywood-di#tokens).

```ts
import { defineInit } from "hollywood-di";
import { createCommand } from "commandstruct";

class Foo {}
class Bar {
  public static init = defineInit(Bar).args("foo");

  constructor(public foo: Foo) {}
}

const cmd = createCommand("example")
  .provide({
    foo: Foo,
    bar: Bar,
  })
  .action((ctx, container) => {
    /**
    container: {
        foo: Foo;
        bar: Bar;
    }
    */
  });
```

## Run

Run executes any sade program with some useful options.

```ts
const prog = createProgram("test")
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
const prog = createProgram("test")
  .flags(/** program flags */)
  .commands(/** commands */)
  .build();

prog.run();
```

## Dependency Injection

At the core commandstruct is designed to work with [Hollywood DI](https://github.com/eriicafes/hollywood-di). Commands can define their dependencies using `use`, programs and commands can register new tokens using `provide` which creates a child container.

A root container can also be passed to the program.

```ts
import { Hollywood, defineInit } from "hollywood-di";
import { createCommand, createProgram } from "commandstruct";

class Foo {}
class Bar {
  public static init = defineInit(Bar).args("foo");

  constructor(public foo: Foo) {}
}

const cmd = createCommand("example")
  .use<{ foo: Foo }>()
  .provide({ bar: Bar })
  .action((ctx, container) => {
    /**
    container: {
        bar: Bar;
        foo: Foo;
    }
    */
  });

const container = Hollywood.create({
  foo: Foo,
});

const prog = createProgram("test", container).commands(cmd).build();
```

## Incremental Adoption

Commandstruct can be added to an existing sade program.

```ts
import sade from "sade";
import { createCommand, flag, run } from "commandstruct";

const prog = sade("notgit")
  .command("push <repo> [branch]")
  .describe("push changes")
  .action((repo, branch, opts) => {
    console.log("pushing repo", repo, "at", branch || "HEAD");
  });

const cmd = createCommand("commit")
  .describe("make a commit")
  .flags({
    message: flag("commit message").char("m").requiredParam("string"),
  })
  .action(({ flags }) => {
    console.log("committing with message", flags.message);
  });

cmd.command({ program: prog, programFlags: {}, container: undefined });

run(prog);
```

A commandstruct program can also be further modified just like a regular sade program.

```ts
import { createCommand, createProgram, flag, run } from "commandstruct";

const cmd = createCommand("commit")
  .describe("make a commit")
  .flags({
    message: flag("commit message").char("m").requiredParam("string"),
  })
  .action(({ flags }) => {
    console.log("committing with message", flags.message);
  });

const prog = createProgram("notgit").commands(cmd).build().program(); // returns a new sade instance

prog
  .command("push <repo> [branch]")
  .describe("push changes")
  .action((repo, branch, opts) => {
    console.log("pushing repo", repo, "at", branch || "HEAD");
  });

run(prog);
```
