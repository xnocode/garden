---
draft: false
tags:
  - cpp
date: 2026-06-26
author: xnocode
---
A variable is a named memory location used to store data.

Unlike literals, the value stored inside a variable can be changed during program execution.

example

```cpp
a = 10
b = 5

2 * (a + b)
```

```text
2   → Literal (cannot be changed)

a,b → Variables (can store and change values)
```

```text
Variable
├── stores data
├── value can be updated
└── has a name and a data type
```

Variables are also called **identifiers**.

```text
a ──► 10
b ──► 5
```

> [!note]  
> Always use meaningful variable names.
> 
> Examples: `age`, `salary`, `studentName`

Variables occupy memory inside RAM.

```text
+-----+-----+     +-----+-----+
|  a  | 10  |     |  b  |  5  |
+-----+-----+     +-----+-----+
```

Every variable:

- occupies memory
- has a data type
- has a specific size

example

```cpp
int age = 20;
```

Here,

```text
int  → data type
age  → variable name
20   → value
```

example

```cpp
#include <iostream>
using namespace std;
int main() {
    int a = 5;
    int b = 10;
    cout << a << endl;
    cout << b << endl;
    return 0;
}
```

**output**

```bash
5
10
```