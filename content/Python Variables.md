---
draft: false
tags:
  - alml
date: 2026-04-08
author: xnocode
---
Variables are like containers where we can store data.

**example**

```python
name = "xnocode"
age = 24
PI = 3.1416
```

|variable|data|
|---|---|
|name|xnocode|
|age|24|
|PI|3.1416|

Inside memory, it stores data like this.

**file:** `variables.py`

```python
name = "xnocode"
age = 25
PI = 3.1416

print(name)

print(name, age, PI)

print("my name is:", name)

print("my age is:", age)

print("my age is:", age - 5)
```

**output**

```bash
xnocode
xnocode 25 3.1416
my name is: xnocode
my age is: 25
my age is: 20
```

Before moving forward, it's important to understand indentation and case sensitivity in Python → [[Python Indentation]] | [[Python Case-Sensitive]]


<< [[Python Character Set]] | [[Python Indentation]] >>