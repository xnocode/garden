---
title: "Media Embeds Reference"
description: "Test image, audio, video, PDF, and ink drawing embeds — all the media types supported by the garden."
draft: false
date: 2024-09-02
tags: [reference, media, embeds]
---

This note tests all media embed types. Use `![[filename.ext]]` to embed any supported media in your notes.

## Images (curved and modern)

Images are rendered with rounded corners, subtle borders, and depth shadows. On hover they scale up slightly.

![[garden-illustration.png]]

## Audio embeds

Audio files (`.mp3`, `.wav`, `.ogg`, `.flac`, `.m4a`) render as native HTML5 audio players:

![[sample-audio.wav]]

## Video embeds

Video files (`.mp4`, `.webm`, `.mov`) render as native HTML5 video players with controls:

![[sample-video.mp4]]

## PDF embeds

PDF files render in an inline iframe viewer:

![[sample-document.pdf]]

## Obsidian Ink drawings

Drawings from the [Obsidian Ink plugin](https://github.com/daledesilva/obsidian_ink) are rendered as preview images. In Obsidian, use the `handdrawn-ink` or `handwritten-ink` code block:

~~~
```handdrawn-ink
{
	"versionAtEmbed": "1.2.0",
	"filepath": "Ink/Drawing/test-drawing.drawing",
	"width": 400,
	"aspectRatio": 1.5
}
```
~~~

The plugin stores the drawing as a `.drawing` file with a tldraw snapshot and a `previewUri` (base64 PNG screenshot). At publish time, the garden reads the file and inlines the preview image.

Here's a sample ink drawing:

```handdrawn-ink
{
	"versionAtEmbed": "1.2.0",
	"filepath": "Ink/Drawing/sample-sketch.drawing",
	"width": 400,
	"aspectRatio": 1.5
}
```

If the drawing file doesn't exist or has no preview, a placeholder is shown:

```handdrawn-ink
{
	"versionAtEmbed": "1.2.0",
	"filepath": "Ink/Drawing/nonexistent.drawing",
	"width": 400
}
```

> [!info] Supported media types
> - **Images**: `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`, `.avif`, `.bmp`, `.ico`
> - **Video**: `.mp4`, `.webm`, `.ogv`, `.mov`, `.m4v`, `.avi`, `.mkv`
> - **Audio**: `.mp3`, `.wav`, `.ogg`, `.oga`, `.flac`, `.m4a`, `.aac`, `.opus`
> - **PDF**: `.pdf`
> - **Ink**: ` ```handdrawn-ink ` and ` ```handwritten-ink ` code blocks (Obsidian Ink plugin)

See [[Embeds and Transclusions]], [[Code Execution Playground]], [[Callouts Reference]].

## External Media Embed Tests

Here we test embedding of external URLs for video, audio, and PDF files.

### External Video Embed
![External Video](https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4)

### External Audio Embed
![External Audio](https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3)

### External PDF Embed
![External PDF](https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf)

### Bare URL to Video
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4

### Autolink to Audio
<https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3>

