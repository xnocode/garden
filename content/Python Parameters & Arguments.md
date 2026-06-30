---
draft: false
tags:
  - alml
date: 2026-04-14
author: xnocode
---
```python
def sum(a, b):   # parameters
    s = a + b
    return s

# function call
ans = sum(3, 4)   # arguments

print(ans)
```

**output**

```bash
7
```

>[!note] 
> - Parameters → variables in function definition
> - Arguments → values passed during function call

> [!question]  
> Define a function in Python to calculate average

```python
def avg(a, b, c):
    return (a + b + c) / 3

result = avg(10, 20, 30)
print("average =", result)
```

**output**

```bash
average = 20.0
```

- default parameters

```python
def sum(a, b=1):
    return a + b

print(sum(5))
```

**output**

```bash
6
```


>[!note] 
> - Default parameter → already has a value  
> - Non-default must come before default
> - ✔ Correct: `def sum(a, b=1)`  
> - ❌ Wrong: `def sum(a=1, b)`

> [!question]  
> Write a function in Python to print factorial of `n`

```python
def cal_factorial(n):
    fact = 1
    for i in range(1, n + 1):
        fact *= i
    return fact

n = int(input("enter n: "))
print(cal_factorial(n))
```

**output**

```bash
enter n: 5
120
```

> [!note] 
> - Factorial → `n! = n × (n-1) × ... × 1`
> - `0! = 1`

