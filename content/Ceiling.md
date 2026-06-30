---
date: 2026-03-12
draft: true
tags:
  - cp-math
---
**Ceiling (⌈x⌉)**: round **up** to the nearest integer.
Examples:

* ⌈2.1⌉ = 3
* ⌈2.9⌉ = 3
* ⌈5⌉ = 5

**Rule:** result is **≥ x** and an **integer**.

If we **do not use the ceiling function**, we can compute the same result using a simple formula.

Instead of  
$$
\left\lceil \frac{n}{a} \right\rceil  
$$
use
$$ 
\frac{n + a - 1}{a}  
$$
**Idea:** adding **(a-1)** ensures the division rounds **up** automatically when there is a remainder.

**Example**

n = 6, a = 4

$$\frac{6+4-1}{4} = \frac{9}{4} = 2 $$

So it gives the same result as **ceil(6/4)**.

```cpp
cout << ceil(x) << endl;

cout << ceil(2.3) << endl; // 3  
cout << ceil(1.1) << endl; // 2  
cout << ceil(4.7) << endl; // 5  
cout << ceil(5.0) << endl; // 5  
cout << ceil(-2.3) << endl; // -2
```

