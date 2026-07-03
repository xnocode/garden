---
title: C++ if-else Statement
description: The if-else statement executes one of two code blocks based on a condition.
draft: false
date: 2026-07-03
tags:
  - cpp
prev: "[[cpp-if-statement]]"
next: "[[cpp-else-if-statement]]"
aliases:
  - if-else
---
The `if-else` statement executes one block of code when the condition is **true**; otherwise, it executes another block.

syntax

```text
if (condition) {
    // code
}
else {
    // code
}
```

Flow

```text
Condition
├── True  → if block
└── False → else block
```

```cpp
#include <iostream>
using namespace std;
int main() {
    int age;
    cin >> age;
    if (age >= 18)
        cout << "Can Vote" << endl;
    else
        cout << "Can't Vote" << endl;
    return 0;
}
```

> [!note] Note
> In C++, `0` is considered **false**, and any non-zero value is considered **true**.

>[!question] Question
>Print the Largest of Two Numbers

```cpp
#include <iostream>
using namespace std;
int main() {
    int x, y;
    cin >> x >> y;
    if (x > y)
        cout << x << endl;
    else
        cout << y << endl;
    return 0;
}
```

>[!question] Question
>Check Whether a Number is Even or Odd

```cpp
#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    if (n % 2 == 0)
        cout << "Even";
    else
        cout << "Odd";
    return 0;
}
```

> [!note] Note
> If `n % 2 == 0`, the number is **Even**; otherwise, it is **Odd**.