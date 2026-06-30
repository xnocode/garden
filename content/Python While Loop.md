---
draft: false
tags:
  - alml
date: 2026-04-11
author: xnocode
---
A `while` loop runs as long as the condition is `True`.

```python id="wl1"
# infinite loop
while True:
    print("hello world")
```

>[!note] 
>Do not create infinite loops unless needed — they will run forever (unstoppable).

>[!info] 
>In real life, infinite loops are used in systems like servers, games, etc.

> [!question]
> Write a program in Python to print "hello world" five times

```python id="wl1
count = 1 # iterator

while count <= 5:
    print("hello world")
    count += 1
```

**output**

```bash
hello world
hello world
hello world
hello world
hello world
```

**Dry Run Table**

| count | condition (count \<= 5) | output      |
| ----- | ----------------------- | ----------- |
| 1     | True                    | hello world |
| 2     | True                    | hello world |
| 3     | True                    | hello world |
| 4     | True                    | hello world |
| 5     | True                    | hello world |
| 6     | False                   | stop        |
The loop stops when the condition becomes `False`.

> [!question]  
> Write a program in Python to print numbers from 1 to 5

```python
count = 1

while count <= 5:
    print(count)
    count += 1
```

**output**

```bash
1
2
3
4
5
```

> [!question]  
> Write a program in Python to print numbers from 5 to 1

```python
count = 5

while count >= 1:
    print(count)
    count -= 1
```

**output**

```bash
5
4
3
2
1
```

>[!important] 
> - Most loops start from `0` (especially in programming)
> - Example: `range(0, n)`
> - But you can start from any number depending on your need
>

> [!question]  
> Write a program in Python to print the multiplication table of any number `n`

```python
n = int(input("enter a number: "))
i = 1

while i <= 10:
    print(n, "x", i, "=", n * i)
    i += 1
```

**output**

```bash
enter a number: 5
5 x 1 = 5
5 x 2 = 10
5 x 3 = 15
5 x 4 = 20
5 x 5 = 25
5 x 6 = 30
5 x 7 = 35
5 x 8 = 40
5 x 9 = 45
5 x 10 = 50
```

<< [[Python Loops]] | [[Python Break]] >>