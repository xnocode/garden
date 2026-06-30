---
draft: false
tags:
  - cpp
date: 2026-06-25
author: xnocode
---
Macros are symbolic names that are replaced by their values before compilation.

syntax

```cpp
#define NAME value
```

example

```cpp
#include <iostream>
#define PI 3.14
using namespace std;
int main() {
    cout << PI << endl;
    return 0;
}
```

**output**

```bash
3.14
```

> [!note]  
> All preprocessor directives start with `#`.
> 
> Examples: `#include`, `#define`
