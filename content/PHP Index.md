---
draft: true
tags:
  - php
date: 05.09.2026
author: xnocode
---
```text
P= PHP
H = HYPERTEXT
P = PREPROCESSOR
```

#### How does PHP work?

```text

    web browser               web server                    database

    ┌──────────┐   http    ┌──────────────┐    SQL     ┌──────────────┐    
    │          │  request  │              │   query    │              │   
    │  Browser │  ───────▶ │     PHP      │  ───────▶  │     MySQL    │   
    │          │ ◀───────  │  Web Server  │ ◀───────   │              │   
    └──────────┘   http    └──────────────┘   SQL      └──────────────┘
                  response                  response                         

```

How to setup to connected them: (basic)
```text
C:\xampp\htdocs\create_folder
```
* without any config (localhost)
* server run : http://localhost/create_folder/

```php
<?php
    echo "Hello World!";
    echo "This is a simple PHP script.";
    // this is a comment in PHP
    /* This is a multi-line comment in PHP.
        It can span multiple lines. */
?>
// type ! then press enter
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <button> Click Here! </button>
</body>
</html>
```

- Variables and data types

```pHP
<?php
    //variables and data types
    
    //string
    $name = "xnocode";
    $enjoy = "coding";
    $email = "fake@example.com";
    
    echo $name . "<br>";
    echo "Hello {$name} <br>";
    echo "I enjoy {$enjoy} <br>";
    echo "Your email is {$email} <br>";
    
    //integer
    $age = 100;
    
    echo "You are {$age} years old <br>";
    
    //float
    $gpa = 3.5;
    $price = 9.99;
    $tax = 0.07;
    
    echo "The price is \${$price} <br>";
    echo "Your GPA is {$gpa} <br>";
    echo "The tax is {$tax}% <br>";
    
    //boolean
    $isStudent = true;
    $online = false;
    
    echo "Are you a student? " . ($isStudent ? "Yes" : "No") . "<br>";
    echo "Are you online? " . ($online ? "Yes" : "No");
    
    $quantity = 5;
    echo "You have {$quantity} items in your cart <br>";
    $total_price = $quantity * $price;
    echo "The total price is \${$total_price} <br>";
    
?>
```

```pHP
<?php
    // Operators
    
    // Arithmetic Operators
    $a = 10;
    $b = 5;
    
    echo "Addition: " . ($a + $b) . "<br>"; // 15
    echo "Subtraction: " . ($a - $b) . "<br>"; // 5
    echo "Multiplication: " . ($a * $b) . "<br>"; // 50
    echo "Division: " . ($a / $b) . "<br>"; // 2
    echo "Modulus: " . ($a % $b) . "<br>"; // 0
    echo "Exponentiation: " . ($a ** $b) . "<br>"; // 100000
    
    
    // Increment and Decrement Operators
    $x = 5;
    echo "Post-increment: " . $x++ . "<br>"; // 5 (then $x becomes 6)
    echo "Pre-increment: " . ++$x . "<br>"; // 7 (then $x becomes 7)
    echo "Post-decrement: " . $x-- . "<br>"; // 7 (then $x becomes 6)
    echo "Pre-decrement: " . --$x . "<br>"; // 5 (then $x becomes 5)
    
    // Operator Precedence
    // () --> ** --> * / % --> + - --> --  it works from left to right
    $result = 10 + 5 * 2; // Multiplication has higher precedence than addition
    echo "Result of 10 + 5 * 2: " . $result . "<br>"; // 20
    $result = (10 + 5) * 2; // Parentheses change the precedence
    echo "Result of (10 + 5) * 2: " . $result . "<br>"; // 30
?>
```

- Get Mehtod

```pHP
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>

<body>
    <form action="index.php" method="get">
        <label>username: </label>
        <input type="text" name="username">
        <br>
        <label">password: </label>
            <input type="password" name="password">
            <br>
            <input type="submit" value="Log in">
    </form>
</body>

</html>

<?php
if ($_SERVER["REQUEST_METHOD"] == "GET") {
    echo "{$_GET["username"]}<br>";
    echo "{$_GET["password"]}<br>";
    }
// $_GET, $_POST = special variables used to collect data from an HTML form
//                  data is sent to the file in the action attribute of <form>
//                  <form action="some_file.php" method="get">

//$ GET = Data is appended to the url
//        NOT SECURE
//        char limit
//        Bookmark is possible w/ values
//        GET requests can be cached
//        Better for a search page
?>
```

The password and username save with URL.
Right now, we running on local host.

```text
http://localhost/basic/index.php?username=xnocode&password=1234
```

- Post method

```pHP
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>

<body>    
    <form action="index.php" method="post">
        <label>username: </label>
        <input type="text" name="username">
        <br>
        <label">password: </label>
            <input type="password" name="password">
            <br>
            <input type="submit" value="Log in">
    </form>
</body>

</html>

<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    echo "{$_POST["username"]}<br>";
    echo "{$_POST["password"]}<br>";
    }
// $_GET, $_POST = special variables used to collect data from an HTML form
//                  data is sent to the file in the action attribute of <form>
//                  <form action="some_file.php" method="get">

//$_POST = Data is packaged inside the body of the HTTP request
//        MORE SECURE
//        No data limit
//        Cannot bookmark
//        GET requests are not cached
//        Better for submitting credentials

```

The password and username is secured.

```tXt
http://localhost/basic/index.php
```
