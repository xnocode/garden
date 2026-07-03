---
draft: false
tags:
  - cpp
date: 2026-06-28
title: C++ Data Types
description: A data type defines the type of data a variable can store.
prev: "[[cpp-naming-convention]]"
next: "[[cpp-size-of-data-types]]"
aliases:
  - data types
---
A data type specifies the type of data a variable can store.

```text
Data Types
├── Primitive
│   ├── Integer
│   ├── Character
│   ├── Boolean
│   ├── Float
│   └── Double
└── Non-Primitive
    ├── String
    ├── Array
    └── etc.
```

The `int` data type is used to store whole numbers.

```cpp
#include <iostream>
using namespace std;
int main() {
    int x = 2;
    cout << x << endl;
    return 0;
}
```

```text
Integer Type
├── stores whole numbers
├── size = 4 bytes
└── size = 32 bits
```

```cpp
#include <iostream>
using namespace std;
int main() {
    int age = 24;
    int marks = 200;
    char grade = 'A';
    float y = 324.23f;
    bool isAdult = true;
    double z = 3.234;
    cout << age << endl;
    cout << marks << endl;
    cout << grade << endl;
    cout << y << endl;
    cout << isAdult << endl;
    cout << z << endl;
    return 0;
}
```

```text
Data Type Examples
├── int    → whole numbers
├── char   → single character
├── float  → decimal numbers (7 digits precision)
├── double → decimal numbers (15 digits precision)
└── bool   → true or false
```

> [!note] Note
> `bool` prints `1` for `true` and `0` for `false`.


