---
title: Python Indentation
description: Python uses indentation instead of braces to group statements into blocks.
draft: false
author: Ridoy
date: 2026-07-16
tags:
  - python
  - aiml
prev: "[[python-variables]]"
next: "[[python-case-sensitive]]"
aliases:
  - indentation
---
Indentation means adding spaces at the beginning of a line to define code blocks. In Python, indentation is required. It tells Python which lines belong together.

```python
if True:
    print("Hello")
    print("World")
```

Here, both `print()` statements are inside the `if` block because they are indented.

If indentation is wrong, Python will give an error.

```python
if True:
print("Hello")
```

>[!note] Note
> This will cause an **IndentationError**.
