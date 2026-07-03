---
draft: false
tags:
  - cpp
date: 2026-06-29
title: C++ Input
description: Input is the process of receiving data from the user or another source during program execution.
prev: "[[cpp-comments]]"
next: "[[cpp-constant]]"
aliases:
  - input
---
In C++, `cin` is used to take input from the user.

```text
Input in C++
├── cin is used for input
├── >> is called extraction operator
└── stores user input in variables
```

```cpp
#include <iostream>
using namespace std;
int main() {
    int age;
    cin >> age;
    cout << "Your age is " << age << endl;
    return 0;
}
```

> [!note] Note 
> `cin` reads data from the keyboard and stores it in variables.

> [!question] Question 
> WAP to calculate the sum of two numbers.

```cpp
#include <iostream>
using namespace std;
int main() {
    int a, b;
    cin >> a >> b;
    cout << "A + B : " << a + b << endl;
    return 0;
}
```

> [!question] Question 
> WAP to calculate and print the average marks of three subjects.

```cpp
#include <iostream>
using namespace std;
int main() {
    int a, b, c;
    cin >> a >> b >> c;
    cout << "Average: " << (a + b + c) / 3 << endl;
    return 0;
}
```

> [!question] question
> WAP to calculate the area of a square.

```cpp
#include <iostream>
using namespace std;
int main() {
    int side;
    cin >> side;
    cout << side * side << endl;
    return 0;
}
```

> [!question] Question  
> WAP to calculate the simple interest.
> ```text
> Simple Interest = (P × R × T) / 100
> ```

```cpp
#include <iostream>
using namespace std;
int main() {
    int p, r, t;
    cin >> p >> r >> t;
    cout << (float)(p * r * t) / 100 << endl;
    return 0;
}
```

> [!question] Question
> WAP to calculate the area of a circle.
> ```text
> Area = π × r × r
> ```

```cpp
#include <iostream>
#define PI 3.14
using namespace std;
int main() {
    int r;
    cin >> r;
    cout << PI * r * r << endl;
    return 0;
}
```

> [!question] Question
> WAP to calculate the total price with and without GST.

```cpp
#include <iostream>
using namespace std;
int main() {
    float pencil, pen, eraser;
    cin >> pencil >> pen >> eraser;
    float total = pencil + pen + eraser;
    cout << "Total cost (without GST): "
         << total << endl;
    float gst = total * 0.18;
    float finalBill = total + gst;
    cout << "Total cost (with 18% GST): "
         << finalBill << endl;

    return 0;
}
```

> [!note] Note
> Multiple inputs can be taken in a single statement:
> ```text
> cin >> a >> b >> c;
> ```

