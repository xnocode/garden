---
draft: false
tags:
  - alml
date: 2026-04-11
author: xnocode
---
> [!question]  
> Write a program that asks the user for their name and age, then prints:  
> Hello xnocode, you are 21 years old!

```python
user = input()
age = int(input())
print("Hello ",user,", you are ",age,"years old!")
```

**output**

```bash
xnocode
21
Hello  xnocode , you are  21 years old!
```

> [!question]  
> Take two numbers as input from the user and print their:
> 
> - sum
>     
> - difference
>     
> - product
>     
> - quotient
>     

```python
a = float(input("enter 1st number: "))
b = float(input("enter 2nd number: "))

sum = a + b
difference = a - b
product = a * b
quotient = a / b

print("sum:", sum)
print("difference:", difference)
print("product:", product)
print("quotient:", quotient)
```

**output**
```bash
enter 1st number: 10
enter 2nd number: 5
sum: 15.0
difference: 5.0
product: 50.0
quotient: 2.0
```

> [!question]  
> Ask the user to enter two integers and one float.  
> Convert all values to float and print their average.

```python
a = int(input("enter 1st integer: "))
b = int(input("enter 2nd integer: "))
c = float(input("enter a float: "))

avg = (float(a) + float(b) + float(c)) / 3

print("average:", avg)
```

**output**

```bash
enter 1st integer: 10
enter 2nd integer: 20
enter a float: 30.5
average: 20.166666666666668
```

> [!question]  
> The user enters a string containing a number (e.g., `"45"`).  
> Convert it to:
> 
> - integer
>     
> - float
>     
> - string again  
>     Print all values with their types.
>     

```python
value = input("enter a number: ")

int_val = int(value)
float_val = float(value)
str_val = str(value)

print(int_val, type(int_val))
print(float_val, type(float_val))
print(str_val, type(str_val))
```
**output**

```bash
enter a number: 45
45 <class 'int'>
45.0 <class 'float'>
45 <class 'str'>
```

> [!question]  
> Evaluate the expression:  
> `x = 10 + 3 * 2 ** 2`  
> Print the result and explain why the output is correct based on operator precedence.

```python
x = 10 + 3 * 2 ** 2
print(x)
```

**output**

```bash
22
```

>[!note]  
>`2**2 = 4 → 3*4 = 12 → 10+12 = 22`


> [!question]  
> Write a program to swap values of two numbers entered by the user.

```python
a = int(input("enter a: "))
b = int(input("enter b: "))

a, b = b, a

print("a:", a)
print("b:", b)
```

**output**

```bash
enter a: 5
enter b: 10
a: 10
b: 5
```

> [!question]  
> Ask the user for temperature in Celsius (string input).  
> Convert it to float and calculate Fahrenheit.

Formula:  
`FahrenheitTemp = (CelsiusTemp * (9/5)) + 32`

```python
c = float(input("enter temperature in Celsius: "))

f = (c * (9/5)) + 32

print("Fahrenheit:", f)
```

**output**

```bash
enter temperature in Celsius: 25
Fahrenheit: 77.0
```

> [!question]  
> Take the radius (`r`) as input and print the area.

Formula:  
`Area = 3.14 * r ** 2`

```python
r = float(input("enter radius: "))

area = 3.14 * r ** 2

print("Area:", area)
```

**output**

```bash
enter radius: 2
Area: 12.56
```

> [!question]  
> Ask the user for Principal (P), Rate (R), Time (T).  
> Convert all to float and compute Simple Interest.

Formula:  
`SI = (P * R * T) / 100`

```python
p = float(input("enter principal: "))
r = float(input("enter rate: "))
t = float(input("enter time: "))

si = (p * r * t) / 100

print("Simple Interest:", si)
```

**output**

```bash
enter principal: 1000
enter rate: 5
enter time: 2
Simple Interest: 100.0
```

> [!question]  
> Take a decimal number as input (e.g., `45.78`) and print:
> 
> - integer part → `45`
>     
> - fractional part → `.78`
>     

```python
num = float(input("enter a number: "))

int_part = int(num)
frac_part = num - int_part

print("integer part:", int_part)
print("fractional part:", frac_part)
```

**output**

```bash
enter a number: 45.78
integer part: 45
fractional part: 0.7800000000000011
```
