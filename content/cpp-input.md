---
draft: false
tags:
  - cpp
date: 2026-07-02
title: C++ Input
description:
prev: ""
next: ""
aliases:
---
In C++, `cin` is used to take input from the user.

```text
Input in C++
├── cin is used for input
├── >> is called extraction operator
└── stores user input in variables
```

example

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

**output**

```bash
25
Your age is 25
```

> [!note]  
> `cin` reads data from the keyboard and stores it in variables.

Q. Calculate the Sum of Two Numbers

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

**output**

```bash
4
2
A + B : 6
```

Q. Print Average Marks

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

Q. Area of a Square

Formula:

```text
Area = side × side
```

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

Q. Simple Interest Calculator

Formula:

```text
Simple Interest = (P × R × T) / 100
```

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

Q. Area of a Circle

Formula:

```text
Area = π × r × r
```

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

Q. Total Price With and Without GST

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

> [!note]  
> Multiple inputs can be taken in a single statement:
> 
> ```cpp
> cin >> a >> b >> c;
> ```

