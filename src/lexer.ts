// The lexer (scanner) turns raw source text into a flat list of tokens.
// It is hand-written and single-pass: walk the source one character at a time,
// emitting a token whenever a lexeme is complete.

import { LexError } from "./errors";

export type TokenType =
  // literals
  | "NUMBER"
  | "STRING"
  | "IDENTIFIER"
  // keywords
  | "LET"
  | "FN"
  | "IF"
  | "ELSE"
  | "WHILE"
  | "PRINT"
  | "RETURN"
  | "TRUE"
  | "FALSE"
  | "NIL"
  // operators
  | "PLUS"
  | "MINUS"
  | "STAR"
  | "SLASH"
  | "PERCENT"
  | "ASSIGN"
  | "EQ"
  | "NEQ"
  | "LT"
  | "GT"
  | "LTE"
  | "GTE"
  | "BANG"
  | "AND"
  | "OR"
  // punctuation
  | "LPAREN"
  | "RPAREN"
  | "LBRACE"
  | "RBRACE"
  | "COMMA"
  | "SEMICOLON"
  // end of input
  | "EOF";

export interface Token {
  type: TokenType;
  lexeme: string;
  line: number;
  /** Present for NUMBER (a number) and STRING (the decoded string). */
  literal?: number | string;
}

const KEYWORDS: Record<string, TokenType> = {
  let: "LET",
  fn: "FN",
  if: "IF",
  else: "ELSE",
  while: "WHILE",
  print: "PRINT",
  return: "RETURN",
  true: "TRUE",
  false: "FALSE",
  nil: "NIL",
};

export class Lexer {
  private readonly tokens: Token[] = [];
  private start = 0;
  private current = 0;
  private line = 1;

  constructor(private readonly source: string) {}

  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.scanToken();
    }
    this.tokens.push({ type: "EOF", lexeme: "", line: this.line });
    return this.tokens;
  }

  private scanToken(): void {
    const c = this.advance();
    switch (c) {
      case "(":
        return this.add("LPAREN");
      case ")":
        return this.add("RPAREN");
      case "{":
        return this.add("LBRACE");
      case "}":
        return this.add("RBRACE");
      case ",":
        return this.add("COMMA");
      case ";":
        return this.add("SEMICOLON");
      case "+":
        return this.add("PLUS");
      case "-":
        return this.add("MINUS");
      case "*":
        return this.add("STAR");
      case "%":
        return this.add("PERCENT");
      case "/":
        if (this.match("/")) {
          // Line comment: consume to end of line.
          while (this.peek() !== "\n" && !this.isAtEnd()) this.advance();
          return;
        }
        return this.add("SLASH");
      case "!":
        return this.add(this.match("=") ? "NEQ" : "BANG");
      case "=":
        return this.add(this.match("=") ? "EQ" : "ASSIGN");
      case "<":
        return this.add(this.match("=") ? "LTE" : "LT");
      case ">":
        return this.add(this.match("=") ? "GTE" : "GT");
      case "&":
        if (this.match("&")) return this.add("AND");
        throw new LexError("Unexpected character '&' (did you mean '&&'?).", this.line);
      case "|":
        if (this.match("|")) return this.add("OR");
        throw new LexError("Unexpected character '|' (did you mean '||'?).", this.line);
      case " ":
      case "\r":
      case "\t":
        return; // ignore whitespace
      case "\n":
        this.line++;
        return;
      case '"':
        return this.string();
      default:
        if (this.isDigit(c)) return this.number();
        if (this.isAlpha(c)) return this.identifier();
        throw new LexError(`Unexpected character '${c}'.`, this.line);
    }
  }

  private string(): void {
    let value = "";
    while (this.peek() !== '"' && !this.isAtEnd()) {
      const c = this.advance();
      if (c === "\n") {
        this.line++;
        value += c;
      } else if (c === "\\") {
        value += this.escape(this.advance());
      } else {
        value += c;
      }
    }
    if (this.isAtEnd()) {
      throw new LexError("Unterminated string.", this.line);
    }
    this.advance(); // closing quote
    this.add("STRING", value);
  }

  private escape(c: string): string {
    switch (c) {
      case "n":
        return "\n";
      case "t":
        return "\t";
      case "r":
        return "\r";
      case '"':
        return '"';
      case "\\":
        return "\\";
      default:
        return c; // unknown escape: keep the character verbatim
    }
  }

  private number(): void {
    while (this.isDigit(this.peek())) this.advance();
    if (this.peek() === "." && this.isDigit(this.peekNext())) {
      this.advance(); // consume the "."
      while (this.isDigit(this.peek())) this.advance();
    }
    this.add("NUMBER", Number(this.source.slice(this.start, this.current)));
  }

  private identifier(): void {
    while (this.isAlphaNumeric(this.peek())) this.advance();
    const text = this.source.slice(this.start, this.current);
    this.add(KEYWORDS[text] ?? "IDENTIFIER");
  }

  // --- character-stream helpers ---------------------------------------------

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private advance(): string {
    return this.source[this.current++];
  }

  private peek(): string {
    return this.isAtEnd() ? "\0" : this.source[this.current];
  }

  private peekNext(): string {
    return this.current + 1 >= this.source.length
      ? "\0"
      : this.source[this.current + 1];
  }

  private match(expected: string): boolean {
    if (this.isAtEnd() || this.source[this.current] !== expected) return false;
    this.current++;
    return true;
  }

  private add(type: TokenType, literal?: number | string): void {
    this.tokens.push({
      type,
      lexeme: this.source.slice(this.start, this.current),
      line: this.line,
      literal,
    });
  }

  private isDigit(c: string): boolean {
    return c >= "0" && c <= "9";
  }

  private isAlpha(c: string): boolean {
    return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }
}

/** Convenience wrapper: tokenize a source string in one call. */
export function tokenize(source: string): Token[] {
  return new Lexer(source).tokenize();
}
