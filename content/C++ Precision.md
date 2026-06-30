---
draft: false
tags:
  - cpp
date: 2026-06-26
author: xnocode
---
By default, `float` and `double` display a limited number of digits. To display more digits, we use `setprecision()` from the `<iomanip>` header file.

example

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

**output**

```bash
PI  = 3.14159274101
PI2 = 3.14159265359
```

> [!note]  
> `float` provides approximately 7 digits of precision, whereas `double` provides approximately 15 digits of precision.