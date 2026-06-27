import { describe, expect, it } from "vitest";

import type { Binary, Expr, FunctionDecl, Stmt } from "../src/ast.js";
import { ParseError } from "../src/errors.js";
import { tokenize } from "../src/lexer.js";
import { parse } from "../src/parser.js";

/** Parse a full program into its statement list. */
function parseProgram(source: string): Stmt[] {
  return parse(tokenize(source));
}

/** Parse a single expression by wrapping it in an expression statement. */
function parseExpr(source: string): Expr {
  const stmts = parseProgram(`${source};`);
  expect(stmts).toHaveLength(1);
  expect(stmts[0].type).toBe("ExprStmt");
  return (stmts[0] as { expression: Expr }).expression;
}

describe("parser — precedence", () => {
  it("binds '*' tighter than '+'", () => {
    // 1 + 2 * 3  ->  (1 + (2 * 3))
    const expr = parseExpr("1 + 2 * 3") as Binary;
    expect(expr.type).toBe("Binary");
    expect(expr.operator).toBe("+");
    const right = expr.right as Binary;
    expect(right.operator).toBe("*");
    expect((right.left as { value: number }).value).toBe(2);
    expect((right.right as { value: number }).value).toBe(3);
  });

  it("keeps left operands of '*' grouped under '+'", () => {
    // 1 * 2 + 3  ->  ((1 * 2) + 3)
    const expr = parseExpr("1 * 2 + 3") as Binary;
    expect(expr.operator).toBe("+");
    expect((expr.left as Binary).operator).toBe("*");
    expect((expr.right as { value: number }).value).toBe(3);
  });

  it("treats addition as left-associative", () => {
    // 1 - 2 - 3  ->  ((1 - 2) - 3)
    const expr = parseExpr("1 - 2 - 3") as Binary;
    expect(expr.operator).toBe("-");
    expect((expr.left as Binary).operator).toBe("-");
    expect((expr.right as { value: number }).value).toBe(3);
  });

  it("respects parentheses over precedence", () => {
    // (1 + 2) * 3  ->  ((1 + 2) * 3)
    const expr = parseExpr("(1 + 2) * 3") as Binary;
    expect(expr.operator).toBe("*");
    expect((expr.left as Binary).operator).toBe("+");
  });

  it("orders comparison below arithmetic and equality below comparison", () => {
    // 1 + 2 < 3 == true  ->  ((( 1 + 2 ) < 3 ) == true )
    const expr = parseExpr("1 + 2 < 3 == true") as Binary;
    expect(expr.operator).toBe("==");
    const cmp = expr.left as Binary;
    expect(cmp.operator).toBe("<");
    expect((cmp.left as Binary).operator).toBe("+");
  });

  it("parses unary minus binding tighter than '*'", () => {
    // -1 * 2  ->  ((-1) * 2)
    const expr = parseExpr("-1 * 2") as Binary;
    expect(expr.operator).toBe("*");
    expect((expr.left as { type: string }).type).toBe("Unary");
  });

  it("treats '&&' as tighter than '||'", () => {
    // a || b && c  ->  (a || (b && c))
    const expr = parseExpr("a || b && c") as Binary;
    expect(expr.type).toBe("Logical");
    expect((expr as unknown as { operator: string }).operator).toBe("||");
    const right = expr.right as unknown as { type: string; operator: string };
    expect(right.type).toBe("Logical");
    expect(right.operator).toBe("&&");
  });
});

describe("parser — statements", () => {
  it("parses a let declaration", () => {
    const [stmt] = parseProgram("let x = 1 + 2;");
    expect(stmt.type).toBe("LetStmt");
    expect((stmt as { name: string }).name).toBe("x");
  });

  it("parses assignment as right-associative", () => {
    // a = b = 5  ->  a = (b = 5)
    const expr = parseExpr("a = b = 5");
    expect(expr.type).toBe("Assign");
    expect((expr as { value: Expr }).value.type).toBe("Assign");
  });

  it("rejects an invalid assignment target", () => {
    expect(() => parseProgram("1 = 2;")).toThrow(ParseError);
  });

  it("parses if/else, attaching 'else' to the nearest 'if'", () => {
    const [stmt] = parseProgram("if (x) print 1; else print 2;");
    expect(stmt.type).toBe("IfStmt");
    expect((stmt as { thenBranch: Stmt }).thenBranch.type).toBe("PrintStmt");
    expect((stmt as { elseBranch: Stmt | null }).elseBranch?.type).toBe(
      "PrintStmt",
    );
  });

  it("parses 'else if' chains", () => {
    const [stmt] = parseProgram(
      "if (a) print 1; else if (b) print 2; else print 3;",
    );
    expect(stmt.type).toBe("IfStmt");
    const elseBranch = (stmt as { elseBranch: Stmt | null }).elseBranch;
    expect(elseBranch?.type).toBe("IfStmt");
  });

  it("parses a while loop with a block body", () => {
    const [stmt] = parseProgram("while (i < 10) { i = i + 1; }");
    expect(stmt.type).toBe("WhileStmt");
    expect((stmt as { body: Stmt }).body.type).toBe("Block");
  });

  it("parses a function declaration with parameters", () => {
    const [stmt] = parseProgram("fn add(a, b) { return a + b; }");
    expect(stmt.type).toBe("FunctionDecl");
    const fn = stmt as FunctionDecl;
    expect(fn.name).toBe("add");
    expect(fn.params).toEqual(["a", "b"]);
    expect(fn.body.statements[0].type).toBe("ReturnStmt");
  });

  it("parses chained call expressions", () => {
    // makeAdder(1)(2)  ->  Call(Call(makeAdder, [1]), [2])
    const expr = parseExpr("makeAdder(1)(2)");
    expect(expr.type).toBe("Call");
    expect((expr as { callee: Expr }).callee.type).toBe("Call");
  });

  it("reports a missing semicolon with a ParseError", () => {
    expect(() => parseProgram("let x = 1")).toThrow(ParseError);
  });

  it("reports an unexpected token with a ParseError", () => {
    expect(() => parseProgram("let = 5;")).toThrow(ParseError);
  });
});
