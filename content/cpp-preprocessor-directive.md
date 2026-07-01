---
draft: false
tags:
  - cpp
date: 2026-06-25
author: xnocode
---
A preprocessor directive is a statement that is processed before the actual compilation starts.

```text
Preprocessor Directive
├── starts with #
├── processed before compilation
└── used to include files or define macros
```

example

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
