---
title: "Books & Manuscripts Library"
description: "A personal collection of handwritten notebooks, lecture slides, scanned papers, and digital books — all accessible via Google Drive or cloud PDF links."
tags: [library, books, reference]
books:
  - title: "Quantum Field Theory & Particle Derivations"
    author: "Ridoy"
    link: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/view?usp=sharing"
    category: "Physics"
    description: "Handwritten derivations covering the Dirac equation, Feynman diagrams, and path integral formulation of QFT."

  - title: "Data Communication (CSE0612223)"
    author: "Ridoy"
    link: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/view?usp=sharing"
    category: "University"
    description: "Lecture notes on signal encoding, transmission media, data link layer, and network architectures."

  - title: "Numerical Methods & Analysis"
    author: "Ridoy"
    link: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/view?usp=sharing"
    category: "Mathematics"
    description: "Root-finding, interpolation, numerical integration, and ODE solving with worked examples."
---

# Books & Manuscripts Library

This page is my personal library of handwritten notebooks, physical scans, and digital textbooks — all stored in **Google Drive** and accessible via the built-in PDF reader above.

## How to Add a Book

To add a new book or notebook to this library, edit this file (`content/books.md`) and add a new entry to the `books:` frontmatter list:

```yaml
- title: "Your Book Title"
  author: "Author Name"
  link: "https://drive.google.com/file/d/YOUR_DRIVE_FILE_ID/view"
  cover: "Attachments/cover.jpg" # optional
  category: "Category"
  description: "Short description of the book."
```

## Updating a PDF

To update a PDF without changing the link:
1. Right-click the file in **Google Drive**.
2. Choose **File information → Manage versions → Upload new version**.
3. The link stays the same — readers see the updated PDF instantly.
