// Error types shared across the pipeline. Each carries the source line so the
// CLI can report `<Phase> [line N]: <message>` consistently.

export class MyLangError extends Error {
  constructor(
    message: string,
    readonly line: number,
  ) {
    super(message);
    this.name = "MyLangError";
  }
}

/** Raised by the lexer for invalid characters or unterminated strings. */
export class LexError extends MyLangError {
  constructor(message: string, line: number) {
    super(message, line);
    this.name = "LexError";
  }
}

/** Raised by the parser when the token stream violates the grammar. */
export class ParseError extends MyLangError {
  constructor(message: string, line: number) {
    super(message, line);
    this.name = "ParseError";
  }
}

/** Raised by the interpreter for type errors, undefined names, etc. */
export class RuntimeError extends MyLangError {
  constructor(message: string, line: number) {
    super(message, line);
    this.name = "RuntimeError";
  }
}
