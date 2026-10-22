/**
 * Public build-time configuration. EXPO_PUBLIC_* values are visible in the app bundle,
 * so only the API URL lives here (architecture.md §10.1).
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/v1').replace(
  /\/$/,
  '',
);

/** Origin without the /v1 suffix, used for /health. */
export const API_ORIGIN = API_URL.replace(/\/v1$/, '');

/** Public pages on GitHub Pages (architecture.md §10.2). */
export const WEB_ORIGIN = 'https://miniledger.surajmishra.me';
export const PRIVACY_URL = `${WEB_ORIGIN}/privacy.html`;
export const DELETE_DATA_URL = `${WEB_ORIGIN}/delete-account.html`;
