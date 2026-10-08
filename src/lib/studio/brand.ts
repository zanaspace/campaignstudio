/**
 * Campaign Studio brand constants, rebranded from 1Government Cloud / Galaxy Backbone to CICOD.
 * Emails can't use CSS variables, so the CRM design-system colours are repeated here as hex.
 * Addresses and URLs are placeholders for the team to confirm.
 */
export const BRAND = {
  primary: "#F2A93B",       // --primary (buttons)
  onPrimary: "#0C1A2E",     // text on primary, for contrast
  navy: "#12253F",          // --secondary (brand name, headings, links)
  textDark: "#0C1A2E",      // --foreground
  textBody: "#3D4A5C",
  accentText: "#B86E08",    // variables in the editor preview
  rule: "#E1E5EB",          // --border
  pageBg: "#F3F4F6",
};

export const CICOD = {
  name: "CICOD",
  tagline: "Customer and operations platform",
  logo: "/images/cicod-crm-logo-light.png",
  site: "https://www.cicod.com",
  supportEmail: "support@cicod.com",
  team: "The CICOD Team",
  domain: "cicod.com",
};

/** Make a site-relative image (the CRM logo) absolute, so exported HTML works in an email client. */
export function absoluteUrl(src: string) {
  if (!src || /^https?:\/\//.test(src) || typeof window === "undefined") return src;
  return window.location.origin + src;
}
