---
title: Python Continue
description:
author: xnocode
draft: false
date: 2026-07-18
tags:
  - aiml
  - python
prev: "[[python-break]]"
next:
aliases:
---
`continue` is used to skip the current iteration and move to the next one.

```python
i = 1

while i <= 5:
    if i == 3:
        i += 1
        continue
    print(i)
    i += 1
```

>[!note] Note
> - `continue` skips the current step
> - The loop does not stop, it moves to the next iteration

> [!question] Question
> Write a program in Python to print all odd numbers from 1 to 10 (without using `continue`)

```python
i = 1

while i <= 10:
    if i % 2 != 0:
        print(i)
    i += 1
```

> [!question] Question
> Write a program in Python to print all odd numbers from 1 to 10 (using `continue`)

```python
i = 1

while i <= 10:
    if i % 2 == 0:
        i += 1
        continue
    print(i)
    i += 1
```