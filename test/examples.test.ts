import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { Interpreter } from "../src/interpreter.js";
import { tokenize } from "../src/lexer.js";
import { parse } from "../src/parser.js";

const examplesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "examples",
);

/** Run an example program end-to-end and return everything it printed. */
function runExample(file: string): string[] {
  const source = readFileSync(join(examplesDir, file), "utf8");
  const output: string[] = [];
  const interpreter = new Interpreter((line) => output.push(line));
  interpreter.interpret(parse(tokenize(source)));
  return output;
}

describe("examples (end-to-end)", () => {
  it("runs fizzbuzz", () => {
    expect(runExample("fizzbuzz.mylang")).toEqual([
      "1",
      "2",
      "Fizz",
      "4",
      "Buzz",
      "Fizz",
      "7",
      "8",
      "Fizz",
      "Buzz",
      "11",
      "Fizz",
      "13",
      "14",
      "FizzBuzz",
      "16",
      "17",
      "Fizz",
      "19",
      "Buzz",
    ]);
  });

  it("runs recursive fib", () => {
    expect(runExample("fib.mylang")).toEqual([
      "0",
      "1",
      "1",
      "2",
      "3",
      "5",
      "8",
      "13",
      "21",
      "34",
      "55",
      "89",
      "144",
      "233",
      "377",
      "610",
      "987",
      "1597",
      "2584",
      "4181",
      "6765",
    ]);
  });

  it("runs closures with independent per-counter state", () => {
    expect(runExample("closures.mylang")).toEqual(["1", "2", "3", "1", "4"]);
  });
});
