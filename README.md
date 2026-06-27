# mylang

A tiny programming language with a **tree-walking interpreter**, written in
TypeScript. It follows the classic pipeline:

```
source text  ->  lexer  ->  parser  ->  AST  ->  evaluator
```

This is the v0 milestone: enough of a language to run real programs like
FizzBuzz and a recursive Fibonacci.

## Quick start

```bash
npm install

# Run a program from a file
npx tsx src/index.ts examples/fizzbuzz.mylang
npm run fizzbuzz        # same thing
npm run fib
npm run closures

# Start the REPL (Ctrl+D to exit)
npm run repl

# Tests
npm test
```

### REPL

```
$ npm run repl
mylang v0 REPL — type an expression or statement, Ctrl+D to exit.
mylang> 1 + 2 * 3
7
mylang> let name = "world";
mylang> print "hello, " + name;
hello, world
```

The REPL keeps state between lines and prints the value of a trailing bare
expression, so a trailing `;` is optional when you type interactively.

## Language tour

```
// Line comments start with //

let x = 10;              // numbers (all floating point)
let name = "mylang";     // strings, with \n \t \r \" \\ escapes
let ok = true;           // booleans: true / false
let nothing = nil;       // the absent value

// Arithmetic with correct precedence and grouping
print 1 + 2 * 3;         // 7
print (1 + 2) * 3;       // 9
print 17 % 5;            // 2
print -x;                // -10

// Comparisons and logic (&& and || short-circuit)
print x >= 10 && name != "";   // true
print x < 5 || x > 8;          // true

// Strings concatenate with +
print "a" + "b";        // ab

// Control flow
if (x % 2 == 0) {
  print "even";
} else {
  print "odd";
}

let i = 0;
while (i < 3) {
  print i;
  i = i + 1;
}

// Functions are first-class values and close over their defining scope
fn makeAdder(n) {
  fn add(x) {
    return x + n;     // captures n
  }
  return add;
}
let add5 = makeAdder(5);
print add5(10);         // 15
```

### Semantics notes

- **Numbers** are IEEE-754 doubles (like JavaScript). `/` is float division.
- **Truthiness:** only `nil` and `false` are falsy. Everything else —
  including `0` and `""` — is truthy.
- **Equality** (`==` / `!=`) compares values for primitives and identity for
  functions. There is no implicit type coercion.
- `+` adds two numbers or concatenates two strings; mixing types is an error.
- `&&` / `||` short-circuit and return one of their operands (not a coerced
  boolean), so `0 || "x"` is `"x"`.
- Variables must be declared with `let` before use; assignment to an undeclared
  name is a runtime error.
- A function with no `return` yields `nil`.
- Errors are reported as `<Phase> [line N]: <message>` for the lexer, parser,
  and interpreter.

## Grammar (EBNF)

Notation: `{ x }` means zero or more, `[ x ]` means optional, `|` is
alternation, quoted text is literal. Lexical tokens are in `UPPERCASE`.

```ebnf
program     = { declaration } ;

declaration = funcDecl
            | letDecl
            | statement ;

funcDecl    = "fn" IDENTIFIER "(" [ parameters ] ")" block ;
parameters  = IDENTIFIER { "," IDENTIFIER } ;
letDecl     = "let" IDENTIFIER "=" expression ";" ;

statement   = ifStmt
            | whileStmt
            | printStmt
            | returnStmt
            | block
            | exprStmt ;

ifStmt      = "if" "(" expression ")" statement [ "else" statement ] ;
whileStmt   = "while" "(" expression ")" statement ;
printStmt   = "print" expression ";" ;
returnStmt  = "return" [ expression ] ";" ;
block       = "{" { declaration } "}" ;
exprStmt    = expression ";" ;

(* Expressions, lowest to highest precedence. *)
expression  = assignment ;
assignment  = IDENTIFIER "=" assignment
            | logicOr ;
logicOr     = logicAnd { "||" logicAnd } ;
logicAnd    = equality { "&&" equality } ;
equality    = comparison { ( "==" | "!=" ) comparison } ;
comparison  = term { ( "<" | ">" | "<=" | ">=" ) term } ;
term        = factor { ( "+" | "-" ) factor } ;
factor      = unary { ( "*" | "/" | "%" ) unary } ;
unary       = ( "!" | "-" ) unary
            | call ;
call        = primary { "(" [ arguments ] ")" } ;
arguments   = expression { "," expression } ;
primary     = NUMBER | STRING | "true" | "false" | "nil"
            | IDENTIFIER
            | "(" expression ")" ;

(* Lexical grammar. *)
NUMBER      = DIGIT { DIGIT } [ "." DIGIT { DIGIT } ] ;
STRING      = '"' { CHARACTER | ESCAPE } '"' ;
IDENTIFIER  = ALPHA { ALPHA | DIGIT } ;
ESCAPE      = "\" ( "n" | "t" | "r" | '"' | "\" ) ;
ALPHA       = "a"..."z" | "A"..."Z" | "_" ;
DIGIT       = "0"..."9" ;
COMMENT     = "//" { any character except newline } ;
```

## Project layout

| Path                  | Responsibility                                        |
| --------------------- | ----------------------------------------------------- |
| `src/lexer.ts`        | Source text → tokens                                  |
| `src/ast.ts`          | AST node type definitions                             |
| `src/parser.ts`       | Tokens → AST (recursive descent)                      |
| `src/interpreter.ts`  | Walks the AST and evaluates it; scopes and closures   |
| `src/errors.ts`       | Shared `LexError` / `ParseError` / `RuntimeError`     |
| `src/index.ts`        | CLI: REPL and run-from-file                           |
| `examples/`           | Sample `.mylang` programs                             |
| `test/`               | Vitest tests for the lexer and parser                 |

See [MILESTONES.md](./MILESTONES.md) for progress and what's next.

## License

[MIT](./LICENSE)
