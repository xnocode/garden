---
title: "REST API Comprehensive Study Guide"
draft: false
author: Ridoy
date: 2026-07-29
tags:
  - rest api
  - python
  - flask
  - api design
---

> 🎥 **Source Video:** [REST API Crash Course - Introduction + Full Python API Tutorial](https://youtu.be/qbLc5a9jdXo?si=oBLDNRKfLjbL0p0b) (Caleb Curry)

## 💡 Core Concept & Overview
REST (Representational State of Resource) API, or Application Programming Interface, is an architectural style for designing networked applications. It is based on the idea of resources, which are identified by URIs, and can be manipulated using a fixed set of operations. REST API is a stateless, client-server, cacheable architecture that uses HTTP protocol for data communication.

## 📘 Key Principles & Deep Dive
The key principles of REST API include:
* **Resource-based**: Everything in REST is a resource (e.g., users, products, orders).
* **Client-Server Architecture**: The client and server are separate, with the client making requests to the server to access or modify resources.
* **Stateless**: Each request from the client to the server contains all the information necessary to complete the request.
* **Cacheable**: Responses from the server can be cached by the client to reduce the number of requests made to the server.
* **Uniform Interface**: A uniform interface is used to communicate between client and server, which includes HTTP methods (GET, POST, PUT, DELETE), URI, HTTP status codes, and standard HTTP headers.
* **Layered System**: The architecture of a REST API is designed as a series of layers, with each layer being responsible for a specific function (e.g., authentication, encryption).

The HTTP methods used in REST API are:
* **GET**: Retrieve a resource
* **POST**: Create a new resource
* **PUT**: Update an existing resource
* **DELETE**: Delete a resource

## ⚡ Practical Application & Summary
To create a REST API using Python, you can use frameworks such as Flask or Django. Here is a simple example using Flask:
```python
from flask import Flask, jsonify, request

app = Flask(__name__)

# Sample in-memory data store
books = [
    {'id': 0, 'title': 'A Fire Upon the Deep', 'author': 'Vernor Vinge', 'first_sentence': 'The coldsleep itself was a form of suspended animation.', 'year_published': '1992'},
    {'id': 1, 'title': 'The Ones Who Walk Away From Omelas', 'author': 'Ursula K. Le Guin', 'first_sentence': 'With a clamor of bells that set the swallows soaring, the Festival of Summer came to the city Omelas, continuing to a climax on the day of the summer solstice.', 'published': '1973'},
    {'id': 2, 'title': 'Dhalgren', 'author': 'Samuel R. Delany', 'first_sentence': 'to wound the autumnal city.', 'year_published': '1975'}
]

# GET /books
@app.route('/books', methods=['GET'])
def get_books():
    return jsonify({'books': books})

# GET /books/:id
@app.route('/books/:id', methods=['GET'])
def get_book(id):
    book = [book for book in books if book['id'] == int(id)]
    if len(book) == 0:
        return jsonify({'message': 'book not found'})
    return jsonify({'book': book[0]})

# POST /books
@app.route('/books', methods=['POST'])
def create_book():
    new_book = {
        'id': len(books),
        'title': request.json['title'],
        'author': request.json['author'],
        'first_sentence': request.json['first_sentence'],
        'year_published': request.json['year_published']
    }
    books.append(new_book)
    return jsonify({'book': new_book}), 201

# PUT /books/:id
@app.route('/books/:id', methods=['PUT'])
def update_book(id):
    book = [book for book in books if book['id'] == int(id)]
    if len(book) == 0:
        return jsonify({'message': 'book not found'})
    book[0]['title'] = request.json.get('title', book[0]['title'])
    book[0]['author'] = request.json.get('author', book[0]['author'])
    book[0]['first_sentence'] = request.json.get('first_sentence', book[0]['first_sentence'])
    book[0]['year_published'] = request.json.get('year_published', book[0]['year_published'])
    return jsonify({'book': book[0]})

# DELETE /books/:id
@app.route('/books/:id', methods=['DELETE'])
def delete_book(id):
    book = [book for book in books if book['id'] == int(id)]
    if len(book) == 0:
        return jsonify({'message': 'book not found'})
    books.remove(book[0])
    return jsonify({'message': 'book deleted'})

if __name__ == '__main__':
    app.run(debug=True)
```
This example demonstrates how to create a REST API using Flask, with endpoints for retrieving, creating, updating, and deleting books.
