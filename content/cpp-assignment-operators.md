---
draft: false
tags:
  - cpp
date: 2026-07-01
title: C++ Assignment Operator
description: The assignment operator assigns a value to a variable.
prev: "[[cpp-unary-operators]]"
next: "[[cpp-relational-operators]]"
aliases:
  - assignment
---
The **assignment operator (=)** assigns the value of the expression on the **right-hand side (RHS)** to the variable on the **left-hand side (LHS)**.

```cpp
#include <iostream>
using namespace std;
int main() {
    int a = 5;
    int b = 10;
    a = b;
    cout << a << endl;
    return 0;
}
```

> [!summary] Summary
> The value stored in `b` is copied to `a`. 
> ```text
> a = b
> │   │
> │   └── RHS (value: 10)
> └────── LHS (variable: a)
> ```
> The assignment operator assigns a value to a variable.

