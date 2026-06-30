---
draft: false
tags:
  - cpp
date: 2026-06-26
author: xnocode
---
The assignment operator (=) copies the value from right to left.

example

```cpp
int a = 5;
int b = 10;

a = b;
```

After assignment:

```text
a = 10
b = 10
```

Because the value of `b` is copied into `a`.