---
title: Python Variables
description: A variable is a named reference used to store and access data in Python.
date: 2026-07-16
tags:
  - python
  - aiml
prev: "[[python-character-set]]"
next: "[[python-indentation]]"
author: Ridoy
visibility: public
aliases:
  - variables
updatedAt: 2026-07-23
series: "Python"
seriesOrder: 7
---
Variables are like containers where we can store data.

| variable | data   |
| -------- | ------ |
| name     | Ridoy  |
| age      | 100    |
| PI       | 3.1416 |
Inside memory, it stores data like this.

```python
name = "Ridoy"
age = 100
PI = 3.1416

print(name)
print(age, PI)
print("my name is:", name)
print("my age is:", age)
print("my age is:", age - 5)
```

>[!note] Note
>Python uses indentation (spaces) to define structure, instead of `{}` like some other languages.

