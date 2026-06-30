---
date: 2026-03-12
tags:
  - codeforces
draft: true
---
[[Keywords CF Beta Round 1]]
### A. Theatre square

Link: https://codeforces.com/contest/1/problem/A

Theatre Square in the capital city of Berland has a rectangular shape with the size _n_ × _m_ meters. On the occasion of the city's anniversary, a decision was taken to pave the Square with square granite flagstones. Each flagstone is of the size _a_ × _a_.

What is the least number of flagstones needed to pave the Square? It's allowed to cover the surface larger than the Theatre Square, but the Square has to be covered. It's not allowed to break the flagstones. The sides of flagstones should be parallel to the sides of the Square.

*Input*

The input contains three positive integer numbers in the first line: _n_,  _m_ and _a_ (1 ≤  _n_, _m_, _a_ ≤ 109).

*Output*

Write the needed number of flagstones.

*Example*

Input

```
6 6 4
```

Output

```
6
```

---
#### Key Points to Understand & Solve the Problem

1. **Given**
    - Rectangle size: **n × m**
    - Tile size: **a × a**
2. **Goal**  
    Find the **minimum number of tiles** needed to cover the whole rectangle.
3. **Important Rules**
    - Tiles **cannot be broken**.
    - Tiles must stay **parallel to the square**.
    - Covering **extra area is allowed**, but the square must be fully covered.        
4. **Think in Two Directions**
    - Tiles needed for **length** → `ceil(n / a)`
    - Tiles needed for **width** → `ceil(m / a)`
5. **Multiply Them**
$$\left\lceil \frac{n}{a} \right\rceil \times \left\lceil \frac{m}{a} \right\rceil$$
6. **Programming Trick**  
    Instead of [[Ceiling]], use:
```
    (n + a - 1) / a
    (m + a - 1) / a
```
    
7. **Final Idea**
    
    tiles = ceil(n/a) * ceil(m/a)
---
*Solution C++:*
```cpp
#include <bits/stdc++.h>
using namespace std;
#define ll long long
// using ll = long long;

ll length_ceil(ll n, ll a)
{
    return ceil((double)n / a);
    // return (n + a - 1) / a
}

ll width_ceil(ll m, ll a)
{
    return ceil((double)m / a);
    // return (m + a - 1) / a
}

int main()
{
    ll n, m, a; // length, width, square(Length/width)
    cin >> n >> m >> a;
    cout << length_ceil(n, a) * width_ceil(m, a);
}

/*
#include<bits/stdc++.h>
using namespace std;
#define ll long long

int main(){
    ll n, m, a;
    cin >> n >> m >> a;

    ll x = (n + a - 1) / a;
    ll y = (m + a - 1) / a;

    cout << x * y;
}
*/
```

### B. Spreadsheets

Link: https://codeforces.com/contest/1/problem/B

In the popular spreadsheets systems (for example, in Excel) the following numeration of columns is used. The first column has number A, the second — number B, etc. till column 26 that is marked by Z. Then there are two-letter numbers: column 27 has number AA, 28 — AB, column 52 is marked by AZ. After ZZ there follow three-letter numbers, etc.

The rows are marked by integer numbers starting with 1. The cell name is the concatenation of the column and the row numbers. For example, BC23 is the name for the cell that is in column 55, row 23.

Sometimes another numeration system is used: RXCY, where X and Y are integer numbers, showing the column and the row numbers respectfully. For instance, R23C55 is the cell from the previous example.

Your task is to write a program that reads the given sequence of cell coordinates and produce each item written according to the rules of another numeration system.

Input
The first line of the input contains integer number n (1 ≤ n ≤ 105), the number of coordinates in the test. Then there follow n lines, each of them contains coordinates. All the coordinates are correct, there are no cells with the column and/or the row numbers larger than 106 .

Output
Write n lines, each line should contain a cell coordinates in the other numeration system.

Example

Input

```
2
R23C55
BC23
```

Output

```
BC23
R23C55
```

---
#### Key Points to Understand & Solve the Problem

1. **Two formats**

*Excel style*
```
BC23
```

- letters → column
- numbers → row  

*RXCY style*
```
R23C55
```

- number after **R** → row
- number after **C** → column

2. **Detect format**
    - If pattern is **RC** → RXCY 
    - Otherwise → Excel format
3. **RXCY → Excel**
    - Take **column number**
    - Convert it to **letters (base-26: A–Z)**
    - Output: `columnLetters + row`
4. **Excel → RXCY**
    - Separate **letters (column)** and **digits (row)**
    - Convert letters → **column number**
    - Output: `RrowCcolumn`

