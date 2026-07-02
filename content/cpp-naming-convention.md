---
draft: false
tags:
  - cpp
date: 2026-06-28
title: cpp-naming-convention
description: Naming conventions are guidelines for choosing clear, consistent, and meaningful names in C++.
prev: cpp-garbage-value
next: cpp-data-types
aliases:
  - naming
---
Variable names in C++ must follow certain rules.

- A variable name must start with a letter (`a-z`, `A-Z`) or an underscore (`_`).
- A variable name can contain:
    - uppercase letters (`A-Z`)
    - lowercase letters (`a-z`)
    - digits (`0-9`)
    - underscore (`_`)
- A variable name cannot start with a digit.
- A variable name cannot be a keyword because keywords have special meaning in C++.

Valid examples:

```cpp
#include<iostream>
using namespace std;
int main(){
	int age;
	int _count;
	int student1;
	int total_marks;
}
```

Invalid examples:

```cpp
#include<iostream>
using namespace std;
int main(){
	int 1age;      // starts with a digit
	int total marks; // contains space
	int int;       // keyword
}
```

> [!note] Note
> Use meaningful and descriptive variable names to make code more readable.
> 
> Good: `studentAge`, `totalMarks`
> 
> Bad: `a`, `x`, `abc`

