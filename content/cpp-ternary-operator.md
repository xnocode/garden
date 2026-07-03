---
title: C++ Ternary Operator
description: The ternary operator evaluates a condition and returns one of two values.
draft: false
date: 2026-07-03
tags:
  - cpp
prev: "[[cpp-else-if-statement]]"
next: "[[cpp-switch-statement]]"
aliases:
  - ternary
---
The ternary operator is a shorthand form of the `if-else` statement.

syntax

```text
(condition) ? expression1 : expression2;
```

Structure

```text
condition ? true_expression : false_expression
```

apply

```text
bool isAdult = (age >= 18) ? true : false;
```

```cpp
#include <iostream>
using namespace std;

int main() {

    int age;
    cin >> age;

    cout << (age >= 18 ? "Yes" : "No") << endl;

    return 0;
}
```

> [!note]  
> Use the ternary operator for simple conditions. For multiple conditions, prefer `if-else`.

