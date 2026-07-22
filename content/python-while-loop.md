---
title: Python While Loop
description:
author: Ridoy
draft: false
date: 2026-07-18
tags:
  - aiml
  - python
prev: "[[python-loops]]"
next: "[[python-break]]"
aliases:
  - while loop
---
A `while` loop runs as long as the condition is `True`.

```text
# infinite loop
while True:
    print("hello world")
```

>[!note] Note
>Do not create infinite loops unless needed — they will run forever (unstoppable).

>[!info] Info
>In real life, infinite loops are used in systems like servers, games, etc.

> [!question] Question
> Write a program in Python to print "hello world" five times

```python id="wl1
count = 1 # iterator

while count <= 5:
    print("hello world")
    count += 1
```

**Dry Run Table**

| count | condition (count \<= 5) | output      |
| ----- | ----------------------- | ----------- |
| 1     | True                    | hello world |
| 2     | True                    | hello world |
| 3     | True                    | hello world |
| 4     | True                    | hello world |
| 5     | True                    | hello world |
| 6     | False                   | stop        |
The loop stops when the condition becomes `False`.

> [!question] Question
> Write a program in Python to print numbers from 1 to 5

```python
count = 1

while count <= 5:
    print(count)
    count += 1
```

> [!question] Question 
> Write a program in Python to print numbers from 5 to 1

```python
count = 5

while count >= 1:
    print(count)
    count -= 1
```

>[!important] Important 
> - Most loops start from `0` (especially in programming)
> - Example: `range(0, n)`
> - But you can start from any number depending on your need
>

> [!question] Question
> Write a program in Python to print the multiplication table of any number `n`

```python
n = int(input("enter a number: "))
i = 1

while i <= 10:
    print(n, "x", i, "=", n * i)
    i += 1
```