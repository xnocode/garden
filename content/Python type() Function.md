---
draft: false
tags:
  - alml
date: 2026-04-10
author: xnocode
---
We can check the data type of a variable using the `type()` function.

**file:** `10_type_function.py`

```python
name = "xnocode"
age = 35
PI = 3.14

isPrime = True
isNone = None

print(type(PI))
print(type(name))
print(type(age))
print(type(isPrime))
print(type(isNone))
```

**output**

```bash
<class 'float'>
<class 'str'>
<class 'int'>
<class 'bool'>
<class 'NoneType'>
```


>[!note]
>`type()` returns the data type of a variable.

<< [[Python Data Types]] | [[Python Keywords]] >>