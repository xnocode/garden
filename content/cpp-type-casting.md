---
draft: false
tags:
  - cpp
date: 2026-06-30
title: C++ Type Casting
description: Type casting is the process of converting one data type into another.
prev: "[[cpp-constant]]"
next: "[[cpp-operators]]"
aliases:
  - type casting
---
Type casting means converting data from one data type to another.

```text
Type Casting
├── Implicit Conversion
└── Explicit Conversion
```

Implicit Conversion -> Conversion performed automatically by the compiler.

```text
Implicit Type Conversion
bool → char → int → float → double
```

```cpp
#include <iostream>
using namespace std;
int main() {
    cout << (10 / 3) << endl;
    cout << (10 / 3.0) << endl;
    return 0;
}
```

> [!note] Note
> In mixed-type expressions, smaller data types are automatically promoted to larger data types.

Explicit Conversion --> Conversion forced by the programmer.

syntax

```text
(data_type) expression
```

```cpp
#include <iostream>
using namespace std;
int main() {
    cout << (int)('A') << endl;
    return 0;
}
```