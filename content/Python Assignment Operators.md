---
draft: false
tags:
  - alml
date: 2026-04-11
author: xnocode
---
```text
a = b
|   |
|   └── value
└────── variable

→ assign value to a variable
```

**example**

```python
a = 10

a += 5   # a = a + 5 ---> # a = 10 + 5 = 15
a -= 2   # a = a - 2 ---> # a = 15 - 2 = 13
a *= 3   # a = a * 3 ---> # a = 13 * 3 = 39
a /= 2   # a = a / 2 ---> # a = 39 / 2 = 19.5

print(a)
```

**output**

```bash
19.5
```

>[!attention] 
> +=  → add and assign 
> -=  → subtract and assign
> *=  → multiply and assign
> /=  → divide and assign
> %=  → modulus and assign
> **= → power and assign

>[!note] 
>Assignment operators are used to update the value of a variable.

<< [[Python Relational or Comparison]] | [[Python Logical Operator]] >>