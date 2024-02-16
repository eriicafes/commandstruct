import { createCommand, createProgram, flag, run } from "../src";

const cmd = createCommand("commit")
    .describe("make a commit")
    .flags({
        message: flag("commit message").char("m").requiredParam("string"),
    })
    .action(({ flags }) => {
        console.log("committing with message", flags.message);
    });

const prog = createProgram("notgit")
    .commands(cmd)
    .build()
    .program() // returns a new sade instance

prog.command('push <repo> [branch]')
    .describe("push changes")
    .action((repo, branch, opts) => {
        console.log("pushing repo", repo, "at", branch || "HEAD");
    })

run(prog)
