# Milestones

## v0 — tree-walking interpreter

- [x] lexer
- [x] parser
- [x] arithmetic
- [x] variables
- [x] control flow
- [x] functions + closures
- [x] runs fizzbuzz
- [x] runs fib

## Ideas for later (v1+)

Things v0 deliberately does **not** do yet:

- No `for` loops, `break`, or `continue`.
- No data structures: no arrays, lists, maps, or objects.
- No standard library beyond `print` (no `len`, no string/math helpers, no I/O).
- No anonymous/lambda function expressions (functions are declared with `fn`).
- No `else if` as a real construct (it works, but only as a nested `if`).
- Numbers are float-only; no integers, big numbers, or numeric formatting.
- No module/import system; a program is a single file.
- Dynamic typing with no static checks; errors surface only at runtime.
- No `nil`-safety, error handling (`try`/`catch`), or user-thrown errors.
