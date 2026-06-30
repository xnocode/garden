---
draft: false
tags:
  - cpp
date: 2026-06-26
author: xnocode
---
A constant is a variable whose value cannot be changed during program execution.

```text
Constant
├── value cannot be modified
├── declared using const keyword
└── must be initialized during declaration
```

example

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
const int n;
n = 25;   // Error
```

> [!note]  
> A `const` variable must be initialized when it is declared.
