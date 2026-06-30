<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title>RSS Feed — <xsl:value-of select="/rss/channel/title"/></title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          :root {
            --background: #0a0a0c;
            --surface: #101013;
            --surface-2: #161619;
            --foreground: #dcdce0;
            --heading: #f3f3f5;
            --primary: #84a59d;
            --primary-hover: #a8cdb6;
            --border: rgba(255, 255, 255, 0.08);
            --muted-foreground: #909098;
            --shadow-md: 0 4px 12px -2px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3);
          }
          @media (prefers-color-scheme: light) {
            :root {
              --background: #faf8f8;
              --surface: #ffffff;
              --surface-2: #eeece9;
              --foreground: #2b2b2b;
              --heading: #1a1a1a;
              --primary: #284b63;
              --primary-hover: #1e3a4e;
              --border: rgba(0, 0, 0, 0.08);
              --muted-foreground: #6b6b6b;
              --shadow-md: 0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.03);
            }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--background);
            color: var(--foreground);
            line-height: 1.6;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 760px;
            margin: 0 auto;
            padding: 60px 24px;
          }
          header {
            margin-bottom: 40px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 32px;
          }
          h1 {
            color: var(--heading);
            font-size: 2.25rem;
            margin: 0 0 12px 0;
            font-weight: 700;
            letter-spacing: -0.025em;
          }
          .tagline {
            color: var(--muted-foreground);
            font-size: 1.1rem;
            margin: 0 0 24px 0;
          }
          .rss-info {
            background-color: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 48px;
            box-shadow: var(--shadow-md);
          }
          .rss-info p {
            margin: 0 0 16px 0;
            font-size: 0.95rem;
            color: var(--foreground);
          }
          .feed-url-container {
            display: flex;
            gap: 10px;
            margin-top: 16px;
          }
          .feed-url-input {
            flex-grow: 1;
            background-color: var(--surface-2);
            border: 1px solid var(--border);
            color: var(--foreground);
            padding: 10px 14px;
            border-radius: 8px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 0.875rem;
            outline: none;
            transition: border-color 0.2s;
          }
          .feed-url-input:focus {
            border-color: var(--primary);
          }
          .copy-btn {
            background-color: var(--primary);
            color: var(--background);
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 0.875rem;
            cursor: pointer;
            transition: background-color 0.2s, opacity 0.2s;
          }
          .copy-btn:hover {
            background-color: var(--primary-hover);
          }
          .copy-btn:active {
            opacity: 0.85;
          }
          .copy-success {
            color: var(--primary);
            font-size: 0.85rem;
            margin-top: 8px;
            font-weight: 500;
            display: none;
            animation: fadeIn 0.2s ease-in-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-2px); }
            to { opacity: 1; transform: translateY(0); }
          }
          h2.section-title {
            color: var(--heading);
            font-size: 1.5rem;
            margin-bottom: 24px;
            font-weight: 600;
            letter-spacing: -0.01em;
          }
          .notes-list {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          .note-card {
            background-color: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 24px;
            transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          }
          .note-card:hover {
            transform: translateY(-2px);
            border-color: var(--primary);
            box-shadow: var(--shadow-md);
          }
          .note-title {
            margin: 0 0 8px 0;
            font-size: 1.35rem;
            font-weight: 600;
            letter-spacing: -0.01em;
          }
          .note-title a {
            color: var(--primary);
            text-decoration: none;
            transition: color 0.2s;
          }
          .note-title a:hover {
            color: var(--primary-hover);
          }
          .note-meta {
            color: var(--muted-foreground);
            font-size: 0.85rem;
            margin-bottom: 14px;
            font-medium: 500;
          }
          .note-desc {
            margin: 0;
            font-size: 0.975rem;
            color: var(--foreground);
            opacity: 0.9;
          }
          .tags {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 16px;
          }
          .tag {
            background-color: var(--surface-2);
            border: 1px solid var(--border);
            color: var(--muted-foreground);
            padding: 3px 10px;
            border-radius: 6px;
            font-size: 0.775rem;
            font-weight: 500;
          }
          .back-link {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: var(--primary);
            text-decoration: none;
            font-size: 0.9rem;
            margin-bottom: 24px;
            font-weight: 500;
          }
          .back-link:hover {
            color: var(--primary-hover);
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <a class="back-link">
            <xsl:attribute name="href">
              <xsl:value-of select="/rss/channel/link"/>
            </xsl:attribute>
            ← Back to the Garden
          </a>
          
          <header>
            <h1><xsl:value-of select="/rss/channel/title"/></h1>
            <p class="tagline"><xsl:value-of select="/rss/channel/description"/></p>
          </header>
          
          <div class="rss-info">
            <p><strong>This is an RSS feed.</strong> Copy the feed URL below and paste it into your RSS reader app (such as Feedly, NetNewsWire, or Inoreader) to subscribe to updates from this digital garden.</p>
            <div class="feed-url-container">
              <input type="text" id="feed-url" class="feed-url-input" readonly="readonly">
                <xsl:attribute name="value">
                  <xsl:value-of select="/rss/channel/link"/>
                </xsl:attribute>
              </input>
              <button onclick="copyFeedUrl()" class="copy-btn">Copy URL</button>
            </div>
            <div id="copy-success" class="copy-success">✓ Feed URL copied to clipboard!</div>
          </div>
          
          <h2 class="section-title">Latest Notes</h2>
          <div class="notes-list">
            <xsl:for-each select="/rss/channel/item">
              <div class="note-card">
                <h3 class="note-title">
                  <a target="_blank">
                    <xsl:attribute name="href">
                      <xsl:value-of select="link"/>
                    </xsl:attribute>
                    <xsl:value-of select="title"/>
                  </a>
                </h3>
                <div class="note-meta">
                  Published: <xsl:value-of select="pubDate"/>
                </div>
                <p class="note-desc">
                  <xsl:value-of select="description"/>
                </p>
                <xsl:if test="category">
                  <div class="tags">
                    <xsl:for-each select="category">
                      <span class="tag"><xsl:value-of select="."/></span>
                    </xsl:for-each>
                  </div>
                </xsl:if>
              </div>
            </xsl:for-each>
          </div>
        </div>
        
        <script>
          // Set feed URL to the exact browser address bar URL so it works in any environment (local/dev/prod)
          document.getElementById("feed-url").value = window.location.href;

          function copyFeedUrl() {
            var copyText = document.getElementById("feed-url");
            copyText.select();
            copyText.setSelectionRange(0, 99999);
            navigator.clipboard.writeText(copyText.value);
            
            var successMsg = document.getElementById("copy-success");
            successMsg.style.display = "block";
            setTimeout(function() {
              successMsg.style.display = "none";
            }, 2500);
          }
        </script>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
