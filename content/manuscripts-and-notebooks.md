---
title: Structures of Manuscripts & Notebooks
description: ""
author: Ridoy
visibility: public
date: 2026-08-27
updatedAt: 2026-08-27
tags: []
series:
seriesOrder:
---
This is my personal library of handwritten study notes, lecture manuscripts, and digital notebooks — all shared directly via cloud storage and displayed as an interactive 3D gallery above.

Each notebook represents real notes I've taken — lecture derivations, design sketches, study guides, and personal research. Click any notebook to open it and read the full document.

## How to Add Your Own Notebooks

To add a new notebook or manuscript, edit the `books:` section in the YAML frontmatter at the top of this file (`content/books.md`):

```yaml
books:
  - title: "Your Notebook Title"
    author: "Your Name"
    category: "Physics"          # used for filtering (e.g. Mathematics, Architecture)
    cover: "https://..."         # direct image URL for the book cover
    link: "https://drive.google.com/file/d/YOUR_ID/view"  # cloud PDF link
    pages: "120 pages"           # optional — shown on the card
    color: "#86bfa8"             # optional — fallback hardcover accent color
    description: "Brief synopsis or overview of what this notebook contains."
    tags: [notes, derivations, reference]
```

Then run `bun run deploy` to publish the changes.

## Supported Cloud Storage Providers

Upload your PDF to any of these and paste the share link:

| Provider | Example Link Format |
|---|---|
| **Google Drive** | `https://drive.google.com/file/d/ID/view` |
| **OneDrive** | `https://onedrive.live.com/...` or `https://1drv.ms/...` |
| **Dropbox** | `https://www.dropbox.com/s/...` |
| **MEGA** | `https://mega.nz/file/...` |
| **Box** | `https://app.box.com/s/...` |
| **Direct PDF** | Any `.pdf` URL |

## Updating a Document Without Changing the Link

If you need to update the content of a notebook without breaking the existing link:

1. Right-click the file in **Google Drive**
2. Select **File information → Manage versions → Upload new version**
3. The share link stays the same — your garden instantly reflects the updated PDF
