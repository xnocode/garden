---
title: C++ else-if Statement
description: " The else-if statement evaluates multiple conditions and executes the first matching block."
draft: false
date: 2026-07-03
tags:
  - cpp
prev: "[[cpp-if-else-statement]]"
next: "[[cpp-ternary-operator]]"
aliases:
  - else-if
---
The `else-if` statement is used when multiple conditions need to be checked.

syntax

```text
if (condition1) {
    // code
}
else if (condition2) {
    // code
}
else {
    // code
}
```

Flow

```text
Condition 1
├── True  → Execute
└── False
      │
      ▼
Condition 2
├── True  → Execute
└── False
      │
      ▼
Else Block
```

```cpp
#include <iostream>
using namespace std;
int main() {
    int marks;
    cin >> marks;
    if (marks >= 90)
        cout << "Grade A";
    else if (marks >= 80)
        cout << "Grade B";
    else
        cout << "Grade C";
    return 0;
}
```

> [!note] Note
> Conditions are checked from **top to bottom**. Once a condition becomes true, the remaining conditions are skipped.

>[!question] Question
>Income Tax Calculator
>```text
>Income < 5L        → 0%
>Income 5L - 10L    → 20%
>Income > 10L       → 30%
>```

```cpp
#include <iostream>
using namespace std;
int main() {
    int income;
    cin >> income;
    if (income < 5)
        cout << 0 << endl;
    else if (income <= 10)
        cout << income * 0.2 * 100000 << endl;
    else
        cout << income * 0.3 * 100000 << endl;
    return 0;
}
```

>[!question] Question
>Print the Largest of Three Numbers

```cpp
#include <iostream>
using namespace std;
int main() {
    int x, y, z;
    cin >> x >> y >> z;
    if (x >= y && x >= z)
        cout << x;
    else if (y >= z)
        cout << y;
    else
        cout << z;
    return 0;
}
```

