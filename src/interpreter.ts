// The evaluator: a tree-walking interpreter. It recursively walks the AST,
// executing statements for their effects and evaluating expressions to values.
// Scopes are modelled with a chain of Environments; functions capture the
// environment in which they were defined, which is what makes closures work.

import type {
  Binary,
  Call,
  Expr,
  FunctionDecl,
  Logical,
  Stmt,
  Unary,
} from "./ast";
import { RuntimeError } from "./errors";

/** Every runtime value the interpreter can produce. */
export type Value = number | string | boolean | null | MyLangFunction;

/** Control-flow signal thrown to unwind out of a function body on `return`. */
class ReturnSignal {
  constructor(readonly value: Value) {}
}

/** A lexical scope: a set of bindings plus a link to the enclosing scope. */
export class Environment {
  private readonly values = new Map<string, Value>();

  constructor(readonly parent: Environment | null = null) {}

  define(name: string, value: Value): void {
    this.values.set(name, value);
  }

  get(name: string, line: number): Value {
    const scope = this.resolve(name);
    if (scope) return scope.values.get(name)!;
    throw new RuntimeError(`Undefined variable '${name}'.`, line);
  }

  assign(name: string, value: Value, line: number): void {
    const scope = this.resolve(name);
    if (!scope) throw new RuntimeError(`Undefined variable '${name}'.`, line);
    scope.values.set(name, value);
  }

  /** Walk the scope chain to find which environment owns `name`. */
  private resolve(name: string): Environment | null {
    let scope: Environment | null = this;
    while (scope) {
      if (scope.values.has(name)) return scope;
      scope = scope.parent;
    }
    return null;
  }
}

/** A user-defined function, bundled with the scope it closed over. */
export class MyLangFunction {
  constructor(
    readonly declaration: FunctionDecl,
    readonly closure: Environment,
  ) {}

  get arity(): number {
    return this.declaration.params.length;
  }

  call(interpreter: Interpreter, args: Value[], line: number): Value {
    if (args.length !== this.arity) {
      throw new RuntimeError(
        `Function '${this.declaration.name}' expected ${this.arity} argument(s) but got ${args.length}.`,
        line,
      );
    }
    // A fresh scope per call, parented on the closure (not the call site).
    const scope = new Environment(this.closure);
    this.declaration.params.forEach((param, i) => scope.define(param, args[i]));
    try {
      interpreter.executeBlock(this.declaration.body.statements, scope);
    } catch (signal) {
      if (signal instanceof ReturnSignal) return signal.value;
      throw signal;
    }
    return null;
  }

  toString(): string {
    return `<fn ${this.declaration.name}>`;
  }
}

export class Interpreter {
  readonly globals = new Environment();
  private environment = this.globals;

  constructor(private readonly output: (line: string) => void = console.log) {}

  /**
   * Run a program. When `echoLast` is set (used by the REPL), the value of a
   * trailing bare expression statement is printed automatically.
   */
  interpret(statements: Stmt[], echoLast = false): void {
    statements.forEach((stmt, i) => {
      const isLast = i === statements.length - 1;
      if (echoLast && isLast && stmt.type === "ExprStmt") {
        const value = this.evaluate(stmt.expression);
        if (value !== null) this.output(stringify(value));
      } else {
        this.execute(stmt);
      }
    });
  }

  execute(stmt: Stmt): void {
    switch (stmt.type) {
      case "LetStmt":
        this.environment.define(stmt.name, this.evaluate(stmt.initializer));
        return;
      case "FunctionDecl":
        this.environment.define(
          stmt.name,
          new MyLangFunction(stmt, this.environment),
        );
        return;
      case "ExprStmt":
        this.evaluate(stmt.expression);
        return;
      case "PrintStmt":
        this.output(stringify(this.evaluate(stmt.expression)));
        return;
      case "Block":
        this.executeBlock(stmt.statements, new Environment(this.environment));
        return;
      case "IfStmt":
        if (isTruthy(this.evaluate(stmt.condition))) {
          this.execute(stmt.thenBranch);
        } else if (stmt.elseBranch) {
          this.execute(stmt.elseBranch);
        }
        return;
      case "WhileStmt":
        while (isTruthy(this.evaluate(stmt.condition))) {
          this.execute(stmt.body);
        }
        return;
      case "ReturnStmt":
        throw new ReturnSignal(stmt.value ? this.evaluate(stmt.value) : null);
    }
  }

  /** Execute statements in a given scope, restoring the previous one after. */
  executeBlock(statements: Stmt[], scope: Environment): void {
    const previous = this.environment;
    this.environment = scope;
    try {
      for (const stmt of statements) this.execute(stmt);
    } finally {
      this.environment = previous;
    }
  }

  evaluate(expr: Expr): Value {
    switch (expr.type) {
      case "NumberLiteral":
      case "StringLiteral":
      case "BooleanLiteral":
        return expr.value;
      case "NilLiteral":
        return null;
      case "Identifier":
        return this.environment.get(expr.name, expr.line);
      case "Assign": {
        const value = this.evaluate(expr.value);
        this.environment.assign(expr.name, value, expr.line);
        return value;
      }
      case "Unary":
        return this.evalUnary(expr);
      case "Logical":
        return this.evalLogical(expr);
      case "Binary":
        return this.evalBinary(expr);
      case "Call":
        return this.evalCall(expr);
    }
  }

  private evalUnary(expr: Unary): Value {
    const right = this.evaluate(expr.right);
    if (expr.operator === "!") return !isTruthy(right);
    if (typeof right !== "number") {
      throw new RuntimeError("Operand of '-' must be a number.", expr.line);
    }
    return -right;
  }

  private evalLogical(expr: Logical): Value {
    const left = this.evaluate(expr.left);
    // Short-circuit, returning the operand value (not a coerced boolean).
    if (expr.operator === "||") {
      if (isTruthy(left)) return left;
    } else if (!isTruthy(left)) {
      return left;
    }
    return this.evaluate(expr.right);
  }

  private evalBinary(expr: Binary): Value {
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);
    switch (expr.operator) {
      case "+":
        if (typeof left === "number" && typeof right === "number") {
          return left + right;
        }
        if (typeof left === "string" && typeof right === "string") {
          return left + right;
        }
        throw new RuntimeError(
          "Operands of '+' must be two numbers or two strings.",
          expr.line,
        );
      case "-":
        return this.numeric(expr, left, right, (a, b) => a - b);
      case "*":
        return this.numeric(expr, left, right, (a, b) => a * b);
      case "/":
        return this.numeric(expr, left, right, (a, b) => a / b);
      case "%":
        return this.numeric(expr, left, right, (a, b) => a % b);
      case "<":
        return this.numeric(expr, left, right, (a, b) => a < b);
      case ">":
        return this.numeric(expr, left, right, (a, b) => a > b);
      case "<=":
        return this.numeric(expr, left, right, (a, b) => a <= b);
      case ">=":
        return this.numeric(expr, left, right, (a, b) => a >= b);
      case "==":
        return isEqual(left, right);
      case "!=":
        return !isEqual(left, right);
    }
  }

  private evalCall(expr: Call): Value {
    const callee = this.evaluate(expr.callee);
    const args = expr.args.map((arg) => this.evaluate(arg));
    if (!(callee instanceof MyLangFunction)) {
      throw new RuntimeError("Can only call functions.", expr.line);
    }
    return callee.call(this, args, expr.line);
  }

  /** Run a numeric binary op after checking both operands are numbers. */
  private numeric<T>(
    expr: Binary,
    left: Value,
    right: Value,
    fn: (a: number, b: number) => T,
  ): T {
    if (typeof left !== "number" || typeof right !== "number") {
      throw new RuntimeError(
        `Operands of '${expr.operator}' must be numbers.`,
        expr.line,
      );
    }
    return fn(left, right);
  }
}

/** Only `nil` and `false` are falsy; everything else (including 0) is truthy. */
export function isTruthy(value: Value): boolean {
  if (value === null) return false;
  if (typeof value === "boolean") return value;
  return true;
}

/** Equality is by value for primitives and by identity for functions. */
export function isEqual(a: Value, b: Value): boolean {
  return a === b;
}

/** Render a value the way `print` and the REPL display it. */
export function stringify(value: Value): string {
  if (value === null) return "nil";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof MyLangFunction) return value.toString();
  return String(value);
}
