---
draft: false
tags:
  - alml
date: 2026-04-11
author: xnocode
---
1. `not` → used to get the opposite value
    
| Input | Output |
| ----- | ------ |
| True  | False  |
| False | True   |

2. `and` → returns `True` only if both values are `True`
    

|Input 1|Input 2|Output|
|---|---|---|
|True|True|True|
|False|True|False|
|True|False|False|
|False|False|False|


3. `or` → returns `True` if at least one value is `True`
    

|Input 1|Input 2|Output|
|---|---|---|
|True|True|True|
|False|True|True|
|True|False|True|
|False|False|False|

**example**

```python
a = True
b = False

print(not a)
print(a and b)
print(a or b)
```

**output**

```bash
False
False
True
```

<< [[Python Assignment Operators]] | [[Python Operator Precedence]] >>