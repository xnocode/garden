---
draft: false
tags:
  - cpp
date: 2026-06-25
author: xnocode
---
A namespace is used to organize code and avoid naming conflicts. The standard C++ library is contained inside the `std` namespace.

```cpp
#include <iostream>
using namespace std;   // use the standard C++ namespace
int main() {
    cout << "Hello";
    return 0;
}
```

```text
Namespace
├── groups related code
├── prevents naming conflicts
└── std is the standard C++ namespace
```

The objects `cout`, `cin`, `endl`, etc. are defined in the `iostream` header file and belong to the `std` namespace.

Without `using namespace std;`, we must use the scope resolution operator `::`.

**example**

```cpp
#include <iostream>
int main() {
    std::cout << "xnocode";
    return 0;
}
```

**output**

```bash
xnocode
```

Explanation:

- `using namespace std;`
    - Allows us to use `cout`, `cin`, `endl`, etc. without writing `std::`.
        
- `std::cout`
    - `std` → namespace
    - `::` → scope resolution operator

Another Example

```cpp
#include <iostream>
int main() {
    std::cout << "* * * *" << std::endl;
    std::cout << "* * *" << std::endl;
    std::cout << "* *" << std::endl;
    std::cout << "*" << std::endl;
    return 0;
}
```

**output**

```bash
* * * *
* * *
* *
*
```

> [!note]  
> `cout` is declared in the `iostream` header file and belongs to the `std` namespace.
> 
> Without `using namespace std;`, we must write `std::cout`, `std::cin`, etc.