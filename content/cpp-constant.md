---
draft: false
tags:
  - cpp
date: 2026-07-01
title: C++ Constant
description: A constant is a value that cannot be changed during program execution.
prev: cpp-input
next: cpp-type-casting
aliases:
  - constant
---
A constant is a variable whose value cannot be changed during program execution.

```text
Constant
├── value cannot be modified
├── declared using const keyword
└── must be initialized during declaration
```

Allowed

```cpp
#include<iostream>
using namespace std;
int main(){
	const int n = 25;
	const float PI = 3.14;
	return 0;
}
```

Not allowed

```cpp
#include<iostream>
using namespace std;
int main(){
	const int n;
	n = 25;   // Error
}
```

> [!important] Important
> A `const` variable must be initialized when it is declared.
