#!/usr/bin/env -S npx tsx
// Entry point. With no arguments it starts an interactive REPL; given a file
// path it runs that program. Both share the same pipeline:
//   source text -> tokenize -> parse -> interpret.

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";

import { MyLangError } from "./errors.js";
import { Interpreter } from "./interpreter.js";
import { tokenize } from "./lexer.js";
import { parse } from "./parser.js";

function run(source: string, interpreter: Interpreter, echoLast = false): void {
  const tokens = tokenize(source);
  const statements = parse(tokens);
  interpreter.interpret(statements, echoLast);
}

function reportError(error: unknown): void {
  if (error instanceof MyLangError) {
    console.error(`${error.name} [line ${error.line}]: ${error.message}`);
  } else {
    console.error(error);
  }
}

function runFile(path: string): void {
  let source: string;
  try {
    source = readFileSync(path, "utf8");
  } catch {
    console.error(`Could not read file '${path}'.`);
    process.exit(1);
  }
  const interpreter = new Interpreter();
  try {
    run(source, interpreter);
  } catch (error) {
    reportError(error);
    process.exit(1);
  }
}

function repl(): void {
  // One interpreter for the whole session, so bindings persist between lines.
  const interpreter = new Interpreter();
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "mylang> ",
  });

  console.log(
    "mylang v0 REPL — type an expression or statement, Ctrl+D to exit.",
  );
  rl.prompt();

  rl.on("line", (line) => {
    let source = line.trim();
    if (source.length > 0) {
      // Be forgiving about the trailing ';' so `1 + 1` works interactively.
      if (!source.endsWith(";") && !source.endsWith("}")) source += ";";
      try {
        run(source, interpreter, true);
      } catch (error) {
        reportError(error);
      }
    }
    rl.prompt();
  });

  rl.on("close", () => {
    console.log();
    process.exit(0);
  });
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    repl();
  } else {
    runFile(args[0]);
  }
}

main();
