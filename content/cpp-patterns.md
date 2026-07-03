---
draft: false
tags:
  - cpp
date: 2026-07-05
title: C++ Patterns
description:
prev: ""
next: ""
aliases:
---
#### Basic Patterns

###### Star Pattern

```bash
*
* *
* * *
* * * *
```

Logic

```text
Outer Loop → 1 to n
Inner Loop → 1 to i
Work       → print *
```

```cpp
for (int i = 1; i <= n; i++) {

    for (int j = 1; j <= i; j++) {
        cout << "* ";
    }

    cout << endl;
}
```
###### Inverted Star Pattern

```bash
* * * *
* * *
* *
*
```

###### Logic

```text
Outer Loop → 1 to n
Inner Loop → 1 to (n - i + 1)
Work       → print *
```

```cpp
for (int i = 1; i <= n; i++) {

    for (int j = 1; j <= n - i + 1; j++) {
        cout << "* ";
    }

    cout << endl;
}
```
###### Half Pyramid Pattern

```bash
1
12
123
1234
```

Logic

```text
Outer Loop → 1 to n
Inner Loop → 1 to i
Work       → print j
```

```cpp
for (int i = 1; i <= n; i++) {

    for (int j = 1; j <= i; j++) {
        cout << j;
    }

    cout << endl;
}
```

###### Character Pyramid Pattern

```bash
A
BC
DEF
GHIJ
```

Logic

```text
Outer Loop → 1 to n
Inner Loop → 1 to i
Work       → print character
```

```cpp
char ch = 'A';

for (int i = 1; i <= n; i++) {

    for (int j = 1; j <= i; j++) {
        cout << ch;
        ch++;
    }

    cout << endl;
}
```

##### Hollow Rectangle Pattern

```bash
*****
*   *
*   *
*****
```

Logic

```text
Print * when:
├── first row
├── last row
├── first column
└── last column
```

```cpp
for (int i = 1; i <= rows; i++) {

    for (int j = 1; j <= cols; j++) {

        if (i == 1 || i == rows ||
            j == 1 || j == cols)
            cout << "*";
        else
            cout << " ";
    }

    cout << endl;
}
}
```
##### Inverted & Rotated Half Pyramid

```bash
   *
  **
 ***
****
```

Logic

```text
Spaces → n - i
Stars  → i
```

```cpp
for (int i = 1; i <= n; i++) {

    for (int j = 1; j <= n - i; j++)
        cout << " ";

    for (int j = 1; j <= i; j++)
        cout << "*";

    cout << endl;
}
```
##### Floyd's Triangle

```bash
1
2 3
4 5 6
7 8 9 10
```

```cpp
int num = 1;

for (int i = 1; i <= n; i++) {

    for (int j = 1; j <= i; j++) {
        cout << num << " ";
        num++;
    }

    cout << endl;
}
```
##### 0-1 Triangle Pattern

```bash
1
01
101
0101
10101
```

Logic

```text
If (i + j) is even → print 1
Else               → print 0
```
###### Diamond Pattern

```bash
   *
  ***
 *****
*******
 *****
  ***
   *
```

```text
Diamond Pattern
├── Upper Pyramid
└── Lower Pyramid
```

Upper Pyramid:

```text
Spaces → n - i
Stars  → 2*i - 1
```

Lower Pyramid:

```text
Spaces → n - i
Stars  → 2*i - 1
(i runs from n to 1)
```
###### Butterfly Pattern

```bash
*      *
**    **
***  ***
********
********
***  ***
**    **
*      *
```

```text
Butterfly Pattern
├── Upper Half
│   ├── Stars → i
│   ├── Spaces → 2*(n-i)
│   └── Stars → i
└── Lower Half
    ├── Stars → i
    ├── Spaces → 2*(n-i)
    └── Stars → i
```

##### Rhombus Pattern

```bash
    *****
   *****
  *****
 *****
*****
```

Logic

```text
Spaces → n - i
Stars  → n
```
###### Palindromic Number Pattern

```bash
    1
   212
  32123
 4321234
543212345
```

Logic

```text
1. Print spaces
2. Print decreasing numbers
3. Print increasing numbers
```

> [!note]  
> Most pattern problems are solved using:
> 
> - Spaces
>     
> - Stars / Numbers / Characters
>     
> - Nested loops
>     
> - Observing row-column relationships
>     

```

These notes are derived from the uploaded "Nested Loops" and "Patterns Questions" PDFs. 
```