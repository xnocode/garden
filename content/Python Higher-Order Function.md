---
draft: false
tags:
  - alml
date: 2026-04-14
author: xnocode
---
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

