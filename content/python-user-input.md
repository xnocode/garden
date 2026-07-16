---
title: Python User Input
description:
author: xnocode
draft: false
date: 2026-07-16
tags:
  - aiml
  - python
prev: "[[python-type-conversion]]"
next: "[[python-conditional-statements]]"
aliases:
  - input
---
`input()` → used to take input from the user

By default, input values are stored as `string`

```python
a = input("enter the value of a: ")
print(a)

username = input("enter your name: ")
print("Welcome!", username)
```

>[!question] Question
>Write a program in Python to find the sum of two numbers

```python
a = input("enter a number: ")
b = input("enter a number: ")

sum = a + b
print("Sum of two numbers:", sum)
```

Both `a` and `b` are strings, so `+` joins them (concatenation)

We need type casting to convert input into numbers

```python
a = int(input("enter a number: "))
b = int(input("enter a number: "))

sum = a + b
print("Sum of two numbers:", sum)
```

>[!note] Note
>Always convert input to the correct data type when working with numbers.


>[!question] Question
>Write a program in Python to find the average of two numbers.

```python
a = float(input("enter 1st number: "))
b = float(input("enter 2nd number: "))
avg = (a+b)/2
print("avg of two numbers: ", avg)
```

