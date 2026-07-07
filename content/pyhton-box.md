---
title: "pyhton-box"
description:
draft: true
date: "2026-07-07"
tags: []
prev: ""
next: ""
aliases:
---

## Python Character Set

- Letters: A - Z, a - z
- Digits: 0 - 9
- Special symbols: +,-, * ,/,% etc.
- Whitespaces: blank space, tab, newline etc.
- all **ASCII** & **Unicode** chars as part of data & literals

<<[[First Python Program]] | [[Python Variables]] >>

Variables are like containers where we can store data.

**example**

```python
name = "xnocode"
age = 24
PI = 3.1416
```

|variable|data|
|---|---|
|name|xnocode|
|age|24|
|PI|3.1416|

Inside memory, it stores data like this.

**file:** `variables.py`

```python
name = "xnocode"
age = 25
PI = 3.1416

print(name)

print(name, age, PI)

print("my name is:", name)

print("my age is:", age)

print("my age is:", age - 5)
```

**output**

```bash
xnocode
xnocode 25 3.1416
my name is: xnocode
my age is: 25
my age is: 20
```

Before moving forward, it's important to understand indentation and case sensitivity in Python → [[Python Indentation]] | [[Python Case-Sensitive]]


<< [[Python Character Set]] | [[Python Indentation]] >>

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

Identifiers are the names used to identify variables.
#### rules of identifiers

1. You can start with English letters `A-Z` or `a-z`
    
2. You cannot start variables with digits `0-9`
    
3. You can use `_` (underscore), and you can also start a variable name with `_`
    

**example**

**file:** `7_identifiers.py`

```python
_name = "xnocode"
_age = 25
_PI = 3.1416

print(_name, _age, _PI)
```

**output**

```bash
xnocode 25 3.1416
```

Here → `_name`, `_age`, `_PI` ← identifiers

>[!note]
>Good programmers use meaningful variable names so the code is easy to understand.

<< [[Python Indentation]] | [[Python Case-Sensitive]] >>

Python is a case-sensitive language. This means uppercase and lowercase letters are treated as different.

**file:** `8_case-sensitive.py`

```python
name = "xnocode"
Name = "python"

print(name)
print(Name)
```

**output**

```bash
xnocode
python
```

Here, `name` and `Name` are different variables.

<< [[Python Identifiers]] | [[Python Data Types]] >>

These are the fundamental data types in Python:

- Integer → positive, negative, and zero values
    
- String → `' '` , `" "` , `''' '''`
    
- Float → decimal numbers → example: `3.14`, `9.99`
    
- Boolean → `True`, `False`
    
- None → represents no value
    

**file:** `9_data_types.py`

```python
age = 25          # Integer
price = 9.99      # Float
name = "xnocode"  # String
is_active = True  # Boolean
data = None       # None
```

>[!note] 
>Python is case-sensitive, so `True` and `False` must start with capital letters.

<< [[Python Case-Sensitive]] | [[Python type() Function]] >>

We can check the data type of a variable using the `type()` function.

**file:** `10_type_function.py`

```python
name = "xnocode"
age = 35
PI = 3.14

isPrime = True
isNone = None

print(type(PI))
print(type(name))
print(type(age))
print(type(isPrime))
print(type(isNone))
```

**output**

```bash
<class 'float'>
<class 'str'>
<class 'int'>
<class 'bool'>
<class 'NoneType'>
```


>[!note]
>`type()` returns the data type of a variable.

<< [[Python Data Types]] | [[Python Keywords]] >>

These are the keywords in Python.

| Keyword | Keyword | Keyword  | Keyword |
| ------- | ------- | -------- | ------- |
| False   | None    | True     | and     |
| as      | assert  | async    | await   |
| break   | class   | continue | def     |
| del     | elif    | else     | except  |
| finally | for     | from     | global  |
| if      | import  | in       | is      |
| lambda  | match   | nonlocal | not     |
| while   | with    | yield    | case    |
| or      | pass    | raise    | return  |
| try     |         |          |         |

>[!note]  
>These are called **reserved keywords**, and they cannot be used as identifiers (variable names).

<< [[Python type() Function]] | [[Python Comments]] >>

Comments are used to understand the code later or to leave messages in the code.

There are two types of comments:

1. Single-line comment
    
2. Multi-line comment
    

**file:** `11_comments.py`

```python
# single-line comment

# This is also a multi-line comment style using multiple #

"""
This is a multi-line string
often used as a multi-line comment
"""
```


>[!note] 
>Python officially supports single-line comments using `#`.  
Multi-line comments are usually written using multiple `#` or triple quotes (`""" """`).

<< [[Python Keywords]] | [[Python Style Guide]] >>

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

Operators are used to perform operations on variables and values.

There are different types of operators:

```python
Arithmetic --> +, -, *, /, //, %, **
Relational / Comparison --> = =,! =, >, <, > =, < =
Assignment --> =, +=, -=, *=, /=
Logical --> and, or, not
```

**example**

```python
sum = a + b
```

```
sum = a + b
    |   | |
    |   | └── operand
    |   └──── operator (+)
    └────────── assignment operator (=)
```


<< [[Python Style Guide]] | [[Python Arithmetic Operators]] >>

file : 

```python
a = 10
b = 5

print(a + b)
print(a - b)
print(a * b)
print(a / b)
print(a // b)
print(a ** b)
print(a % b)
```

**output**

```bash
15
5
50
2.0
2
100000
0
```


`//` is used for integer (floor) division

`%` → modulus operator (it gives the remainder)

`a ** b` → power operator (a raised to the power of b)


>[!attention] 
>`^` is not a power operator in Python. It is a bitwise operator.

> [!question]  
> Write a program in Python to find the sum of two numbers

**file:** `sum_of_two_numbers.py`

```python
a = 10
b = 20

sum = a + b
print("Sum of two numbers:", sum)
```

**output**

```bash
Sum of two numbers: 30
```

<< [[Python Operators]] | [[Python Relational or Comparison]] >>

```python
a == b
```

→ checks if both values are equal

If true → returns `True`  
If false → returns `False`

file

```python
a = 10
b = 5

print(a > b)
print(a < b)
print(a <= b)
print(a >= b)
print(a != b)
print(a == b)
```

**output**

```bash
True
False
False
True
True
False
```


>[!attention] 
>Comparison operators always return a Boolean value (`True` or `False`).

<< [[Python Arithmetic Operators]] | [[Python Assignment Operators]] >>

```text
a = b
|   |
|   └── value
└────── variable

→ assign value to a variable
```

**example**

```python
a = 10

a += 5   # a = a + 5 ---> # a = 10 + 5 = 15
a -= 2   # a = a - 2 ---> # a = 15 - 2 = 13
a *= 3   # a = a * 3 ---> # a = 13 * 3 = 39
a /= 2   # a = a / 2 ---> # a = 39 / 2 = 19.5

print(a)
```

**output**

```bash
19.5
```

>[!attention] 
> +=  → add and assign 
> -=  → subtract and assign
> *=  → multiply and assign
> /=  → divide and assign
> %=  → modulus and assign
> **= → power and assign

>[!note] 
>Assignment operators are used to update the value of a variable.

<< [[Python Relational or Comparison]] | [[Python Logical Operator]] >>

1. `not` → used to get the opposite value
    
| Input | Output |
| ----- | ------ |
| True  | False  |
| False | True   |

2. `and` → returns `True` only if both values are `True`
    

|Input 1|Input 2|Output|
|---|---|---|
|True|True|True|
|False|True|False|
|True|False|False|
|False|False|False|


3. `or` → returns `True` if at least one value is `True`
    

|Input 1|Input 2|Output|
|---|---|---|
|True|True|True|
|False|True|True|
|True|False|True|
|False|False|False|

**example**

```python
a = True
b = False

print(not a)
print(a and b)
print(a or b)
```

**output**

```bash
False
False
True
```

<< [[Python Assignment Operators]] | [[Python Operator Precedence]] >>

Operator Precedence** → priority of operators (which runs first)

Order of execution:

1. `()` → highest priority
    
2. `**` → power
    
3. `*`, `/`, `%`
    
4. `+`, `-`
    
5. \==, !=, >, > =, <, \>=
    
6. `not`
    
7. `and`
    
8. `or` → lowest priority
    

**example**

```python
result = 10 + 5 * 2
print(result)   # 10 + (5*2) = 10 + 10 = 20

result = (10 + 5) * 2
print(result)   # (10+5) * 2 = 15 * 2 = 30

result = 2 ** 3 * 2
print(result)   # (2**3) * 2 = 8 * 2 = 16

result = True or False and False
print(result)   # True or (False and False) = True
```

**output**

```bash
20
30
16
True
```

>[!note] 
> - `()` can change the priority
> - `and` runs before `or`
> - Always use `()` if you want clear and predictable results

<< [[Python Logical Operator]] | [[Python Type Conversion]] >>

```text
Type Conversion
├── Implicit  → automatic
└── Explicit  → manual (type casting)
```

Type Conversion (implicit) → Python automatically converts one data type to another

```python
ans = 5 + 10.0
print(ans, type(ans))   # int → float
```

**output**

```bash
15.0 <class 'float'>
```


>[!important] 
>Python converts smaller type to bigger type `int → float`

Type Casting (explicit) → done manually by the developer

We use functions like `int()`, `float()`, `str()`

```python
ans = int(5 + 10.0)
print(ans, type(ans))
```

**output**

```bash
15 <class 'int'>
```


>[!attention] 
> - Type casting works only with compatible data types
> - In implicit conversion, Python decides
> - In explicit casting, the developer controls the type

<< [[Python Operator Precedence]] | [[Python User Input]] >>

`input()` → used to take input from the user

By default, input values are stored as `string`

**example**

```python
a = input("enter the value of a: ")
print(a)

username = input("enter your name: ")
print("Welcome!", username)
```

>[!question] 
>Write a program in Python to find the sum of two numbers

```python
a = input("enter a number: ")
b = input("enter a number: ")

sum = a + b
print("Sum of two numbers:", sum)
```

**output**

```bash
enter a number: 5
enter a number: 10
Sum of two numbers: 510
```

Reason:  
Both `a` and `b` are strings, so `+` joins them (concatenation)


We need type casting to convert input into numbers

```python
a = int(input("enter a number: "))
b = int(input("enter a number: "))

sum = a + b
print("Sum of two numbers:", sum)
```

**output**

```bash
enter a number: 5
enter a number: 10
Sum of two numbers: 15
```

>[!note]
>Always convert input to the correct data type when working with numbers.


>[!question] 
>Write a program in Python to find the average of two numbers.

```python
a = float(input("enter 1st number: "))
b = float(input("enter 2nd number: "))
avg = (a+b)/2
print("avg of two numbers: ", avg)
```

**output**

```bash
enter 1st number: 8
enter 2nd number: 4
avg of two numbers: 6.0
```

<< [[Python Type Conversion]] | [[Python Conditional Statements]] >>

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

Nesting means writing one conditional statement inside another.

example

```python
age = 20
has_id = True

if age >= 18:
    if has_id:
        print("You can vote")
    else:
        print("You need an ID")
else:
    print("You are underage")
```

**output**

```bash
You can vote
```

Syntax:

```python
if condition1:
    if condition2:
        print(" ")
```

> [!important] 
> - Inner `if` runs only if outer `if` is `True`
> - Use proper indentation
> - Avoid too much nesting (makes code hard to read)

<< [[Python Conditional Statements]] | [[Python Match Case]] >>

Used to match a value against multiple conditions (similar to switch case).

example

```python
day = 3

match day:
    case 1:
        print("Monday")
    case 2:
        print("Tuesday")
    case 3:
        print("Wednesday")
    case _:
        print("Invalid day")
```

**output**

```bash
Wednesday
```

Syntax

```python
match variable:
    case value1:
        print(" ")
    case value2:
        print(" ")
    case _:
        print("default")
```

>[!important]
> - `match` checks the value
> - `case` defines conditions
> - `_` is used as default (like else)
> - Available in Python 3.10+

<< [[Python Nesting]] | [[Python Loops]] >>

Loops are used when we want to perform a task again and again.

Suppose you need to print "hello world" five times:

```python
print("hello world")
print("hello world")
print("hello world")
print("hello world")
print("hello world")
```

But if you need to print it 100 times, it becomes problematic and repetitive. So we use loops to solve this.

```text
Loops
├── for loop
└── while loop
```

>[!note] 
>Loops help reduce repetition and make code cleaner and shorter.

<< [[Python Match Case]] | [[Python While Loop]] >>

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

`break` is used to stop the loop immediately.

**example**

```python
i = 1

while i <= 5:
    if i == 3:
        break
    print(i)
    i += 1
```

**output**

```bash
1
2
```

>[!note] 
> - `break` exits the loop immediately
> - Loop stops even if the condition is still `True`

<< [[Python While Loop]] | [[Python Continue]] >>

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
Functions are blocks of statements that perform a specific task.

```text
Function has two parts
|---- Definition → where we write logic
|---- Call → where we use (invoke) it

Write once → reuse many times
```

- function definition

```python
def function_name():
    # multiple statements
```

example

```python
def hello():
    print("hello")

hello()   # function call
```

**output**

```bash
hello
```

>[!note] 
>After defining a function, we must call it to use it.
>

```text
Function Types
|---- User-defined → created by user
|---- Built-in → already available

Built-in examples:
print(), input(), type(), range()
```

```python
def sum(a, b):   # parameters
    s = a + b
    return s

# function call
ans = sum(3, 4)   # arguments

print(ans)
```

**output**

```bash
7
```

>[!note] 
> - Parameters → variables in function definition
> - Arguments → values passed during function call

> [!question]  
> Define a function in Python to calculate average

```python
def avg(a, b, c):
    return (a + b + c) / 3

result = avg(10, 20, 30)
print("average =", result)
```

**output**

```bash
average = 20.0
```

- default parameters

```python
def sum(a, b=1):
    return a + b

print(sum(5))
```

**output**

```bash
6
```


>[!note] 
> - Default parameter → already has a value  
> - Non-default must come before default
> - ✔ Correct: `def sum(a, b=1)`  
> - ❌ Wrong: `def sum(a=1, b)`

> [!question]  
> Write a function in Python to print factorial of `n`

```python
def cal_factorial(n):
    fact = 1
    for i in range(1, n + 1):
        fact *= i
    return fact

n = int(input("enter n: "))
print(cal_factorial(n))
```

**output**

```bash
enter n: 5
120
```

> [!note] 
> - Factorial → `n! = n × (n-1) × ... × 1`
> - `0! = 1`

Used for small one-line functions

```python
sum = lambda a, b: a + b

print(sum(4, 5))
```

**output**

```bash
9
```


>[!note] 
> - No `def` keyword
> - Only one expression

A higher-order function is a function that:

- takes another function as input
    
- or returns a function
    

```text
Higher-Order Function
├── takes function as argument
└── returns a function
```

example (function as argument)

```python
def greet(func):
    func()

def say_hello():
    print("hello")

greet(say_hello)
```

**output**

```bash
hello
```

example (function returning function)

```python
def outer():
    def inner():
        print("inside function")
    return inner

func = outer()
func()
```

**output**

```bash
inside function
```

real use example

```python
def apply(func, value):
    return func(value)

def square(x):
    return x * x

print(apply(square, 5))
```

**output**

```bash
25
```

> [!note] 
> - Functions can be treated like variables
> - We can pass functions as arguments
> - Used in advanced concepts like map(), filter(), reduce()

A string is a sequence of characters.

```python
name = "xnocode"
msg = 'hello'
text = '''multi-line string'''
```

>[!note] 
> - Strings can be written using `' '`, `" "`, or `''' '''`
> - Strings are immutable (cannot be changed)  

```python
text = "hello"

print(text[0:3])
print(text[1:4])
print(text[0:])
```

**output**

```bash
hel
ell
hello
```

```text
text[start idx:end idx] → end idx not included
```


```python
text = "hello"

print(text[0])
print(text[1])
```

**output**

```bash
h
e
```

```text
Index:
h  e  l  l  o
0  1  2  3  4
```

- negative indexing

```python
text = "hello"

print(text[-1])
print(text[-2])
```

output

```bash
o
l
```

```text
Negative Index:
h   e   l   l   o
-5 -4  -3  -2  -1
```

```python
a = "hello"
b = "world"

print(a + b)   # concatenation
print(a * 3)   # repetition
```

**output**

```bash
helloworld
hellohellohello
```

```python
text = "hello"

print('h' in text)
print('x' in text)
```

**output**

```bash
True
False
```

```python
text = "hello"
print(len(text))
```

**output**

```bash
5
```


>[!note] 
> - Strings are iterable (can loop through)
> - Use for loop to access characters

String formatting is used to insert values into a string.

- using comma

```python
name = "xnocode"
age = 25

print("My name is", name, "and age is", age)
```

**output**

```bash
My name is xnocode and age is 25
```

-  using `+` operator

```python
name = "xnocode"

print("Hello " + name)
```


>[!note] 
> - Works only with strings    
> - Need type conversion for numbers


```python
name = "xnocode"
age = 25

print(f"My name is {name} and age is {age}")
```

**output**

```bash
My name is xnocode and age is 25
```

```text
f-string syntax:
f"text {variable}"

```python
name = "xnocode"
age = 25

print("My name is {} and age is {}".format(name, age))
```

**output**

```bash
My name is xnocode and age is 25
```

>[!Note]
> - f-string is fastest and easiest
> - format() is older method
> - Use f-string in modern Python

- Index-Based Formatting

Used to insert values into specific positions using indexes.

example

```python
name = "xnocode"
age = 25

print("My name is {0} and age is {1}".format(name, age))
```

**output**

```bash
My name is xnocode and age is 25
```

- changing order

```python
name = "xnocode"
age = 25

print("Age is {1} and name is {0}".format(name, age))
```

**output**

```bash
Age is 25 and name is xnocode
```

```text
Syntax:
"{index}".format(values)
```


>[!note] 
> - Index starts from 0
> - You can reuse values multiple times
> - Useful when order needs to change

- Value-Based Formatting

Used to insert values using names (keys) instead of index.

example

```python
name = "xnocode"
age = 25

print("My name is {name} and age is {age}".format(name=name, age=age))
```

**output**

```bash
My name is xnocode and age is 25
```

- different order

```python
name = "xnocode"
age = 25

print("Age is {age} and name is {name}".format(name=name, age=age))
```

**output**

```bash
Age is 25 and name is xnocode
```

```text
Syntax:
"{key}".format(key=value)
```

>[!note] 
>- More readable than index-based
>- Order does not matter
>- Recommended when multiple values are used

