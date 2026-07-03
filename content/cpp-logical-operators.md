---
title: C++ Logical Operators
description: Logical operators evaluate expressions using logical AND, OR, and NOT operations.
draft: false
date: 2026-07-02
tags:
  - cpp
prev: "[[cpp-relational-operators]]"
next: "[[cpp-conditional-statements]]"
aliases:
  - logical
---
Logical operators are used to combine or modify multiple conditions. The result is always either **true (`1`)** or **false (`0`)**.

```text
Logical Operators
├── &&  → Logical AND
├── ||  → Logical OR
└── !   → Logical NOT
```

##### Logical AND (`&&`)

Returns **true** only if **all conditions are true**.

```text
A && B

True  && True  → True
True  && False → False
False && True  → False
False && False → False
```

##### Logical OR (`||`)

Returns **true** if **at least one condition is true**.

```text
A || B

True  || True  → True
True  || False → True
False || True  → True
False || False → False
```

##### Logical NOT (`!`)

Reverses the result of a condition.

```text
!True  → False
!False → True
```

```cpp
#include <iostream>
using namespace std;
int main() {
    cout << ((3 < 5) && (10 == 5)) << endl;
    cout << ((3 < 5) || (10 == 5)) << endl;
    cout << !(3 != 5) << endl;
    return 0;
}
```

```text
Explanation

(3 < 5) && (10 == 5)
True && False → False → 0

(3 < 5) || (10 == 5)
True || False → True → 1

!(3 != 5)
!True → False → 0
```

> [!note]  
> Logical operators work with Boolean expressions and always return either `1` (true) or `0` (false).

Predict the output

```cpp
#include <iostream>
using namespace std;
int main() {
    int x = 2, y = 5;
    int exp1 = (x * y / x);
    int exp2 = (x * (y / x));
    cout << exp1 << " ";
    cout << exp2 << endl;
    return 0;
}
```

Explanation

```text
exp1 = (2 × 5) / 2
      = 10 / 2
      = 5

exp2 = 2 × (5 / 2)
      = 2 × 2
      = 4
```

> [!note]  
> When both operands are integers, division performs **integer division**, so `5 / 2` evaluates to `2`, not `2.5`.