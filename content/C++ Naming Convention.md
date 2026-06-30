---
draft: false
tags:
  - cpp
date: 2026-06-26
author: xnocode
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
int age;
int _count;
int student1;
int total_marks;
```

Invalid examples:

```cpp
int 1age;      // starts with a digit
int total marks; // contains space
int int;       // keyword
```

> [!note]  
> Use meaningful and descriptive variable names to make code more readable.
> 
> Good: `studentAge`, `totalMarks`
> 
> Bad: `a`, `x`, `abc`