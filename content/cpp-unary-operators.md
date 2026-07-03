---
title: cpp-unary-operators
description: Unary operators perform operations such as increment, decrement, and negation on a single operand.
draft: false
date: 2026-07-03
tags:
  - cpp
prev: cpp-arithmetic-operators
next: cpp-assignment-operator
aliases:
  - unary
---
Unary operators perform an operation on **one operand**.

```text
Unary Operators
├── ++ → Increment
└── -- → Decrement
```

Increment Operator (++)

Increases the value of a variable by **1**.

```text
a++  → Post Increment
       (Use first, then increase)

++a  → Pre Increment
       (Increase first, then use)
```

Decrement Operator (--)

Decreases the value of a variable by **1**.

```text
a--  → Post Decrement
       (Use first, then decrease)

--a  → Pre Decrement
       (Decrease first, then use)
```

```cpp
#include <iostream>
using namespace std;
int main() {
    int x = 3;
    x++;
    cout << x << endl;
    x--;
    cout << x << endl;
    return 0;
}
```

> [!note]  
> `x++` and `++x` both increase the value by **1**. The difference is **when** the value is updated during an expression.