---
draft: false
tags:
  - alml
date: 2026-04-14
author: xnocode
---
`range()` → used to generate a sequence of numbers

```text
range(start, stop, step)
```

- `start` → default = 0
    
- `step` → default = 1
    
- `stop` → not included
    

examples

```text
range(5)       → 0, 1, 2, 3, 4
range(1, 6)    → 1, 2, 3, 4, 5
range(1, 10, 2) → 1, 3, 5, 7, 9
```

code examples

```python
for i in range(5):
    print(i)
```

**output**

```bash
0
1
2
3
4
```

```python
for i in range(1, 6):
    print(i)
```

**output**

```bash
1
2
3
4
5
```

```python
for i in range(1, 10, 2):
    print(i)
```

**output**

```bash
1
3
5
7
9
```

>[!note]
> - `start` → where loop begins  
> - `stop` → where loop ends (excluded)
> - `step` → increment value  
> - `range()` is commonly used with `for` loop  

example (reverse)

```python
for i in range(5, 0, -1):
    print(i)
```

**output**

```bash
5
4
3
2
1
```

> [!question]  
> Write a program in Python to print the sum of first `n` natural numbers

```python
n = int(input("enter number: "))

sum = 0
for i in range(1, n + 1):
    sum += i

print("sum =", sum)
```

**output**

```bash
enter number: 5
sum = 15
```

>[!note] 
> - Natural numbers → `1, 2, 3, ... n`
> - `range(1, n+1)` → includes `n`
> - `sum += i` → adds each number to total

- dry run (n = 5)

| i   | sum |
| --- | --- |
| 1   | 1   |
| 2   | 3   |
| 3   | 6   |
| 4   | 10  |
| 5   | 15  |
