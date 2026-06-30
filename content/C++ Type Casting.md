---
draft: false
tags:
  - cpp
date: 2026-06-26
author: xnocode
---
Type casting means converting data from one data type to another.

```text
Type Casting
├── Implicit Conversion
└── Explicit Conversion
```

Implicit Conversion --> Conversion performed automatically by the compiler.

```text
Implicit Type Conversion
bool → char → int → float → double
```

example

```cpp
#include <iostream>
using namespace std;
int main() {
    cout << (10 / 3) << endl;
    cout << (10 / 3.0) << endl;
    return 0;
}
```

**output**

```bash
3
3.33333
```

> [!note]  
> In mixed-type expressions, smaller data types are automatically promoted to larger data types.

Explicit Conversion --> Conversion forced by the programmer.

syntax

```cpp
(data_type) expression
```

example

```cpp
#include <iostream>
using namespace std;
int main() {
    cout << (int)('A') << endl;
    return 0;
}
```

**output**

```bash
65
```
