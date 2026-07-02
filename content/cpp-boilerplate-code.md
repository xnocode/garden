---
draft: false
tags:
  - cpp
date: 2026-06-25
title: C++ Boilerplate Code
description: An introduction to the C++ boilerplate, explaining the essential components every program starts with.
prev: cpp-dsa-index
next: cpp-preprocessor-directive
aliases:
  - boilerplate
---
In C++, this is one of the first programs we write to print something on the screen.

```cpp
#include <iostream>
using namespace std; // preprocessor directive
int main()
{
    cout << "xnocode" << endl; 
    // execution of the program starts from here
}
```

It is also called **Boilerplate Code** because it contains the basic structure required to write and run a C++ program.

```plaintext
Boilerplate Code
├── basic structure of a C++ program
├── contains necessary components to run a program
└── used as a starting template
```

Explanation:

- `#include <iostream>`
    - A preprocessor directive.
    - Includes the Input/Output Stream library.
    - Allows us to use `cout`, `cin`, etc.
- `using namespace std;`
    - Allows us to use standard library objects without writing `std::` every time.
- `int main()`
    - The main function of a C++ program.
    - Execution of the program starts from this function.
- `cout << "Hello World";`
    - Prints `Hello World` on the screen.
- `return 0;`
    - Ends the `main()` function.
    - `0` indicates that the program executed successfully.

> [!note]  Every C++ program must contain a `main()` function because program execution always starts from there.

