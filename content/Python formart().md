---
draft: false
tags:
  - alml
date: 2026-04-16
author: xnocode
---
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

