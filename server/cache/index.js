export let ordersLastUpdated = Date.now();
export function updateOrdersLastUpdated() { ordersLastUpdated = Date.now(); }

export let bookingsLastUpdated = Date.now();
export function updateBookingsLastUpdated() { bookingsLastUpdated = Date.now(); }

export let settingsCache = null;
export let settingsCacheTime = 0;
export const imageSettingsCache = new Map();
export const SETTINGS_CACHE_TTL = 10 * 60 * 1000;
export function setSettingsCache(cache, time) {
  settingsCache = cache;
  settingsCacheTime = time;
}
export function clearSettingsCache() {
  settingsCache = null;
  imageSettingsCache.clear();
}

export let businessInfoCache = null;
export let businessInfoCacheTime = 0;
export const BIZ_INFO_CACHE_TTL = 10 * 60 * 1000;
export function setBusinessInfoCache(cache, time) {
  businessInfoCache = cache;
  businessInfoCacheTime = time;
}
export function clearBusinessInfoCache() {
  businessInfoCache = null;
}

export let smtpConfigCache = null;
export let smtpConfigCacheTime = 0;
export const SMTP_CACHE_TTL = 10 * 60 * 1000;
export function setSmtpConfigCache(cache, time) {
  smtpConfigCache = cache;
  smtpConfigCacheTime = time;
}
export function clearSmtpConfigCache() {
  smtpConfigCache = null;
}

export let notifEmailsCache = null;
export let notifEmailsCacheTime = 0;
export const NOTIF_EMAILS_CACHE_TTL = 10 * 60 * 1000;
export function setNotifEmailsCache(cache, time) {
  notifEmailsCache = cache;
  notifEmailsCacheTime = time;
}
export function clearNotifEmailsCache() {
  notifEmailsCache = null;
}

export let menuCatalogCache = null;
export let menuCatalogCacheTime = 0;
export const MENU_CATALOG_CACHE_TTL = 10 * 60 * 1000;
export function setMenuCatalogCache(cache, time) {
  menuCatalogCache = cache;
  menuCatalogCacheTime = time;
}
export function invalidateMenuCache() {
  menuCatalogCache = null;
  menuCatalogCacheTime = 0;
}
