// A recursive-descent parser. Each grammar rule is one method, and the methods
// call each other from lowest to highest precedence, which is how operator
// precedence is encoded. The parser consumes the token list from the lexer and
// produces a list of statements (the AST).

import type {
  Assign,
  Binary,
  BinaryOperator,
  Block,
  Call,
  Expr,
  ExprStmt,
  FunctionDecl,
  IfStmt,
  LetStmt,
  Logical,
  PrintStmt,
  ReturnStmt,
  Stmt,
  Unary,
  WhileStmt,
} from "./ast";
import { ParseError } from "./errors";
import type { Token, TokenType } from "./lexer";

export class Parser {
  private current = 0;

  constructor(private readonly tokens: Token[]) {}

  /** program = { declaration } */
  parse(): Stmt[] {
    const statements: Stmt[] = [];
    while (!this.isAtEnd()) {
      statements.push(this.declaration());
    }
    return statements;
  }

  // --- declarations / statements --------------------------------------------

  /** declaration = funcDecl | letDecl | statement */
  private declaration(): Stmt {
    if (this.match("FN")) return this.functionDecl();
    if (this.match("LET")) return this.letDecl();
    return this.statement();
  }

  /** funcDecl = "fn" IDENTIFIER "(" [ params ] ")" block */
  private functionDecl(): FunctionDecl {
    const line = this.previous().line;
    const name = this.consume("IDENTIFIER", "Expected function name.").lexeme;
    this.consume("LPAREN", "Expected '(' after function name.");
    const params: string[] = [];
    if (!this.check("RPAREN")) {
      do {
        params.push(
          this.consume("IDENTIFIER", "Expected parameter name.").lexeme,
        );
      } while (this.match("COMMA"));
    }
    this.consume("RPAREN", "Expected ')' after parameters.");
    this.consume("LBRACE", "Expected '{' before function body.");
    return { type: "FunctionDecl", name, params, body: this.block(), line };
  }

  /** letDecl = "let" IDENTIFIER "=" expression ";" */
  private letDecl(): LetStmt {
    const line = this.previous().line;
    const name = this.consume("IDENTIFIER", "Expected variable name.").lexeme;
    this.consume("ASSIGN", "Expected '=' after variable name.");
    const initializer = this.expression();
    this.consume("SEMICOLON", "Expected ';' after variable declaration.");
    return { type: "LetStmt", name, initializer, line };
  }

  /** statement = ifStmt | whileStmt | printStmt | returnStmt | block | exprStmt */
  private statement(): Stmt {
    if (this.match("IF")) return this.ifStmt();
    if (this.match("WHILE")) return this.whileStmt();
    if (this.match("PRINT")) return this.printStmt();
    if (this.match("RETURN")) return this.returnStmt();
    if (this.match("LBRACE")) return this.block();
    return this.exprStmt();
  }

  /** ifStmt = "if" "(" expression ")" statement [ "else" statement ] */
  private ifStmt(): IfStmt {
    const line = this.previous().line;
    this.consume("LPAREN", "Expected '(' after 'if'.");
    const condition = this.expression();
    this.consume("RPAREN", "Expected ')' after if condition.");
    const thenBranch = this.statement();
    const elseBranch = this.match("ELSE") ? this.statement() : null;
    return { type: "IfStmt", condition, thenBranch, elseBranch, line };
  }

  /** whileStmt = "while" "(" expression ")" statement */
  private whileStmt(): WhileStmt {
    const line = this.previous().line;
    this.consume("LPAREN", "Expected '(' after 'while'.");
    const condition = this.expression();
    this.consume("RPAREN", "Expected ')' after while condition.");
    return { type: "WhileStmt", condition, body: this.statement(), line };
  }

  /** printStmt = "print" expression ";" */
  private printStmt(): PrintStmt {
    const line = this.previous().line;
    const expression = this.expression();
    this.consume("SEMICOLON", "Expected ';' after print value.");
    return { type: "PrintStmt", expression, line };
  }

  /** returnStmt = "return" [ expression ] ";" */
  private returnStmt(): ReturnStmt {
    const line = this.previous().line;
    const value = this.check("SEMICOLON") ? null : this.expression();
    this.consume("SEMICOLON", "Expected ';' after return value.");
    return { type: "ReturnStmt", value, line };
  }

  /** block = "{" { declaration } "}" */
  private block(): Block {
    const line = this.previous().line;
    const statements: Stmt[] = [];
    while (!this.check("RBRACE") && !this.isAtEnd()) {
      statements.push(this.declaration());
    }
    this.consume("RBRACE", "Expected '}' after block.");
    return { type: "Block", statements, line };
  }

  /** exprStmt = expression ";" */
  private exprStmt(): ExprStmt {
    const line = this.peek().line;
    const expression = this.expression();
    this.consume("SEMICOLON", "Expected ';' after expression.");
    return { type: "ExprStmt", expression, line };
  }

  // --- expressions (lowest to highest precedence) ---------------------------

  /** expression = assignment */
  private expression(): Expr {
    return this.assignment();
  }

  /** assignment = IDENTIFIER "=" assignment | logicOr */
  private assignment(): Expr {
    const expr = this.or();
    if (this.match("ASSIGN")) {
      const equals = this.previous();
      const value = this.assignment(); // right-associative
      if (expr.type === "Identifier") {
        const node: Assign = {
          type: "Assign",
          name: expr.name,
          value,
          line: expr.line,
        };
        return node;
      }
      throw new ParseError("Invalid assignment target.", equals.line);
    }
    return expr;
  }

  /** logicOr = logicAnd { "||" logicAnd } */
  private or(): Expr {
    let expr = this.and();
    while (this.match("OR")) {
      const line = this.previous().line;
      const right = this.and();
      const node: Logical = {
        type: "Logical",
        operator: "||",
        left: expr,
        right,
        line,
      };
      expr = node;
    }
    return expr;
  }

  /** logicAnd = equality { "&&" equality } */
  private and(): Expr {
    let expr = this.equality();
    while (this.match("AND")) {
      const line = this.previous().line;
      const right = this.equality();
      const node: Logical = {
        type: "Logical",
        operator: "&&",
        left: expr,
        right,
        line,
      };
      expr = node;
    }
    return expr;
  }

  /** equality = comparison { ( "==" | "!=" ) comparison } */
  private equality(): Expr {
    let expr = this.comparison();
    while (this.match("EQ", "NEQ")) {
      const op = this.previous();
      const operator: BinaryOperator = op.type === "EQ" ? "==" : "!=";
      expr = this.makeBinary(operator, expr, this.comparison(), op.line);
    }
    return expr;
  }

  /** comparison = term { ( "<" | ">" | "<=" | ">=" ) term } */
  private comparison(): Expr {
    let expr = this.term();
    while (this.match("LT", "GT", "LTE", "GTE")) {
      const op = this.previous();
      let operator: BinaryOperator;
      switch (op.type) {
        case "LT":
          operator = "<";
          break;
        case "GT":
          operator = ">";
          break;
        case "LTE":
          operator = "<=";
          break;
        default:
          operator = ">=";
          break;
      }
      expr = this.makeBinary(operator, expr, this.term(), op.line);
    }
    return expr;
  }

  /** term = factor { ( "+" | "-" ) factor } */
  private term(): Expr {
    let expr = this.factor();
    while (this.match("PLUS", "MINUS")) {
      const op = this.previous();
      const operator: BinaryOperator = op.type === "PLUS" ? "+" : "-";
      expr = this.makeBinary(operator, expr, this.factor(), op.line);
    }
    return expr;
  }

  /** factor = unary { ( "*" | "/" | "%" ) unary } */
  private factor(): Expr {
    let expr = this.unary();
    while (this.match("STAR", "SLASH", "PERCENT")) {
      const op = this.previous();
      const operator: BinaryOperator =
        op.type === "STAR" ? "*" : op.type === "SLASH" ? "/" : "%";
      expr = this.makeBinary(operator, expr, this.unary(), op.line);
    }
    return expr;
  }

  /** unary = ( "!" | "-" ) unary | call */
  private unary(): Expr {
    if (this.match("BANG", "MINUS")) {
      const op = this.previous();
      const node: Unary = {
        type: "Unary",
        operator: op.type === "BANG" ? "!" : "-",
        right: this.unary(),
        line: op.line,
      };
      return node;
    }
    return this.call();
  }

  /** call = primary { "(" [ arguments ] ")" } */
  private call(): Expr {
    let expr = this.primary();
    while (this.match("LPAREN")) {
      expr = this.finishCall(expr);
    }
    return expr;
  }

  private finishCall(callee: Expr): Call {
    const line = this.previous().line;
    const args: Expr[] = [];
    if (!this.check("RPAREN")) {
      do {
        args.push(this.expression());
      } while (this.match("COMMA"));
    }
    this.consume("RPAREN", "Expected ')' after arguments.");
    return { type: "Call", callee, args, line };
  }

  /**
   * primary = NUMBER | STRING | "true" | "false" | "nil"
   *         | IDENTIFIER | "(" expression ")"
   */
  private primary(): Expr {
    const token = this.peek();
    if (this.match("NUMBER")) {
      return {
        type: "NumberLiteral",
        value: this.previous().literal as number,
        line: token.line,
      };
    }
    if (this.match("STRING")) {
      return {
        type: "StringLiteral",
        value: this.previous().literal as string,
        line: token.line,
      };
    }
    if (this.match("TRUE")) {
      return { type: "BooleanLiteral", value: true, line: token.line };
    }
    if (this.match("FALSE")) {
      return { type: "BooleanLiteral", value: false, line: token.line };
    }
    if (this.match("NIL")) {
      return { type: "NilLiteral", line: token.line };
    }
    if (this.match("IDENTIFIER")) {
      return {
        type: "Identifier",
        name: this.previous().lexeme,
        line: token.line,
      };
    }
    if (this.match("LPAREN")) {
      const expr = this.expression();
      this.consume("RPAREN", "Expected ')' after expression.");
      return expr;
    }
    throw new ParseError(
      `Unexpected token '${token.lexeme || token.type}'.`,
      token.line,
    );
  }

  private makeBinary(
    operator: BinaryOperator,
    left: Expr,
    right: Expr,
    line: number,
  ): Binary {
    return { type: "Binary", operator, left, right, line };
  }

  // --- token-stream helpers -------------------------------------------------

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === "EOF";
  }

  private check(type: TokenType): boolean {
    return !this.isAtEnd() && this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new ParseError(message, this.peek().line);
  }
}

/** Convenience wrapper: parse a token list into a list of statements. */
export function parse(tokens: Token[]): Stmt[] {
  return new Parser(tokens).parse();
}
