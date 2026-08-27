/**
 * cloud-pdf.ts
 * Cloud link parsing, cloud provider detection, and iframe embed resolution
 * for Google Drive, OneDrive, Mega, Dropbox, Box, iCloud, and direct PDFs.
 */

export interface CloudFileInfo {
  provider: "google-drive" | "onedrive" | "dropbox" | "mega" | "box" | "icloud" | "direct-pdf" | "generic";
  providerName: string;
  originalUrl: string;
  directPdfUrl: string;
  embedUrl: string | null;
  downloadUrl: string | null;
  isDirectPdf: boolean;
}

/**
 * Extracts a human-readable platform or service name from any URL.
 */
function getHostnameBrand(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (host.includes("google")) return "Google Drive";
    if (host.includes("onedrive") || host.includes("1drv.ms") || host.includes("live.com")) return "OneDrive";
    if (host.includes("dropbox")) return "Dropbox";
    if (host.includes("mega.nz") || host.includes("mega.io")) return "MEGA";
    if (host.includes("box.com")) return "Box";
    if (host.includes("icloud.com")) return "iCloud";
    if (host.includes("mediafire.com")) return "MediaFire";
    if (host.includes("notion.so") || host.includes("notion.site")) return "Notion";
    if (host.includes("github.com") || host.includes("github.io")) return "GitHub";
    if (host.includes("archive.org")) return "Internet Archive";
    if (host.includes("pcloud.com")) return "pCloud";
    if (host.includes("scribd.com")) return "Scribd";
    if (host.includes("slideshare.net")) return "SlideShare";
    if (host.includes("cloudinary.com")) return "Cloudinary";

    // Fallback: capitalize domain name
    const domainParts = host.split(".");
    const mainDomain = domainParts.length > 1 ? domainParts[domainParts.length - 2] : domainParts[0];
    return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
  } catch {
    return "Cloud Storage";
  }
}

/**
 * Detects the cloud provider and constructs an embed-friendly URL, direct PDF URL, and download URL.
 */
export function parseCloudUrl(rawUrl: string): CloudFileInfo {
  const url = (rawUrl || "").trim();
  if (!url) {
    return {
      provider: "generic",
      providerName: "Document Link",
      originalUrl: "",
      directPdfUrl: "",
      embedUrl: null,
      downloadUrl: null,
      isDirectPdf: false,
    };
  }

  const isDirectPdf = /\.pdf($|\?)/i.test(url);
  const brandName = getHostnameBrand(url);

  // 1. Google Drive
  // Format: https://drive.google.com/file/d/<ID>/view... or https://drive.google.com/open?id=<ID>
  if (/drive\.google\.com|docs\.google\.com/i.test(url)) {
    const fileIdMatch =
      url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
      url.match(/\/d\/([a-zA-Z0-9_-]+)/);

    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      const directUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
      return {
        provider: "google-drive",
        providerName: "Google Drive",
        originalUrl: url,
        directPdfUrl: directUrl,
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
        isDirectPdf: true,
      };
    }
    return {
      provider: "google-drive",
      providerName: "Google Drive",
      originalUrl: url,
      directPdfUrl: url,
      embedUrl: url.replace(/\/view(\?.*)?$/, "/preview"),
      downloadUrl: url,
      isDirectPdf: true,
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
      directPdfUrl: downloadUrl,
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
      directPdfUrl: url,
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
      directPdfUrl: url,
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
      directPdfUrl: url,
      embedUrl: url.replace(/\/s\//, "/embed/s/"),
      downloadUrl: url,
      isDirectPdf,
    };
  }

  // 6. Direct PDF URL
  if (isDirectPdf) {
    return {
      provider: "direct-pdf",
      providerName: brandName !== "Cloud Storage" ? brandName : "PDF Document",
      originalUrl: url,
      directPdfUrl: url,
      embedUrl: url,
      downloadUrl: url,
      isDirectPdf: true,
    };
  }

  // Generic cloud link
  return {
    provider: "generic",
    providerName: brandName,
    originalUrl: url,
    directPdfUrl: url,
    embedUrl: null,
    downloadUrl: url,
    isDirectPdf,
  };
}
