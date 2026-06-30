---
draft: false
tags:
  - alml
date: 2026-04-08
author: xnocode
---
Indentation means adding spaces at the beginning of a line to define code blocks.

In Python, indentation is required. It tells Python which lines belong together.

**file:** `6_indentation.py`

```python
if True:
    print("Hello")
    print("World")
```

**output**

```bash
Hello
World
```

Here, both `print()` statements are inside the `if` block because they are indented.

If indentation is wrong, Python will give an error.

```python
if True:
print("Hello")
```

❌ This will cause an **IndentationError**.

>[!note] 
>Python uses indentation (spaces) to define structure, instead of `{}` like some other languages.

<< [[Python Variables]] | [[Python Identifiers]] >>