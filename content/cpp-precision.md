---
draft: false
tags:
  - cpp
date: 2026-06-30
title: C++ Precision
description: Precision determines the number of significant digits used to represent a floating-point value.
prev: cpp-size-of-data-types
next: cpp-comments
aliases:
  - precision
---
By default, `float` and `double` display a limited number of digits. To display more digits, we use `setprecision()` from the `<iomanip>` header file.

```cpp
#include <iostream>
#include <iomanip>
using namespace std;
int main() {
    float PI = 3.141592653589793;
    double PI2 = 3.141592653589793;
    cout << setprecision(12) << "PI  = " << PI << endl;
    cout << setprecision(12) << "PI2 = " << PI2 << endl;
    return 0;
}
```


> [!note] Note 
> `float` provides approximately 7 digits of precision, whereas `double` provides approximately 15 digits of precision.

