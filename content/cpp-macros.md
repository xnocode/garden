---
draft: false
tags:
  - cpp
date: 2026-06-26
title: C++ Macros
description: Macros are preprocessor definitions that replace identifiers with code before compilation.
prev: "[[cpp-preprocessor-directive]]"
next: "[[cpp-namespace]]"
aliases:
  - macros
---
Macros are symbolic names that are replaced by their values before compilation.

syntax

```text
#define NAME value
```

```cpp
#include <iostream>
#define PI 3.14
using namespace std;
int main() {
    cout << PI << endl;
    return 0;
}
```

> [!note] Note
> All preprocessor directives start with `#`.
> 
> Examples: `#include`, `#define`
