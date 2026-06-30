---
draft: false
tags:
  - cpp
date: 2026-06-26
author: xnocode
---
The `break` statement immediately terminates a loop.

example

```cpp
#include<iostream>
using namespace std;
int main(){
int i = 1;
while (i <= 10) {
    if (i == 3)
        break;
    cout << i << endl;
    i++;
}
cout << "Out of Loop";
```

**output**

```bash
1
2
Out of Loop
```

The `continue` statement skips the current iteration and moves to the next iteration.

example

```cpp
#include<iostream>
using namespace std;
int main(){
for (int i = 1; i <= 10; i++) {
    if (i == 3)
        continue;
    cout << i << " ";
}
}
```

**output**

```bash
1 2 4 5 6 7 8 9 10
```

Keep taking input until the user enters a multiple of 10

```cpp
#include<iostream>
using namespace std;
int main(){
int n;
do {
    cout << "Enter Number: ";
    cin >> n;
    if (n % 10 == 0)
        break;
    cout << "You entered: " << n << endl;
} while (true);
```

Check Prime Number

A prime number has exactly two factors: `1` and itself.

```text
Prime Numbers
├── 2
├── 3
├── 5
├── 7
└── ...
```

Basic approach:

```cpp
#include<iostream>
using namespace std;
int main(){
int n;
cin >> n;
bool isPrime = true;
for (int i = 2; i <= n - 1; i++) {
    if (n % i == 0) {
        isPrime = false;
        break;
    }
}
if (isPrime)
    cout << "Prime";
else
    cout << "Composite";
}
```

Optimized Prime Check

Factors repeat after √n.

```cpp
#include<iostream>
#include <cmath>
using namespace std;
int main(){
int n;
cin >> n;
bool isPrime = true;
for (int i = 2; i <= sqrt(n); i++) {

    if (n % i == 0) {
        isPrime = false;
        break;
    }
}
if (isPrime)
    cout << "Prime";
else
    cout << "Composite";
}
```

> [!note]  
> To check whether a number is prime, iterate only up to `√n`.

Factorial of a number `n` is:

```text
n! = n × (n - 1) × (n - 2) × ... × 1
```

Examples:

```text
0! = 1
1! = 1
3! = 6
4! = 24
```

example

```cpp
#include<iostream>
using namespace std;
int main(){
int n, factorial = 1;
cin >> n;

for (int i = n; i >= 1; i--) {
    factorial *= i;
}

cout << factorial << endl;
}
```

