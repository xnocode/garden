---
draft: false
tags:
  - alml
date: 2026-04-11
author: xnocode
---
```text
Type Conversion
├── Implicit  → automatic
└── Explicit  → manual (type casting)
```

Type Conversion (implicit) → Python automatically converts one data type to another

```python
ans = 5 + 10.0
print(ans, type(ans))   # int → float
```

**output**

```bash
15.0 <class 'float'>
```


>[!important] 
>Python converts smaller type to bigger type `int → float`

Type Casting (explicit) → done manually by the developer

We use functions like `int()`, `float()`, `str()`

```python
ans = int(5 + 10.0)
print(ans, type(ans))
```

**output**

```bash
15 <class 'int'>
```


>[!attention] 
> - Type casting works only with compatible data types
> - In implicit conversion, Python decides
> - In explicit casting, the developer controls the type

<< [[Python Operator Precedence]] | [[Python User Input]] >>