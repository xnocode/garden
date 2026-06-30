---
draft: false
tags:
  - alml
date: 2026-04-11
author: xnocode
---
Nesting means writing one conditional statement inside another.

example

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

**output**

```bash
You can vote
```

Syntax:

```python
if condition1:
    if condition2:
        print(" ")
```

> [!important] 
> - Inner `if` runs only if outer `if` is `True`
> - Use proper indentation
> - Avoid too much nesting (makes code hard to read)

<< [[Python Conditional Statements]] | [[Python Match Case]] >>