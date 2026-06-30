---
draft: false
tags:
  - alml
date: 2026-04-11
author: xnocode
---
Used to make decisions in a program based on conditions.

- `if`

If the condition is `True`, the block will execute.

```python
age = 21

if age >= 18:
    print("you can vote")
```

**output**

```bash
you can vote
```

Syntax:

```python
if condition:
    print(" ")
```

>[!note]
>Indentation is required in Python to define the block.

- `if-else`

If the condition is `True`, `if` block runs  
If `False`, `else` block runs

```python
age = 12

if age >= 18:
    print("you can vote")
else:
    print("you cannot vote")
```

**output**

```bash
you cannot vote
```

Syntax:

```python
if condition:
    print(" ")   # runs if True
else:
    print(" ")   # runs if False
```

- `elif`

Used to check multiple conditions.

```python
marks = 75

if marks >= 90:
    print("Grade A")
elif marks >= 60:
    print("Grade B")
else:
    print("Grade C")
```

**output**

```bash
Grade B
```

Syntax:

```python
if condition1:
    print(" ")
elif condition2:
    print(" ")
else:
    print(" ")
```


>[!note] 
>  - Only one block will execute
>  - `elif` means "else if"
>  - Conditions are checked from top to bottom

> [!question]  
> Write a program in Python to check age category:
> 
> - `< 13` → child
>     
> - `13–18` → teenager
>     
> - `18+` → adult
>     

```python
age = int(input("enter age: "))

if age < 13:
    print("You are a child")
elif age >= 13 and age <= 18:
    print("You are a teenager")
else:
    print("You are an adult")
```

**output**

```bash
enter age: 14
You are a teenager
```

> [!question]  
> Write a program in Python to check username and password

```python
username = input("enter username: ")
password = input("enter password: ")

if username == "admin" and password == "pass":
    print("Login successful")
else:
    print("Invalid username or password")
```

**output**

```bash
enter username: admin
enter password: pass
Login successful
```

> [!question]  
> Write a program in Python to check if a number is a multiple of 5 or not

```python
num = int(input("enter a number: "))

if num % 5 == 0:
    print("Number is a multiple of 5")
else:
    print("Number is not a multiple of 5")
```

**output**

```bash
enter a number: 20
Number is a multiple of 5
```

> [!question]  
> Write a program in Python to check if a number is odd or even

```python
num = int(input("enter a number: "))

if num % 2 == 0:
    print("Number is even")
else:
    print("Number is odd")
```

**output**

```bash
enter a number: 7
Number is odd
```

<< [[Python User Input]] | [[Python Nesting]] >>