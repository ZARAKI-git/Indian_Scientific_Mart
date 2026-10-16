export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
/** Keep search engines out until the client signs off on the unconfirmed contact details. */
export const SITE_LIVE = process.env.NEXT_PUBLIC_SITE_LIVE === "true";
