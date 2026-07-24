---
share_link: https://share.note.sx/ij70sg3m#1wQZkIgTm5ShaLeoLM8f0m8aN1uPQXYBlvDTh/1FZqE
share_updated: 2026-07-06T01:35:30+06:00
---
blocks of code that performs specific task
- input()
-  print()
there is two types of function one is defination and another is 
- function actually works based on def which is works as define

```python
def hello();
	print("Hello World")
	
hello() ---> if we want to use parenthisisfor
is
```

`p

```python
def sum(a,b)
	sum = a + b
	repracsum
ans print(sum)
```

practpof acfasf
calculation the average ofb,nc:mber
```python
def cal_avg(a,b,c):
	sum = a + b + c
	retnonn n sum /3
pricat(calcal_avg(3,4,6) )	
```

non-default parameter
dedefult parameter
```python
def sum ( a, b=1)
	 retun a+b
print (sum(5))	
```
always no default value must have to write first then we can write the defult value so that we can write te system carfuly

types of function 
- build i n funciton --> print(), intput(), type(), range()
- user define function --> sum(), avg()
### lambda function
```python
sum = lambda (a,b,c): a+b+c
print(sum)
```

high order funciton  fo

we can al uor the avg function so that

### Striword
```python
word =. "python"
print(len(word))
```

```python
based 1 = "I love"
word23 = "ythonp
"
```

postion and based on index
word = pyuthon
p -> 1
y -> 2
u -> 3
t woh -. 5
o - 6
 n - python

```python
word = "python"
print( word[0])
promt(word[1])
```

```python
worexistioexistiwe thon
"

```

wq can not change anython insede existing code within the file of stripython slicing
"python" --. subn string
we can use a format fo r this to starting index and iending idx;ex

std 9[st idx;ind nd ind]ind
starrt inx an d end ing ind will be not thwill beame ending index wil

Day 04
### strings
```python 
 word = "python"
 print(len(word)
 word2 = "I love it."
 print(word1+" "+word2)
 sentence = word1 + word2
 print(sentence)
```

| word  | p   | y   | t   | h   | o   | n   |
| ----- | --- | --- | --- | --- | --- | --- |
| index | 0   | 1   | 2   | 3   | 4   | 5   |
 ```python
 ```

```python
Word = "python"
print(word[2])
```

We can also use loop with strings
Inside as a data type in strings we say python are in mulatable

```python
word = "python"
for ch in word:
	 print(word)
```

- slicing a string
how to we slicing a string

--> syntax
```python
str[st idx: end idx]
				|
				|
				|
				----> not include last number
```

```python
Str = "pyhton"
	   012345
print(word[2:3]
```
By default end 
```python
word = "python"
Print(word[3:]
```

Default of starting = 0
Default of ending = lenght of string

we also see some negative index when we are trying to slicing

| word  | p   | y   | t   | h   | o   | n   |
| ----- | --- | --- | --- | --- | --- | --- |
| index | -6  | -5  | -4  | -3  | -2  | -1  |
```python
Word = "python"
print(word[-4:-2])
```

## string formatting
We use it when we want to use dynamic strings

1. format( ) --> place holder -> place value
2. f-sting
```python
A = 5
B = 10
Sum = A + B
print("sum is { }",format(sum))
print("sum of {} & {} is {}",format(a,b,sum))

#Index based formatting
 print("sum of {1} & {0} is {2}",format(a,b,sum))
#value based formatting
print("value of vars {c} & {d}",format(c=5,d=7))
```

- f-strings --> literal string interpolation

```python
f"{ }
	|
	|
	----> variable expression
```

```python
A = 4
B = 3
print(f"sum of {a} & {b} is {a+b}")
```

### lists
It is mutable sequence of values

```python
Marks1 = 90
Marks2 = 12
Marks3 = 39
Marks4 = 54
marks5 = 44

Marks = [90,12,39,54,44]

```

Here we have indexing value and position value 

| marks | 90  | 12  | 39  | 54  | 44  |     |
| ----- | --- | --- | --- | --- | --- | --- |
| index | 0   | 1   | 2   | 3   | 4   |     |
```python
Marks = [90,12,39,54,44]
print(marks)
print(len(marks)
print(marks[4])
```

String --> immutable
List --> mutable


If we want to update marks of value within list

```python
Marks = [34,34,24,4,234]

Marks[2] = 100
print(marks)
print(type(marks)) 
```
Inside list we can input any kind of data and it will store as list

- slicing inside list --> sub list
Syntax

```python
list [start idx: end idx]
```
Here def value of start = 0 
And the end value of will be lenght of list

```python
Marks  = [123,231,31,31,"abc",100.97]
print(marks[0:5]
print(marks[5:len(marks)])
```

If we want to print with negative index

```python
Marks  = [123,231,31,31,"abc",100.97]
print(marks[-5:-2])
```

Methods of Lists ---> function
- `l.append(val)`   --> add more element at the end
-  `l.insert(idx,val)` --> insert element at idx
- `l.sort` --> arranges in increase order
- `l.reverse` --> reverse order

If we want to add anything and the end of the number
Then we will be use append method

```python
nums = [1,2,3]
nums.append(4)
print(nums)
```

It will be give us 1 2 3 4

If we want to add anything in the middle inside of the list then we have to use insert list

```python
Num = [1,2,3,4]
Num.insert(2,10)
print (num)    
```

Then it will be print 1 2 10 4

Also we can sort our list by using sort method

```python
Num = [1,2,10,3,4]
num.sort()
print(num)
```

```text
1,2
```

Also if we want reverse any sequence from the method
```python
Num=[1,2,3,4]
Num.reverse()
print(Num)
```

```text
4 3 2 1 
```

- loops inside the list
How to use for loop inside the list

Find the index of 10
```python
nums = [1,2,3,4,10,4]
x = 10
inx = 0

for val in nums:
	if(val == x):
	print (f"{x} found at idx =(idx)")
	break
idx += 1
```
It's actually looks like linear search.

```text 
10 found at idx = 3
```
### tuples
- immutable sequence of values
```python
	tup = (1,2,3,4,5, "abc", 3.14)
	print(tup)
	print(len(tup))
	print(tup[2])
```

If we write single value tuple then we have use comma otherwise it will be not work.

```python
tup = (1,)
print(tup)
```

We can use the for loop with tuple just like list.

```python
	tup = (1,2,3,4,5)
	for val in tup:
		sum += val
	print("sum of value is {sum}")
```

Methods of tuples
- t.index(val)    --> returns 1st occurrence idx
- t.index(val)   --> counts total occurrences

```python
tup = (1,2,3,4,3,4)
print(tup.index(2))  
```

```python
tup = (1,2,3,4,3,4)
print(tup.count(2))  
```

### dictionary 

- key:value pairs
key:vaules are always unique

```python
	info = {
		"name": "xnocode",
		"cgpa": 3.5,
		"subjects":["math","science"],
		3.14: "PI",
} 
	print(info[3.14])

```
Inside dictionary we have to use comma to separate this things.

Dictornay keys are unique and dolicate keys are not allow and it does not follow any order and it's mutable.

Methods of dictionary
- d.keys() ---> returns all keys
- d.values() --> returns all values
- d.items() --> returns (key,val) pairs
- d.get(val)  --> returns val acc to key
- d.update(new_item)   ---> adds new items to dictionary 

If we want to print all the keys of dictionary we can do it using dictionary.
```python
	info = {
		"name": "xnocode",
		"cgpa": 3.5,
		"subjects":["math","science"],
		3.14: "PI",
} 
	print(info.key())
```

```text
dic_keys (['name','cgpa','subjects',3,14])
```

If we want we can print it as list. Also the values

```python
info = {
		"name": "xnocode",
		"cgpa": 3.5,
		"subjects":["math","science"],
		3.14: "PI",
} 
	dic_vals = list(info.key())
	print(type(dic_vals))
	print(dic_vals)
```

```text
<class 'list'> 
['name','cgpa','subjects',3,14]
```
















