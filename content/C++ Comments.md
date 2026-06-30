---
draft: false
tags:
  - cpp
date: 2026-06-26
author: xnocode
---
Comments are used to make code more readable and understandable. The compiler ignores comments during program execution.

```text
Types of Comments
├── Single-line Comment
└── Multi-line Comment
```

A single-line comment starts with `//`. Everything after `//` on the same line is treated as a comment.

example

```cpp
// This is a single-line comment
```

A multi-line comment starts with `/*` and ends with `*/`. It can span multiple lines.

example

```cpp
/*
This is a
multi-line comment
*/
```

Complete Example

```cpp
#include <iostream>
int main() {
    // Single-line comment
    /*
       Multi-line comment
    */
    return 0;
}
```

> [!note]  
> Comments are used to explain code, improve readability, and make programs easier to maintain.