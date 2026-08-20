---
title: JavaScript
description: ""
author: Ridoy
visibility: public
date: 2026-08-15
updatedAt: 2026-08-19
tags: []
series: JavaScript
seriesOrder: 1
---
I am going to learn JavaScript. So, I am going to follow a course from Youtube. It will be help me learn structurly.

What is JavaScript?
A technology that we use to create website.
- giving instructions to a computer
- the computer follows our instructions

To create a website we use 3 Technology
1. html
2. css
3. JavaScript

setup
1. Install web browser . example Chrome

Let's start

print
If you want to print something on the screen. You can use `alert('');`

here is some example

```JavaScript
alert('hello');
alert('Good job!!');
alert(2 + 2);
alert(10-3);
```


JavaScript is case-sensitive. 

We use JavaScript to modify the webpage.
```js
document.body.innerHTML = 'xnocode'
```

This code actually remove everything from the web page and replace it with text hello. So, modify the website, we can use JavaScript. It's a important features.

Now let's learn about more about JavaScript.

- syntax is like a rules we have to follow when using a programming languae. In programming we have to follow it no matter what.

JavaScript have some much syntax. We will be learn my practice


Lesson 1 exercises - JavaScript Basic
---
Note: do these ecercises in the console (right-click>inspect>console)
Note2: if you try to copy paste code in the console, you might get a warning, saying pasting is disabled. To fixed this, type `allow pasting` in the console and press enter.

1. Use alert( );to display 'Good Morning' in a popup.

```js
alert('Good Morning!');
```

2. Display your name in a popup.

```js
alert('Good Morning!');
```

3. Using math, calculate 10 + 5 in the console.

```js
alert(10 + 5);
```

4. Calculate 20 - 5 in the console.

```js
alert(20 - 5);
```

5. Calculate 2 + 2 - 5 in the console.

```js
alert(2 + 2 - 5);
```

6. Use `document.body.innerHTML = ...;` to display `Good Morning!` on the web page.

```js
document.body.innerHTML = 'Good Morning!';
```

7. Display your name on the web page.

```js
document.body.innerHTML = 'xnocode';
```

Challenge Exercises
-------
1. You order a T-shirt for $10, socks for $8, and dinner plates for $20. Use JavaScript to calculate the total cost of your order.

```js
10 + 8 + 20
```

2. Your bank account has $100, you spend $20 on lunch, $50 on dinner, and earn $200 from your job. Calculate how much money you have.

```js
100 - 20 - 50 + 200
```

3. Use `document.body.innerHTML = ...;` to make the web page blank.

```js
document.body.innerHTML = 'Good Morning!';
```


### Lesson 2 : Numbers and math

```js
10 + 5
```

```js
44 - 6
```

```js
2 * 4
```

```js
10 / 2
```

```js
2.2 + 2.2
```

```js
10.90 * 2 + 20.95
```

Order of operations
 2 + 2  
 2 - 3
 10 * 3
 10 / 2
here the character are operators

In the math multiply and divide done first then plus and minus done.
Multiple and Divide have same priority
Plus and minus have same priority
So if got them together we have to work left to right.


we can also use brackets to make sure which will be work first. `( )`


```js
1 + 1 * 3
```

```js
(1 + 1) * 3
```

Syntax rules for brackets

We always have to make sure brackets have closed and opened brackets

Inside the brackets we must have to use proper calculation equation.

How to calulate 36.95 * 10% in the JavaScript. We have to do it manually.

1% means 1/100; here 1 is per, 100 is cent
10% means 10/100 = 0.1 

Suppose our product price is 36.93 & task is 10% then total price will be?

```js
%%javascript
alert(36.94 + 36.94 * 0.1)
```

More details in JavaScript

- In programming 
		-  2, 3, 4 integers
		- 2.2, 2.5 floating point numbers
Computers have problems working with floats.

You know computer only store 0 and 1
 where humans are count from 0 to 9
Humans write decimal numbers and computer store binary numbers

Suppose you are going to buy basket ball and a t-shirt. Prices are 20.95 and 7.99

20.95 + 7.99

in JavaScript, it's equal to 28.939999999999998

So how to avoid this problem. because it create in accurecy

Calculations with floats are sometimes inaccurate.
When working with money
1. Do the calculation in cents
2. Convert back to dollars

```js
(2095 + 799) / 100
```

Now it give us right value 28.94

How to round a number?

```js
Math.round(2.2)
```

It will give us 2

```js
Math.round(2.8)
```

It will give us 3

If you cannot paste something in the chrome console then you just have to type `allow pasting`

```js
alert(Math.round((2095 + 799) * 0.1)/100);
```

How to learn new concepts about JavaScript.

You can search google to learn

Lesson 2 Exercises Number and Math
---
Note: do this exercise in the console (right-click>inspect>console)

2 (a). At a restaurant you order 1 soup for $10, 3 burgers for $8 each and 1 ice cream for $5. Use JavaScript to calculate the cost of the order.
