---
draft: false
tags:
  - cpp
date: 2026-06-29
title: cpp-size-of-data-types
description: The size of a data type determines how much memory it occupies.
prev: cpp-size-of-data-types
next: cpp-precision
aliases:
  - sizeof()
---
We can use the `sizeof()` operator to find the size of a data type.

```cpp
#include <iostream>
using namespace std;
int main() {
    cout << "Size of int: " << sizeof(int) << endl;
    cout << "Size of char: " << sizeof(char) << endl;
    cout << "Size of float: " << sizeof(float) << endl;
    cout << "Size of double: " << sizeof(double) << endl;
    cout << "Size of bool: " << sizeof(bool) << endl;
    return 0;
}
```
