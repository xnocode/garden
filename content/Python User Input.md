---
draft: false
tags:
  - alml
date: 2026-04-11
author: xnocode
---
`input()` → used to take input from the user

By default, input values are stored as `string`

**example**

```python
a = input("enter the value of a: ")
print(a)

username = input("enter your name: ")
print("Welcome!", username)
```

>[!question] 
>Write a program in Python to find the sum of two numbers

```python
a = input("enter a number: ")
b = input("enter a number: ")

sum = a + b
print("Sum of two numbers:", sum)
```

**output**

```bash
enter a number: 5
enter a number: 10
Sum of two numbers: 510
```

Reason:  
Both `a` and `b` are strings, so `+` joins them (concatenation)


We need type casting to convert input into numbers

```python
a = int(input("enter a number: "))
b = int(input("enter a number: "))

sum = a + b
print("Sum of two numbers:", sum)
```

**output**

```bash
enter a number: 5
enter a number: 10
Sum of two numbers: 15
```

>[!note]
>Always convert input to the correct data type when working with numbers.


>[!question] 
>Write a program in Python to find the average of two numbers.

```python
a = float(input("enter 1st number: "))
b = float(input("enter 2nd number: "))
avg = (a+b)/2
print("avg of two numbers: ", avg)
```

**output**

```bash
enter 1st number: 8
enter 2nd number: 4
avg of two numbers: 6.0
```

<< [[Python Type Conversion]] | [[Python Conditional Statements]] >>