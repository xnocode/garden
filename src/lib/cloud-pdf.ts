/**
 * cloud-pdf.ts
 * Cloud link parsing, cloud provider detection, and iframe embed resolution
 * for Google Drive, OneDrive, Mega, Dropbox, Box, iCloud, and direct PDFs.
 */

export interface CloudFileInfo {
  provider: "google-drive" | "onedrive" | "dropbox" | "mega" | "box" | "icloud" | "direct-pdf" | "generic";
  providerName: string;
  originalUrl: string;
  embedUrl: string | null;
  downloadUrl: string | null;
  isDirectPdf: boolean;
}

/**
 * Detects the cloud provider and constructs an embed-friendly URL and download URL.
 */
export function parseCloudUrl(rawUrl: string): CloudFileInfo {
  const url = (rawUrl || "").trim();
  if (!url) {
    return {
      provider: "generic",
      providerName: "Link",
      originalUrl: "",
      embedUrl: null,
      downloadUrl: null,
      isDirectPdf: false,
    };
  }

  const isDirectPdf = /\.pdf($|\?)/i.test(url);

  // 1. Google Drive
  // Format: https://drive.google.com/file/d/<ID>/view... or https://drive.google.com/open?id=<ID>
  if (/drive\.google\.com|docs\.google\.com/i.test(url)) {
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      return {
        provider: "google-drive",
        providerName: "Google Drive",
        originalUrl: url,
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
        isDirectPdf,
      };
    }
    return {
      provider: "google-drive",
      providerName: "Google Drive",
      originalUrl: url,
      embedUrl: url.replace(/\/view(\?.*)?$/, "/preview"),
      downloadUrl: url,
      isDirectPdf,
    };
  }

  // 2. Dropbox
  // Format: https://www.dropbox.com/s/xyz/file.pdf?dl=0
  if (/dropbox\.com/i.test(url)) {
    let embedUrl = url;
    let downloadUrl = url;
    if (url.includes("?")) {
      embedUrl = url.replace(/([?&])(dl|raw)=[01]/, "$1raw=1");
      downloadUrl = url.replace(/([?&])(dl|raw)=[01]/, "$1dl=1");
    } else {
      embedUrl = `${url}?raw=1`;
      downloadUrl = `${url}?dl=1`;
    }
    return {
      provider: "dropbox",
      providerName: "Dropbox",
      originalUrl: url,
      embedUrl: `https://docs.google.com/viewer?url=${encodeURIComponent(embedUrl)}&embedded=true`,
      downloadUrl,
      isDirectPdf: true,
    };
  }

  // 3. OneDrive
  // Format: onedrive.live.com or 1drv.ms
  if (/onedrive\.live\.com|1drv\.ms/i.test(url)) {
    return {
      provider: "onedrive",
      providerName: "OneDrive",
      originalUrl: url,
      embedUrl: url.includes("embed") ? url : null,
      downloadUrl: url,
      isDirectPdf,
    };
  }

  // 4. Mega
  // Format: https://mega.nz/file/... or https://mega.nz/embed/...
  if (/mega\.nz/i.test(url)) {
    const embedUrl = url.replace("/file/", "/embed/");
    return {
      provider: "mega",
      providerName: "MEGA",
      originalUrl: url,
      embedUrl: embedUrl.includes("/embed/") ? embedUrl : null,
      downloadUrl: url,
      isDirectPdf,
    };
  }

  // 5. Box
  if (/app\.box\.com/i.test(url)) {
    return {
      provider: "box",
      providerName: "Box",
      originalUrl: url,
      embedUrl: url.replace(/\/s\//, "/embed/s/"),
      downloadUrl: url,
      isDirectPdf,
    };
  }

  // 6. Direct PDF URL
  if (isDirectPdf) {
    return {
      provider: "direct-pdf",
      providerName: "PDF Document",
      originalUrl: url,
      embedUrl: url,
      downloadUrl: url,
      isDirectPdf: true,
    };
  }

  // Generic link
  return {
    provider: "generic",
    providerName: "Cloud Storage",
    originalUrl: url,
    embedUrl: null,
    downloadUrl: url,
    isDirectPdf,
  };
}
