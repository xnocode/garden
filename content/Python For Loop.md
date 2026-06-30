---
draft: false
tags:
  - alml
date: 2026-04-14
author: xnocode
---
**For Loop** → mainly used for sequential traversal (going through elements one by one)

```python
string = "hello"

# in → membership operator (checks presence / iterates)
for var in string:
    print(var)
```

**output**

```bash
h
e
l
l
o
```

**Syntax**

```python
#                  ┌────────── sequence (string, list, range)
#                  │
for variable in sequence:
    print(variable)
```

If you want to check whether something exists in a sequence:

```python
string = "hello"

if 'o' in string:
    print("o exists in the string")

if 'x' in string:
    print("x exists in the string")
```

**output**

```bash
o exists in the string
```

Sequence = ordered collection  
Examples: string, list, range

- range()

Used to generate numbers

```python
#          ┌──────── max value (not included)
#          │
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
for i in range(5):
    print(i + 1)
```

**output**

```bash
1
2
3
4
5
```

>[!note]
>`range(5)` → starts from 0 and ends at 4 (5 not included)

- count characters

```python
word = "artificial Intelligence"
count = 0

for ch in word:
    if ch == 'i':
        count += 1

print("count of i =", count)
```

**output**

```bash
count of i = 3
```



>[!note] 
>- `for` loop works with sequences
>- `in` is used for iteration and checking
>- Always use `:` and proper indentation
Here’s your note cleaned, fixed, and expanded (keeping your style but making it clearer and more complete):

> [!question]  
> Write a program in Python to count vowels in a given string

```python
word = "artificial"
count = 0

for ch in word:
    if ch == 'a' or ch == 'e' or ch == 'i' or ch == 'o' or ch == 'u':
        count += 1

print("Total vowels =", count)
```

**output**

```bash
Total vowels = 5
```

>[!note] 
> - Vowels → `a, e, i, o, u`
> - Loop checks each character one by one

