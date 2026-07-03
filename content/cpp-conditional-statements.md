---
draft: false
tags:
  - cpp
date: 2026-07-03
title: C++ Conditional Statements
description:
prev: ""
next: ""
aliases:
---
Conditional statements allow a program to make decisions based on conditions.

```text
Conditional Statements
├── if
├── if-else
├── else if
├── ternary operator
└── switch
```

-  if-else Statement

The `if-else` statement executes one block of code if the condition is true; otherwise, it executes another block.

syntax

```cpp
if (condition) {
    // code
}
else {
    // code
}
```

example

```cpp
#include <iostream>
using namespace std;

int main() {

    int age;
    cin >> age;

    if (age >= 18)
        cout << "Can Vote" << endl;
    else
        cout << "Can't Vote" << endl;

    return 0;
}
```

```text
Condition Result
├── true  → if block executes
└── false → else block executes
```

> [!note]  
> In C++, `0` is considered false and any non-zero value is considered true.

Print the largest of two numbers

```cpp
#include<iostream>
using namespace std;
int main(){
	int x, y;
	cin >> x >> y;
	if (x > y)
	    cout << x << endl;
	else
	    cout << y << endl;
}
```

Check whether a number is Even or Odd

```cpp
int n;
cin >> n;

if (n % 2 == 0)
    cout << "Even" << endl;
else
    cout << "Odd" << endl;
```

> [!note]  
> If the remainder is `0`, the number is even.


- else if Statement

Used when multiple conditions need to be checked.

syntax

```cpp
if (condition1) {
    // code
}
else if (condition2) {
    // code
}
else {
    // code
}
```

example

```cpp
#include<iostream>
using namespace std;
int main(){
	int marks;
	cin >> marks;
	if (marks >= 90)
	    cout << "A";
	else if (marks >= 80)
	    cout << "B";
	else
	    cout << "C";
}
```

> [!note]  
> Conditions are checked from top to bottom.
> 
> Once a condition becomes true, the remaining conditions are skipped.

Income Tax Calculator

```text
Income < 5L         → 0% tax
Income between 5-10L → 20% tax
Income > 10L        → 30% tax
```

```cpp
#include<iostream>
using namespace std;
int main(){
	int income;
	cin >> income;
	if (income < 5)
	    cout << 0 << endl;
	else if (income <= 10)
	    cout << income * 0.2 * 100000 << endl;
	else
	    cout << income * 0.3 * 100000 << endl;
}
```

- Print the largest of three numbers

```cpp
int x, y, z;
cin >> x >> y >> z;

if (x >= y && x >= z)
    cout << x << endl;
else if (y >= z)
    cout << y << endl;
else
    cout << z << endl;
```

Ternary Operator

The ternary operator is a shorthand form of `if-else`.

syntax

```cpp
variable = (condition) ? expression1 : expression2;
```

example

```cpp
bool isAdult = (age >= 18) ? true : false;
```

Another example

```cpp
#include<iostream>
using namespace std;
int main(){
	int x;
	cin >> x;
	cout << (x >= 18 ? "Yes" : "No") << endl;
```

```text
Ternary Operator
condition ? true_statement : false_statement
```

- Switch Statement

The `switch` statement is used to select one block of code from many alternatives.

syntax

```cpp
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

example

```cpp
#include<iostream>
using namespace std;
int main(){
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
	case 4:
		cout << "Thruday";
	case 5:
		cout << "Friday";
	case 6:
		cout << "Saturday";
	case 7:
		cout << "Sunday";
    default:
        cout << "Invalid";
}
```

> [!note]  
> `break` is used to exit the switch statement.
> 
> `default` executes when no case matches.

Build a Calculator using Switch

Perform four basic arithmetic operations:

```text
+  → Addition
-  → Subtraction
*  → Multiplication
/  → Division
```

example

```cpp
#include<iostream>
using namespace std;
int main(){
	int x, y;
	char op;
	cin >> x >> op >> y;
switch (op) {
    case '+':
        cout << x + y << endl;
        break;
    case '-':
        cout << x - y << endl;
        break;
    case '*':
        cout << x * y << endl;
        break;
    case '/':
        cout << x / y << endl;
        break;
    default:
        cout << "Invalid Operator" << endl;
	}
}
```
