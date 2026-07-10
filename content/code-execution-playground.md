---
title: "Code Execution Playground"
description: "Test the Judge0 code execution integration — run Python, JavaScript, C++, and more directly from the browser with input support."
draft: false
date: 2024-09-01
tags: [reference, code, playground]
---

This note tests the **Judge0 code execution** integration. Every runnable code block below has a **Run** button (visible on hover, top-right) that sends the code to `ce.judge0.com` and displays the output inline.

> [!tip] How to use
> 1. Hover any code block — a **▶ Run** button appears in the top-right.
> 2. Click the **input icon** to toggle a stdin input field (for programs that need input).
> 3. Click **Run** — the output appears below the code block with timing and memory stats.

## Python (no input needed)

```python
# A simple greeting program
names = ["Alice", "Bob", "Carol"]
for name in names:
    print(f"Hello, {name}! Welcome to the garden.")

# Some math
import math
print(f"\nπ ≈ {math.pi:.6f}")
print(f"e ≈ {math.e:.6f}")
print(f"2^10 = {2**10}")
```

## Python (with input)

Click the input icon to open the stdin field, type a number, then Run:

```python
# Read a number and compute its factorial
n = int(input("Enter a number: "))
result = 1
for i in range(1, n + 1):
    result *= i
print(f"{n}! = {result}")
```

## JavaScript (Node.js)

```javascript
// Fibonacci sequence
function fib(n) {
  let a = 0, b = 1;
  const seq = [];
  for (let i = 0; i < n; i++) {
    seq.push(a);
    [a, b] = [b, a + b];
  }
  return seq;
}

console.log("First 10 Fibonacci numbers:");
console.log(fib(10).join(", "));
```

## TypeScript

```typescript
// Type-safe greeting
interface Person {
  name: string;
  age: number;
}

const people: Person[] = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
];

people.forEach(p => console.log(`${p.name} is ${p.age} years old`));
```

## C++

```cpp
#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    std::vector<int> nums = {5, 2, 8, 1, 9, 3, 7, 4, 6};
    std::sort(nums.begin(), nums.end());
    
    std::cout << "Sorted numbers: ";
    for (int n : nums) std::cout << n << " ";
    std::cout << std::endl;
    
    int sum = 0;
    for (int n : nums) sum += n;
    std::cout << "Sum: " << sum << std::endl;
    std::cout << "Average: " << (double)sum / nums.size() << std::endl;
    
    return 0;
}
```

## Rust

```rust
fn main() {
    let message = "Hello from Rust!";
    println!("{}", message);
    
    // Simple computation
    let numbers: Vec<i32> = (1..=10).collect();
    let sum: i32 = numbers.iter().sum();
    println!("Sum of 1 to 10: {}", sum);
    println!("Numbers: {:?}", numbers);
}
```

## Go

```go
package main

import (
    "fmt"
    "strings"
)

func main() {
    words := []string{"hello", "from", "go"}
    fmt.Println(strings.Join(words, " "))
    
    // FizzBuzz
    for i := 1; i <= 15; i++ {
        if i%15 == 0 {
            fmt.Println("FizzBuzz")
        } else if i%3 == 0 {
            fmt.Println("Fizz")
        } else if i%5 == 0 {
            fmt.Println("Buzz")
        } else {
            fmt.Println(i)
        }
    }
}
```

## With Input (Python)

Try entering multiple lines of input:

```python
# Read multiple lines until empty
lines = []
while True:
    try:
        line = input()
        if not line:
            break
        lines.append(line)
    except EOFError:
        break

print(f"\nYou entered {len(lines)} lines:")
for i, line in enumerate(lines, 1):
    print(f"  {i}. {line}")
```

> [!info] Supported languages
> Python, JavaScript, TypeScript, C, C++, Java, Go, Rust, Ruby, PHP, Swift, Kotlin, Scala, Lua, Bash, SQL, Dart, Elixir, Clojure, Haskell, Perl, R, C#, and more — all via the Judge0 CE API.

See [[Callouts Reference]], [[Math and LaTeX]], [[Mermaid Diagrams]] for other rendering features.
