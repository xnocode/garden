---
title: Python Nesting
description:
author: xnocode
draft: false
date: 2026-07-18
tags:
  - aiml
  - python
prev: "[[python-elif-statements]]"
next: "[[python-match-case]]"
aliases:
  - nesting
---
Nesting means writing one conditional statement inside another.

```python
age = 20
has_id = True
if age >= 18:
    if has_id:
        print("You can vote")
    else:
        print("You need an ID")
else:
    print("You are underage")
```

Syntax:

```text
if condition1:
    if condition2:
        print(" ")
```

> [!important] Important
> - Inner `if` runs only if outer `if` is `True`
> - Use proper indentation
> - Avoid too much nesting (makes code hard to read)