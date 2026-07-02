---
draft: false
tags:
  - cpp
date: 2026-07-02
author: xnocode
title: C++ Loops
description:
prev: ""
next: ""
aliases:
---
Loops are used to execute a block of code repeatedly.

```text
Loops
├── for loop
├── while loop
└── do-while loop
```

For Loop

A `for` loop is used when the number of iterations is known.

syntax

```cpp
for (initialization; condition; update) {
    // code
}
```

example

```cpp
#include<iostream>
using namespace std;
int main(){
for (int i = 1; i <= 5; i++) {
    cout << i << " ";
}
}
```

**output**

```bash
1 2 3 4 5
```

```text
For Loop Flow
1. Initialization
2. Condition Check
3. Execute Body
4. Update
5. Repeat
```

> [!note]  
> The loop executes as long as the condition is true.

Print "xnocode" 5 times

```cpp
#include<iostream>
using namespace std;
int main(){
for (int i = 0; i < 5; i++) {
    cout << "xnocode" << endl;
}
}
```

Print numbers from 1 to n

```cpp
#include<iostream>
using namespace std;
int main(){
int n;
cin >> n;

for (int i = 1; i <= n; i++) {
    cout << i << " ";
}
}
```

Print numbers from n to 1

```cpp
#include<iostream>
using namespace std;
int main(){
int n;
cin >> n;

for (int i = n; i >= 1; i--) {
    cout << i << " ";
}
}
```

Print the sum of first n natural numbers

```cpp
#include<iostream>
using namespace std;
int main(){
int n, sum = 0;
cin >> n;
for (int i = 1; i <= n; i++) {
    sum += i;
}
cout << sum << endl;
}
```

Another way:

```cpp
sum = n * (n + 1) / 2;
```

While Loop

A `while` loop executes as long as the condition is true.

syntax

```cpp
while (condition) {
    // code
}
```

example

```cpp
#include<iostream>
using namespace std;
int main(){
int count = 1;

while (count <= 3) {
    cout << count << endl;
    count++;
}
}
```

**output**

```bash
1
2
3
```

```text
While Loop Flow
├── Initialization
├── Condition
├── Body Execution
└── Update
```

Print a square pattern

```cpp
#include<iostream>
using namespace std;
int main(){
for (int i = 0; i < 4; i++) {
    cout << "* * * *" << endl;
}
}
```

**output**

```bash
* * * *
* * * *
* * * *
* * * *
```

Print the sum of digits of a number

```cpp
#include<iostream>
using namespace std;
int main(){
int n, sum = 0;
cin >> n;
while (n > 0) {
    int lastDigit = n % 10;
    sum += lastDigit;
    n /= 10;
}
cout << sum << endl;
}
```

Logic:

```text
n % 10  → get last digit
n /= 10 → remove last digit
```

Print the sum of odd digits

```cpp
#include<iostream>
using namespace std;
int main(){
int n, sum = 0;
cin >> n;
while (n > 0) {
    int digit = n % 10;
    if (digit % 2 != 0)
        sum += digit;
    n /= 10;
}
cout << sum << endl;
}
```

Print digits of a number in reverse order

Input:

```bash
10829
```

Output:

```bash
92801
```

```cpp
#include<iostream>
using namespace std;
int main(){
int n;
cin >> n;
while (n > 0) {
    int digit = n % 10;
    cout << digit;
    n /= 10;
}
```

## Reverse a Number

Input:

```bash
10829
```

Output:

```bash
92801
```

```cpp
#include<iostream>
using namespace std;
int main(){
int n, rev = 0;
cin >> n;
while (n > 0) {
    int digit = n % 10;
    rev = rev * 10 + digit;
    n /= 10;
}
cout << rev << endl;
}
```

Logic:

```text
lastDigit = n % 10
rev = rev * 10 + lastDigit
n /= 10
```

Do-While Loop

A `do-while` loop executes the body first and checks the condition later.

syntax

```cpp
do {
    // code
} while (condition);
```

example

```cpp
#include<iostream>
using namespace std;
int main(){
int i = 1;

do {
    cout << i << " ";
    i++;
} while (i <= 5);

}
```

**output**

```bash
1 2 3 4 5
```

> [!note]  
> A `do-while` loop executes at least once, even if the condition is false.
