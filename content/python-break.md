---
title: Python Break
description:
author: Ridoy
draft: false
date: 2026-07-18
tags:
  - aiml
  - python
prev: "[[python-while-loop]]"
next: "[[python-continue]]"
aliases:
---
`break` is used to stop the loop immediately.

```python
i = 1

while i <= 5:
    if i == 3:
        break
    print(i)
    i += 1
```

>[!note] Note
> - `break` exits the loop immediately
> - Loop stops even if the condition is still `True`
