---
title: C++ if Statement
description: The if statement executes a block of code only if a condition is true.
draft: false
date: 2026-07-03
tags:
  - cpp
prev: "[[cpp-conditional-statements]]"
next: "[[cpp-if-else-statement]]"
aliases:
  - if
---
The `if` statement executes a block of code **only when the condition is true**.

syntax

```text
if (condition) {
    // code
}
```

```text
if Statement
├── Condition is true  → Execute block
└── Condition is false → Skip block
```

```cpp
#include <iostream>
using namespace std;
int main() {
    int age;
    cin >> age;
    if (age >= 18) {
        cout << "Can Vote" << endl;
    }
    return 0;
}
```

> [!note]  
> The `if` statement does not have an `else` block. If the condition is false, the statements inside the `if` block are simply skipped.