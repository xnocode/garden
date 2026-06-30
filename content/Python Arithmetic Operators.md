---
draft: false
tags:
  - alml
date: 2026-04-10
author: xnocode
---
file : 

```python
a = 10
b = 5

print(a + b)
print(a - b)
print(a * b)
print(a / b)
print(a // b)
print(a ** b)
print(a % b)
```

**output**

```bash
15
5
50
2.0
2
100000
0
```


`//` is used for integer (floor) division

`%` → modulus operator (it gives the remainder)

`a ** b` → power operator (a raised to the power of b)


>[!attention] 
>`^` is not a power operator in Python. It is a bitwise operator.

> [!question]  
> Write a program in Python to find the sum of two numbers

**file:** `sum_of_two_numbers.py`

```python
a = 10
b = 20

sum = a + b
print("Sum of two numbers:", sum)
```

**output**

```bash
Sum of two numbers: 30
```

<< [[Python Operators]] | [[Python Relational or Comparison]] >>