---
draft: false
tags:
  - cpp
date: 2026-06-25
title: C++ Preprocessor Directive
description: Learn what preprocessor directives are, how they work, and why they are used in C++.
prev: cpp-boilerplate-code
next: cpp-macros
aliases: preprocessor directive
---
A preprocessor directive is a statement that is processed before the actual compilation starts.

```text
Preprocessor Directive
├── starts with #
├── processed before compilation
└── used to include files or define macros
```

```cpp
#include <iostream>   // preprocessor directive
using namespace std;
int main() {

    return 0;
}
```

- `#include <iostream>`
    - Includes the `iostream` header file.
    - Provides pre-written code for input and output operations.
    - Allows us to use `cout`, `cin`, `endl`, etc.

Common header files:

```text
iostream → input/output
vector    → dynamic arrays
string    → string operations
cmath     → mathematical functions
```
