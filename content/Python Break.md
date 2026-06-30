---
draft: false
tags:
  - alml
date: 2026-04-11
author: xnocode
---
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