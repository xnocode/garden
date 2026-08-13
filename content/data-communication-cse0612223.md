---
title: CSE0612223 | Data Communication
description: Notes from my university Data Communication course.
author: Ridoy
draft: false
date: 2026-07-22
tags:
  - university
prev: "[[software-engineering-and-system-analysis-lab-cse0613226]]"
next: ""
aliases:
  - class notes
updatedAt: 2026-08-14
---
> Date : 22 July 2026
## Lecture 01


> [!important] Important
> Class Test 01
> - OSI Model
> - TCP/IP Model
> 
> Mid Term
> - Network Topology *(Must Study)*

> [!warning] Warning
> For **Makeup CT** or **Late Assignment**:
> - Inform the faculty **before the deadline**.
> - Provide a **valid reason** for the request.

#### Slide
- [Lecture 1](https://drive.google.com/file/d/11FsHpTjF-7ADbMRhLOtCic6QzQlehwMg/view?usp=drive_link)

> Date : 23 July 2026 ❌

> Date : 29 July 2026 ❌

> Date : 30 July 2026

## Lecture 02

There are **5 basic components** of data communication:

1. **Sender** --> The device that sends the data.
2. **Receiver** --> The device that receives the data.
3. **Message** --> The information or data being communicated.
4. **Transmission Medium** --> The physical or wireless path through which data travels. Example: cable, fiber optic, radio waves.        
5. **Protocol** --> A set of rules that controls how data is communicated between devices.
        
Slides:

- [Lecture 2 (Part 1)](https://drive.google.com/file/d/1WqG-c_PtC-TI5Pdlrn55cUg23rt5P8tO/view?usp=drive_link)
- [Lecture 2 (Part 2)](https://drive.google.com/file/d/1CB8Jf823VxpV4alUhll6P1fvC7hPYt3-/view?usp=drive_link)


> **Date:** 06 August 2026

## Lecture 03

**OSI → Open Systems Interconnection**

> The OSI model has **7 layers**.

#### Why "Open"?

- The model is **not limited to one company**.
- Different systems, such as **Windows and Linux**, can use the model.
#### 7 Layers of OSI Model

##### Software Layers

1. **Application**
2. **Presentation**
3. **Session**

##### Hardware / Lower Layers

4. **Transport**
5. **Network**
6. **Data Link**
7. **Physical**
#### Presentation Layer

The **Presentation Layer** deals with the representation and transformation of data.

- **Translation** → Converts data into a **common format**.
- **Compression** → Reduces the **number of bits** needed to represent data.
- **Encryption** → Provides **security** by converting data into an encoded form.

#### Compression

Compression can be:
- **Lossy** → Some data is removed to reduce the size.
- **Lossless** → Data can be restored to its original form without losing information.
#### Session Layer

The **Session Layer** is responsible for managing communication sessions between applications.

- **Authentication** → Verifies the identity of a user.
- **Authorization** → Determines what an authenticated user is allowed to access.
- **Session Management** → Establishes, manages, and terminates a communication session.

Example

```text
  LIBRARY
     ↓
  ENTER ME
   ↙    ↘
  CSE   BBA
 ↙    ↘
BOOKS  CAMERA
```

#### Communication Modes

Half-Duplex --> Data can travel in **both directions**, but not at the same time. **Ex:** Walkie-Talkie

Full-Duplex --> Data can travel in **both directions at the same time**. **Ex:** Mobile phone communication

> Date: 12 August 2026

## Lecture 4

```plaintext
OSI — 7 Layers
│
├── 7. Application
│
├── 6. Presentation
│   ├── Translation
│   ├── Encryption
│   └── Compression
│
├── 5. Session
│   ├── Authentication
│   ├── Authorization
│   └── Session Management
│
├── 4. Transport
│   └── Process-to-Process Delivery
│
├── 3. Network
│
├── 2. Data Link
│
└── 1. Physical

```
