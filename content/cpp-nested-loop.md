---
draft: false
tags:
  - cpp
date: 2026-07-02
author: xnocode
title: C++ Nested Loop
description:
prev: ""
next: ""
aliases:
---
A loop inside another loop is called a **nested loop**.

```text
Nested Loop
├── Outer Loop → controls rows
├── Inner Loop → controls columns/elements
└── Inner loop executes completely for each row
```

example

```text
1 1 1 1
2 2 2 2
3 3 3 3
4 4 4 4
```

```text
R1 → 1 1 1 1
R2 → 2 2 2 2
R3 → 3 3 3 3
R4 → 4 4 4 4

C1 C2 C3 C4
```

General Structure

```cpp
for (int i = 1; i <= rows; i++) {      // outer loop
    for (int j = 1; j <= cols; j++) {  // inner loop
        // work
    }
    cout << endl;
}
```

example

```cpp
#include <iostream>
using namespace std;
int main() {
    for (int i = 1; i <= 4; i++) {
        for (int j = 1; j <= 4; j++) {
            cout << i << " ";
        }
        cout << endl;
    }
    return 0;
}
```

**output**

```bash
1 1 1 1
2 2 2 2
3 3 3 3
4 4 4 4
```

> [!note]  
> In pattern problems:
> 
> - Outer loop → Rows
>     
> - Inner loop → Columns / Elements
>     
> - Work → What to print
>     

