import { describe, expect, it } from "vitest";

import { LexError } from "../src/errors";
import { type Token, type TokenType, tokenize } from "../src/lexer";

/** Token types in order, dropping the trailing EOF for easier assertions. */
function types(source: string): TokenType[] {
  return tokenize(source)
    .slice(0, -1)
    .map((t) => t.type);
}

describe("lexer", () => {
  it("always ends the stream with EOF", () => {
    const tokens = tokenize("");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe("EOF");
  });

  it("scans integer and decimal numbers with their literal values", () => {
    const tokens = tokenize("42 3.14");
    expect(tokens.map((t) => t.type)).toEqual(["NUMBER", "NUMBER", "EOF"]);
    expect(tokens[0].literal).toBe(42);
    expect(tokens[1].literal).toBe(3.14);
  });

  it("scans strings and decodes escape sequences", () => {
    const tokens = tokenize('"hello\\nworld"');
    expect(tokens[0].type).toBe("STRING");
    expect(tokens[0].literal).toBe("hello\nworld");
  });

  it("distinguishes keywords from identifiers", () => {
    expect(types("let x while if else fn return true false nil print")).toEqual([
      "LET",
      "IDENTIFIER",
      "WHILE",
      "IF",
      "ELSE",
      "FN",
      "RETURN",
      "TRUE",
      "FALSE",
      "NIL",
      "PRINT",
    ]);
  });

  it("scans one- and two-character operators", () => {
    expect(types("+ - * / % = == != < > <= >= ! && ||")).toEqual([
      "PLUS",
      "MINUS",
      "STAR",
      "SLASH",
      "PERCENT",
      "ASSIGN",
      "EQ",
      "NEQ",
      "LT",
      "GT",
      "LTE",
      "GTE",
      "BANG",
      "AND",
      "OR",
    ]);
  });

  it("scans punctuation", () => {
    expect(types("(){},;")).toEqual([
      "LPAREN",
      "RPAREN",
      "LBRACE",
      "RBRACE",
      "COMMA",
      "SEMICOLON",
    ]);
  });

  it("ignores line comments and tracks line numbers", () => {
    const tokens: Token[] = tokenize("let x = 1; // a comment\nx + 2;");
    expect(tokens.map((t) => t.type)).toEqual([
      "LET",
      "IDENTIFIER",
      "ASSIGN",
      "NUMBER",
      "SEMICOLON",
      "IDENTIFIER",
      "PLUS",
      "NUMBER",
      "SEMICOLON",
      "EOF",
    ]);
    // The second statement is on line 2.
    expect(tokens[5].line).toBe(2);
  });

  it("tokenizes a full statement in order", () => {
    expect(types('let name = "Ada";')).toEqual([
      "LET",
      "IDENTIFIER",
      "ASSIGN",
      "STRING",
      "SEMICOLON",
    ]);
  });

  it("throws on an unterminated string", () => {
    expect(() => tokenize('"oops')).toThrow(LexError);
  });

  it("throws on an unexpected character", () => {
    expect(() => tokenize("@")).toThrow(LexError);
  });

  it("reports the line number on errors", () => {
    try {
      tokenize("\n\n@");
      throw new Error("expected a LexError");
    } catch (error) {
      expect(error).toBeInstanceOf(LexError);
      expect((error as LexError).line).toBe(3);
    }
  });
});
