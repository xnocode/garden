---
title: Python Operator Precedence
description:
author: xnocode
draft: false
date: 2026-07-16
tags:
  - aiml
  - python
prev: "[[python-assignment-operators]]"
next: "[[python-type-conversion]]"
aliases:
  - precedence
---
**Operator Precedence** → priority of operators (which runs first)

Order of execution:

1. `()` → highest priority    
2. `**` → power
3. `*`, `/`, `%`
4. `+`, `-`
5. \==, !=, >, > =, <, \>=
6. `not`
7. `and`
8. `or` → lowest priority

```python
result = 10 + 5 * 2
print(result)   # 10 + (5*2) = 10 + 10 = 20

result = (10 + 5) * 2
print(result)   # (10+5) * 2 = 15 * 2 = 30

result = 2 ** 3 * 2
print(result)   # (2**3) * 2 = 8 * 2 = 16

result = True or False and False
print(result)   # True or (False and False) = True
```


>[!note] Note 
> - `()` can change the priority
> - `and` runs before `or`
> - Always use `()` if you want clear and predictable results