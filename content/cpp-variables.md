---
draft: false
tags:
  - cpp
date: 2026-06-27
title: C++ Variables
description: A variable is a named memory location used to store data that can change during program execution.
prev: cpp-namespace
next: cpp-assignment-operator
aliases:
  - variable
---
A variable is a named memory location used to store data.

Unlike literals, the value stored inside a variable can be changed during program execution.

```cpp
#include<iostream>
using namespace std;
int main(){
	int a = 10, b = 5;
	cout << 2 * (a + b ) << endl;
	return 0;
}
```

```text
                   2 * (a + b)
                  ╱    │    ╲
                 ▼     ▼     ▼
              Literal  │  Variable
             (2)       │   (b)
                       ▼
                   Variable
                      (a)
```

```text
Variable
├── Stores data
├── Has a name
├── Has a data type
├── Occupies memory
└── Value can be changed
```

> [!note]  
> Always use meaningful variable names.
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

```cpp
#include<iostream>
using namespace std;
int main(){
	int age;
	cout << "Size of int" << sizeof(age) << endl;
	return 0;
}
```

> [!info]  
> Variables are also called **identifiers** because they are used to identify memory locations.

