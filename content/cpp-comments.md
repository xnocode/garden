---
draft: false
tags:
  - cpp
date: 2026-06-30
title: C++ Comments
description: Comments are non-executable text used to explain or document C++ code.
prev: cpp-precision
next: cpp-input
aliases:
  - comments
---
Comments are used to make code more readable and understandable. The compiler ignores comments during program execution.

```text
Types of Comments
├── Single-line Comment
└── Multi-line Comment
```

A single-line comment starts with `//`. Everything after `//` on the same line is treated as a comment.

```cpp
#include<iostream>
using namespace std;
int main(){
	// This is a single-line comment
}
```

A multi-line comment starts with `/*` and ends with `*/`. It can span multiple lines.

```cpp
#include<iostream>
using namespace std;
int main(){
/*
This is a
multi-line comment
*/
}
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

> [!note] Note
> Comments are used to explain code, improve readability, and make programs easier to maintain.

