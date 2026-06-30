---
draft: false
tags:
  - cpp
date: 2026-06-26
author: xnocode
---
If a local variable is declared but not initialized, it contains a garbage value.

example

```cpp
#include <iostream>
using namespace std;
int main() {
    int a;
    cout << "a = " << a << endl;
    return 0;
}
```

**output**

```text
a = unpredictable value
```

> [!note]  
> Always initialize variables before using them to avoid garbage values