---
draft: false
tags:
  - cpp
date: 2026-06-28
title: C++ Garbage Value
description: A garbage value is an unpredictable value stored in an uninitialized variable.
prev: cpp-assignment-operator
next: cpp-naming-convention
aliases:
  - garbage value
---
If a local variable is declared but not initialized, it contains a garbage value.

```cpp
#include <iostream>
using namespace std;
int main() {
    int a;
    cout << "a = " << a << endl;
    return 0;
}
```

```text
a = unpredictable value
```

> [!note] Note 
> Always initialize variables before using them to avoid garbage values
