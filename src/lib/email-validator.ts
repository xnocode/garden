/**
 * Client-safe list of trusted, major corporate email providers.
 * Blocks disposable/throwaway domains and educational .edu addresses.
 */
export const ALLOWED_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "fastmail.com",
  "zoho.com",
];

export function isAllowedEmailDomain(email: string): boolean {
  if (!email || !email.includes("@")) return false;
  const domain = email.toLowerCase().split("@")[1]?.trim();
  if (!domain) return false;

  // Explicitly block .edu domains
  if (domain.endsWith(".edu") || domain.includes(".edu.")) {
    return false;
  }

  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}
