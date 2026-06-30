---
draft: false
tags:
  - alml
date: 2026-04-10
author: xnocode
---
`tot_price` → snake_case  
`totPrice` → camelCase  
`TotPrice` → PascalCase

>[!important] 
>snake_case is mostly used in Python for variable names.

**file:** `12_style-guide.py`

```python
tot_price = 100
full_name = "xnocode"
```

>[!note] 
>- Variable names should not contain spaces → ❌ `full name`
>- Use `_` instead → ✔ `full_name`
>- Follow snake_case for better readability (recommended in Python)

You can also check out the Google Python style guide if you want to learn more: [# Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)

<< [[Python Comments]] | [[Python Operators]] >>