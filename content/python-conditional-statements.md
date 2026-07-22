---
title: Python Conditional Statements
description:
author: Ridoy
draft: false
date: 2026-07-17
tags:
  - aiml
  - python
prev: "[[python-user-input]]"
next: "[[python-if-statements]]"
aliases:
  - conditional statements
---
Conditional statements allow a program to **make decisions** by executing different blocks of code based on whether a condition is **`True`** or **`False`**. They control the flow of a program and enable it to respond differently to different situations.

Python provides the following conditional statements:

1. `if` Statement
2. `if...else` Statement
3. `if...elif...else` Statement
4. Nested `if` Statement
5. Conditional Expression (Ternary Operator)

Every conditional statement evaluates a **condition**.

```text
Condition
    │
    ▼
True? ─────────► Execute Code Block
    │
    ▼
False ─────────► Skip or Execute Another Block
```