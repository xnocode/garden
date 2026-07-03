---
title: C++ Switch Statement
description: The switch statement selects and executes a code block based on the value of an expression.
draft: false
date: 2026-07-03
tags:
  - cpp
prev: ""
next: ""
aliases:
  - switch
---
The `switch` statement selects one block of code from multiple choices.

syntax

```text
switch (expression) {
    case value1:
        // code
        break;
    case value2:
        // code
        break;
    default:
        // code
}
```


```cpp
#include <iostream>
using namespace std;
int main() {
    int day;
    cin >> day;
    switch (day) {
        case 1:
            cout << "Monday";
            break;
        case 2:
            cout << "Tuesday";
            break;
        case 3:
            cout << "Wednesday";
            break;
        case 4:
            cout << "Thursday";
            break;
        case 5:
            cout << "Friday";
            break;
        case 6:
            cout << "Saturday";
            break;
        case 7:
            cout << "Sunday";
            break;
        default:
            cout << "Invalid Day";
    }
    return 0;
}
```

```text
Switch Flow
├── Match Found → Execute case
├── break       → Exit switch
└── No Match    → default
```

> [!note]  
> Without `break`, execution continues into the next case. This is called **fall-through**.


>[!question] Question
>Build a Calculator using `switch`

```cpp
#include <iostream>
using namespace std;
int main() {
    int x, y;
    char op;
    cin >> x >> op >> y;
    switch (op) {
        case '+':
            cout << x + y;
            break;
        case '-':
            cout << x - y;
            break;
        case '*':
            cout << x * y;
            break;
        case '/':
            cout << x / y;
            break;
        default:
            cout << "Invalid Operator";
    }
    return 0;
}
```