// Abstract syntax tree definitions for mylang.
//
// Every node carries a `line` for error reporting. Expressions evaluate to a
// value; statements perform an action. Both are discriminated unions keyed on
// the `type` field, which the parser produces and the interpreter switches on.

export interface Node {
  line: number;
}

// ---------------------------------------------------------------------------
// Expressions
// ---------------------------------------------------------------------------

export interface NumberLiteral extends Node {
  type: "NumberLiteral";
  value: number;
}

export interface StringLiteral extends Node {
  type: "StringLiteral";
  value: string;
}

export interface BooleanLiteral extends Node {
  type: "BooleanLiteral";
  value: boolean;
}

export interface NilLiteral extends Node {
  type: "NilLiteral";
}

export interface Identifier extends Node {
  type: "Identifier";
  name: string;
}

export interface Assign extends Node {
  type: "Assign";
  name: string;
  value: Expr;
}

export type UnaryOperator = "-" | "!";

export interface Unary extends Node {
  type: "Unary";
  operator: UnaryOperator;
  right: Expr;
}

export type BinaryOperator =
  | "+"
  | "-"
  | "*"
  | "/"
  | "%"
  | "=="
  | "!="
  | "<"
  | ">"
  | "<="
  | ">=";

export interface Binary extends Node {
  type: "Binary";
  operator: BinaryOperator;
  left: Expr;
  right: Expr;
}

export type LogicalOperator = "&&" | "||";

export interface Logical extends Node {
  type: "Logical";
  operator: LogicalOperator;
  left: Expr;
  right: Expr;
}

export interface Call extends Node {
  type: "Call";
  callee: Expr;
  args: Expr[];
}

export type Expr =
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | NilLiteral
  | Identifier
  | Assign
  | Unary
  | Binary
  | Logical
  | Call;

// ---------------------------------------------------------------------------
// Statements
// ---------------------------------------------------------------------------

export interface LetStmt extends Node {
  type: "LetStmt";
  name: string;
  initializer: Expr;
}

export interface ExprStmt extends Node {
  type: "ExprStmt";
  expression: Expr;
}

export interface PrintStmt extends Node {
  type: "PrintStmt";
  expression: Expr;
}

export interface Block extends Node {
  type: "Block";
  statements: Stmt[];
}

export interface IfStmt extends Node {
  type: "IfStmt";
  condition: Expr;
  thenBranch: Stmt;
  elseBranch: Stmt | null;
}

export interface WhileStmt extends Node {
  type: "WhileStmt";
  condition: Expr;
  body: Stmt;
}

export interface FunctionDecl extends Node {
  type: "FunctionDecl";
  name: string;
  params: string[];
  body: Block;
}

export interface ReturnStmt extends Node {
  type: "ReturnStmt";
  value: Expr | null;
}

export type Stmt =
  | LetStmt
  | ExprStmt
  | PrintStmt
  | Block
  | IfStmt
  | WhileStmt
  | FunctionDecl
  | ReturnStmt;
