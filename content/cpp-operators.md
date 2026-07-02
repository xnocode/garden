---
draft: false
tags:
  - cpp
date: 2026-07-02
author: xnocode
title: C++ Operators
description:
prev: ""
next: ""
aliases:
---
Operators are symbols that tell the compiler to perform some operation.

```text
a + b
│ │ │
│ │ └── operand
│ └──── operator
└────── operand
```

```text
Types of Operators
├── Arithmetic Operators
├── Assignment Operators
├── Relational Operators
├── Logical Operators
└── Bitwise Operators
```

Arithmetic operators perform mathematical operations.

```text
Arithmetic Operators
├── +  → Addition
├── -  → Subtraction
├── *  → Multiplication
├── /  → Division
└── %  → Modulus
```

example

```cpp
#include <iostream>
using namespace std;
int main(){
	int a, b;
	cin >> a >> b;
	cout << a + b << endl;
	cout << a - b << endl;
	cout << a * b << endl;
	cout << a / b << endl;
	cout << a % b << endl;
}
```

Unary operators work with a single operand.

```text
Increment (++)

a++ → post-increment (use, then update)
++a → pre-increment  (update, then use)
```

```text
Decrement (--)

a-- → post-decrement
--a → pre-decrement
```

example

```cpp
#include <iostream>
using namespace std;
int main(){
	int x = 3;
	x++;
	cout << x << endl;   // 4
	x--;
	cout << x << endl;   // 3
	return 0;
}
```

Assignment operators assign values to variables.

```text
=
+=
-=
*=
/=
%=
```

example

```cpp
#include<iostream>
using namespace std;
int main(){
	int a;
	cin >> a;
	a += 5;   // a = a + 
	cout << a << endl;
	a -= 5;   // a = a - 5
	cout << a << endl;
	a *= 5;   // a = a * 5
	cout << a << endl;
	a /= 5;   // a = a / 5
	cout << a << endl;
}
```

Relational operators compare two values.

```text
Relational Operators
├── >   Greater than
├── >=  Greater than or equal to
├── <   Less than
├── <=  Less than or equal to
├── ==  Equal to
└── !=  Not equal to
```


example
```cpp
#include<iostream>
using namespace std;
int main(){
	int a, b;
	cin >> a >> b;
	cout << (a == b) << endl;
	cout << (a != b) << endl;
	cout << (a < b) << endl;
	cout << (a <= b) << endl;
	cout << (a > b) << endl;
	cout << (a >= b) << endl;
}
```

> [!note]  
> Relational operators return either `1` (true) or `0` (false).

Logical operators combine multiple conditions.

```text
Logical Operators
├── &&  Logical AND
├── ||  Logical OR
└── !   Logical NOT
```

```text
AND (&&)
All conditions must be true.

OR (||)
At least one condition must be true.

NOT (!)
Reverses the result.
True  → False
False → True
```

example

```cpp
#include<iostream>
using namespace std;
int main(){
	cout << ((3 < 5) && (10 == 5)) << endl;   // 0
	cout << ((3 < 5) || (10 == 5)) << endl;   // 1
	cout << !(3 != 5) << endl;                // 0
}
```

Predict the output:

```cpp
int x = 2, y = 5;

int exp1 = (x * y / x);
int exp2 = (x * (y / x));

cout << exp1 << " ";
cout << exp2 << endl;
```

**output**

```bash
5 4
```
