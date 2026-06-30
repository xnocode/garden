---
draft: false
tags:
  - alml
date: 2026-04-11
author: xnocode
---
`continue` is used to skip the current iteration and move to the next one.

**example**

```python
i = 1

while i <= 5:
    if i == 3:
        i += 1
        continue
    print(i)
    i += 1
```

**output**

```bash
1
2
4
5
```

>[!note]
> - `continue` skips the current step
> - The loop does not stop, it moves to the next iteration

> [!question]  
> Write a program in Python to print all odd numbers from 1 to 10 (without using `continue`)

```python
i = 1

while i <= 10:
    if i % 2 != 0:
        print(i)
    i += 1
```

**output**

```bash
1
3
5
7
9
```

> [!question]  
> Write a program in Python to print all odd numbers from 1 to 10 (using `continue`)

```python
i = 1

while i <= 10:
    if i % 2 == 0:
        i += 1
        continue
    print(i)
    i += 1
```

**output**

```bash
1
3
5
7
9
```

