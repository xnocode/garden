---
title: Python Style Guide
description: A style guide provides conventions for writing clean, readable, and consistent Python code.
draft: false
author: Ridoy
date: 2026-07-16
tags:
  - aiml
  - python
prev: "[[python-comments]]"
next: "[[python-operators]]"
aliases:
  - style
---
`tot_price` → snake_case  
`totPrice` → camelCase  
`TotPrice` → PascalCase

>[!important] Important 
>snake_case is mostly used in Python for variable names.

```python
tot_price = 100
full_name = "Ridoy"
```

>[!note] Note
>- Variable names should not contain spaces → ❌ `full name`
>- Use `_` instead → ✔ `full_name`
>- Follow snake_case for better readability (recommended in Python)

You can also check out the Google Python style guide if you want to learn more: [# Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)