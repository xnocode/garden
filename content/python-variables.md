---
title: python-variables
description:
draft: true
date: 2026-07-07
tags:
  - python
  - aiml
prev: "[[python-character-set]]"
next: "[[python-indentation]]"
aliases:
---
Variables are like containers where we can store data.

```python
name = "xnocode"
age = 24
PI = 3.1416
```

| variable | data    |
| -------- | ------- |
| name     | xnocode |
| age      | 24      |
| PI       | 3.1416  |
Inside memory, it stores data like this.

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

>[!note] Note
>Python uses indentation (spaces) to define structure, instead of `{}` like some other languages.

