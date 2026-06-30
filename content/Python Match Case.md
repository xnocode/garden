---
draft: false
tags:
  - alml
date: 2026-04-11
author: xnocode
---
Used to match a value against multiple conditions (similar to switch case).

example

```python
day = 3

match day:
    case 1:
        print("Monday")
    case 2:
        print("Tuesday")
    case 3:
        print("Wednesday")
    case _:
        print("Invalid day")
```

**output**

```bash
Wednesday
```

Syntax

```python
match variable:
    case value1:
        print(" ")
    case value2:
        print(" ")
    case _:
        print("default")
```

>[!important]
> - `match` checks the value
> - `case` defines conditions
> - `_` is used as default (like else)
> - Available in Python 3.10+

<< [[Python Nesting]] | [[Python Loops]] >>