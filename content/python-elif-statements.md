---
title: Python elif Statements
description:
author: xnocode
draft: false
date: 2026-07-17
tags:
  - aiml
  - python
prev: "[[python-if-else-statements]]"
next: ""
aliases:
  - elif
---
Used to check multiple conditions.

```python
marks = 75
if marks >= 90:
    print("Grade A")
elif marks >= 60:
    print("Grade B")
else:
    print("Grade C")
```

Syntax:

```python
if condition1:
    print(" ")
elif condition2:
    print(" ")
else:
    print(" ")
```


>[!note] Note
>  - Only one block will execute
>  - `elif` means "else if"
>  - Conditions are checked from top to bottom

> [!question] Question
> Write a program in Python to check age category:
> 
> - `< 13` → child
>     
> - `13–18` → teenager
>     
> - `18+` → adult
>     

```python
age = int(input("enter age: "))

if age < 13:
    print("You are a child")
elif age >= 13 and age <= 18:
    print("You are a teenager")
else:
    print("You are an adult")
```

> [!question] Question 
> Write a program in Python to check username and password

```python
username = input("enter username: ")
password = input("enter password: ")
if username == "admin" and password == "pass":
    print("Login successful")
else:
    print("Invalid username or password")
```

> [!question] Question
> Write a program in Python to check if a number is a multiple of 5 or not

```python
num = int(input("enter a number: "))
if num % 5 == 0:
    print("Number is a multiple of 5")
else:
    print("Number is not a multiple of 5")
```

> [!question] Question
> Write a program in Python to check if a number is odd or even

```python
num = int(input("enter a number: "))
if num % 2 == 0:
    print("Number is even")
else:
    print("Number is odd")
```
