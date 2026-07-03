---
title: C++ Relational Operators
description: " Relational operators are used to compare two values."
draft: false
date: 2026-07-01
tags:
  - cpp
prev: "[[cpp-assignment-operator]]"
next: "[[cpp-logical-operators]]"
aliases:
  - relational
---
Relational operators are used to compare two values. The result of a comparison is either **true (`1`)** or **false (`0`)**.

```text
Relational Operators
├── ==  → Equal to
├── !=  → Not equal to
├── >   → Greater than
├── >=  → Greater than or equal to
├── <   → Less than
└── <=  → Less than or equal to
```

```cpp
#include <iostream>
using namespace std;
int main() {
    int a, b;
    cin >> a >> b;
    cout << (a == b) << endl;
    cout << (a != b) << endl;
    cout << (a < b) << endl;
    cout << (a <= b) << endl;
    cout << (a > b) << endl;
    cout << (a >= b) << endl;
    return 0;
}
```

> [!note] Note
> Relational operators always return a **Boolean value**:
> 
> - `1` → `true`
>     
> - `0` → `false`
