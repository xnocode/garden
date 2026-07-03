---
title: Arithmetic Operators
description: Arithmetic operators perform mathematical operations on numeric operands.
draft: false
date: 2026-07-03
tags:
  - cpp
prev: cpp-operators
next: cpp-unary-operators
aliases:
  - arithmetic
---
Arithmetic operators are used to perform mathematical calculations.

```text
Arithmetic Operators
├── +  → Addition
├── -  → Subtraction
├── *  → Multiplication
├── /  → Division
└── %  → Modulus (Remainder)
```

```cpp
#include <iostream>
using namespace std;
int main() {
    int a, b;
    cin >> a >> b;
    cout << "Addition       : " << a + b << endl;
    cout << "Subtraction    : " << a - b << endl;
    cout << "Multiplication : " << a * b << endl;
    cout << "Division       : " << a / b << endl;
    cout << "Modulus        : " << a % b << endl;
    return 0;
}
```

> [!note] Note
> The `%` (modulus) operator returns the **remainder** after division and works only with integer data types.