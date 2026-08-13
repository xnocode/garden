---
title: CSE0613208 | Internet Programming Lab
description: Notes from my university Internet Programming Lab course.
author: Ridoy
draft: false
date: 2026-07-23
tags:
  - university
prev: ""
next: ""
aliases:
  - class notes
updatedAt: 2026-08-13
---
> **Date:** 23 July 2026
# Lecture 01

| Project Proposal | After Mid-Term |
| ---------------- | -------------- |
| JavaScript       | Mid-Term       |
| PHP              | Term-Final     |

> [!todo] todo
> **HTML & CSS**
> > - Review all fundamentals before the next class.
> > - The faculty will evaluate our progress with a short test.

> **Date:** 30 July 2026

## Lecture 2

-  JavaScript Basics

> Date: 06 August 2026

## Lecture 3

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <button onclick="change()">Change Text</button>
    <input type="text" id="value" placeholder="Enter your name">
    <button onclick="showText()">Submit</button>
    <p id="result"></p>
    <br>
    <input type="number" id="num1" placeholder="First Number">
    <input type="number" id="num2" placeholder="Second Number">
    <button onclick="sum()">Sum</button>
    <p id="sum"></p>
    <script src="script.js"></script>
</body>
</html>
```

```js
function change(){
    let l = document.getElementById("result");
    l.innerHTML = "xnocode";
    l.style.color = "white";
    l.style.backgroundColor = "grey";
}
function showText(){
    let text = document.getElementById("value").value;
    document.getElementById("result").innerHTML = text;
}
function sum(){
    let a = Number(document.getElementById("num1").value);
    let b = Number(document.getElementById("num2").value);
    document.getElementById("sum").innerHTML = "Sum = " + (a + b);
}
```

> Date: 13 August 2026
## Lecture 4 

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=>, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <form id="regForm">
        <input type="text" placeholder="Student Name" id="name"><br><br>
        <input type="number" placeholder="Mobile No:" id="mobile"><br><br>
        <input type="email" placeholder="Email" id="email"><br><br>
        <input type="text" placeholder="Department" id="dept"><br><br>
        <button type="submit"> Submit </button>
    </form>
    <br>
    <br>
<table border="1">
    <thead>
    <tr>
        <th>Student Name</th>
        <th>Mobile No:</th>
        <th>Email</th>
        <th>Department</th>
    </tr>
</thead>
<tbody id="tbody">

</tbody>
</table>
<script src="script.js"></script>
</body>
</html>
```

```js
const form=document.getElementById("regForm")
const tbody=document.getElementById("tbody")
form.addEventListener("submit",function(event){
    event.preventDefault()
    const name=document.getElementById("name").value
    const mobile=document.getElementById("mobile").value
    const email=document.getElementById("email").value
    const dept=document.getElementById("dept").value
    if(name===""&&mobile==="" &&email===""&& dept===""){
        alert("All fields are required")
    }
    else if(name===""||mobile==="" ||email===""|| dept===""){
        alert("All fields are required");
    }
    else{
        const row = document.createElement("tr")
        const namedata = document.createElement("td")
        const mobiledata = document.createElement("td")
        const emaildata = document.createElement("td")
        const deptdata = document.createElement("td")

        namedata.textContent=name
        mobiledata.textContent=mobile
        emaildata.textContent=email
        deptdata.textContent=dept

        row.appendChild(namedata)
        row.appendChild(mobiledata)
        row.appendChild(emaildata)
        row.appendChild(deptdata)
        tbody.appendChild(row)
    }
})
```

