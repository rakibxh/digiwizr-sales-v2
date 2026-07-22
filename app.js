/* =========================================================
   DIGIWIZR SALES TRACKER — APP LOGIC
   ========================================================= */

// -----------------------------------------------------------
// CONFIG
// -----------------------------------------------------------
// Fill this in with your deployed Apps Script /exec URL.
const BACKEND_URL = "https://script.google.com/macros/s/AKfycbx4UnoWZNYv6z8LJ5jmZvqmFVBUiyY0i6mlkwnPiVtC9OUf95gH75SZE2Mvn2KWKfIUXw/exec";

// localStorage keys (persist across sessions on this device)
const LS_SHEET_ID = "digiwizr_sheetId";
const LS_BUSINESS_NAME = "digiwizr_businessName";
const LS_ACCESS_PIN_HASH = "digiwizr_accessPinHash";
const LS_RECOVERY_PIN = "digiwizr_recoveryPin";
const LS_PENDING_SYNC = "digiwizr_pendingSync";
const LS_LAST_SYNCED = "digiwizr_lastSynced";
const LS_IOS_BANNER_DISMISSED = "digiwizr_iosBannerDismissed";
const LS_LANGUAGE = "appLanguage";

// sessionStorage key (cleared when the browser tab/app session ends)
const SS_AUTHENTICATED = "digiwizr_authenticated";

// -----------------------------------------------------------
// LANGUAGE & CURRENCY
// -----------------------------------------------------------
// Three supported settings: "En-$", "En-৳", "Bn-৳".
// English text is used for both "En-$" and "En-৳"; only the
// currency symbol differs. Bengali text is used only for "Bn-৳".
const DEFAULT_LANGUAGE = "En-৳";

const translations = {
  // GENERAL
  appName: { en: "Digiwizr Sales Tracker", bn: "ডিজিউইজার সেলস ট্র্যাকার" },
  save: { en: "Save", bn: "সেইভ করুন" },
  cancel: { en: "Cancel", bn: "বাতিল" },
  delete: { en: "Delete", bn: "মুছুন" },
  edit: { en: "Edit", bn: "সম্পাদনা" },
  confirm: { en: "Confirm", bn: "নিশ্চিত করুন" },
  loading: { en: "Loading...", bn: "লোড হচ্ছে..." },
  error: { en: "Something went wrong. Please try again.", bn: "কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন।" },
  success: { en: "Saved successfully.", bn: "সফলভাবে সেইভ হয়েছে।" },
  noData: { en: "No entries found.", bn: "কোনো এন্ট্রি পাওয়া যায়নি।" },
  offline: { en: "You are offline — data will sync when connected.", bn: "আপনি অফলাইনে আছেন — সংযুক্ত হলে ডেটা সিঙ্ক হবে।" },
  pendingSync: { en: "entries pending sync", bn: "টি এন্ট্রি সিঙ্ক হওয়ার অপেক্ষায়" },
  syncNow: { en: "Sync Now", bn: "এখনই সিঙ্ক করুন" },
  lastSynced: { en: "Last synced:", bn: "সর্বশেষ সিঙ্ক:" },

  // HOMEPAGE
  todaysRevenue: { en: "Today's Revenue", bn: "আজকের আয়" },
  todaysProfit: { en: "Today's Profit", bn: "আজকের লাভ" },
  profitPercent: { en: "Profit %", bn: "লাভের হার (%)" },
  recordSale: { en: "Record a Sale", bn: "বিক্রয় যোগ করুন" },
  recordExpense: { en: "Record an Expense", bn: "খরচ যোগ করুন" },
  collections: { en: "Collections", bn: "বকেয়া আদায়" },
  manageProducts: { en: "Manage Products", bn: "পণ্যের তালিকা" },
  viewDailyReport: { en: "View Daily Report", bn: "দৈনিক রিপোর্ট দেখুন" },
  recentEntries: { en: "Recent Entries", bn: "সাম্প্রতিক এন্ট্রি" },

  // MANAGE PRODUCTS PAGE
  productName: { en: "Product Name", bn: "পণ্যের নাম" },
  size: { en: "Size", bn: "আকার / পরিমাণ" },
  costPrice: { en: "Cost Price", bn: "ক্রয়মূল্য" },
  price: { en: "Price", bn: "বিক্রয়মূল্য" },
  addProduct: { en: "Add Product", bn: "পণ্য যোগ করুন" },
  currentProducts: { en: "Current Products", bn: "বর্তমান পণ্যসমূহ" },
  updateProduct: { en: "Update Product", bn: "পণ্য আপডেট করুন" },
  deleteProduct: { en: "Delete Product", bn: "পণ্য মুছুন" },
  confirmDeleteProduct: { en: "Delete this product?", bn: "এই পণ্যটি মুছে ফেলবেন?" },

  // RECORD A SALE PAGE
  selectProduct: { en: "Select a Product", bn: "পণ্য নির্বাচন করুন" },
  quantity: { en: "Quantity", bn: "পরিমাণ / সংখ্যা" },
  notes: { en: "Notes (optional)", bn: "মন্তব্য (ঐচ্ছিক)" },
  saveSale: { en: "Save Sale", bn: "বিক্রয় সেইভ করুন" },
  saleRecorded: { en: "Sale recorded!", bn: "বিক্রয় সেইভ হয়েছে!" },

  // RECORD AN EXPENSE PAGE
  description: { en: "Description", bn: "খরচের বিবরণ" },
  amount: { en: "Amount", bn: "টাকার পরিমাণ" },
  saveExpense: { en: "Save Expense", bn: "খরচ সেইভ করুন" },
  expenseRecorded: { en: "Expense recorded!", bn: "খরচ সেইভ হয়েছে!" },

  // COLLECTIONS PAGE
  collectionDescription: { en: "Description (optional)", bn: "গ্রাহকের নাম / আদায়ের বিবরণ" },
  collectionAmount: { en: "Amount", bn: "আদায়ের পরিমাণ" },
  saveCollection: { en: "Save Collection", bn: "আদায় সংরক্ষণ করুন" },
  collectionRecorded: { en: "Collection recorded!", bn: "আদায় সংরক্ষণ হয়েছে!" },

  // DAILY REPORT PAGE
  dailyReport: { en: "Daily Report", bn: "দৈনিক রিপোর্ট" },
  reportDate: { en: "Report Date", bn: "রিপোর্টের তারিখ" },
  sales: { en: "Sales", bn: "বিক্রয়" },
  product: { en: "Product", bn: "আইটেম" },
  sizeColumn: { en: "Size", bn: "পরিমাণ" },
  qty: { en: "Qty", bn: "সংখ্যা" },
  unitPrice: { en: "Unit Price", bn: "একক মূল্য" },
  total: { en: "Total", bn: "সর্বমোট মূল্য" },
  totalSales: { en: "Total Sales", bn: "সর্বমোট বিক্রয় মূল্য" },
  totalCollections: { en: "Total Collections", bn: "সর্বমোট আদায়" },
  totalExpenses: { en: "Total Expenses", bn: "সর্বমোট ব্যয়" },
  dailySummary: { en: "Daily Summary", bn: "দিনের হিসাব সারসংক্ষেপ" },
  totalCashIn: { en: "Total Cash In", bn: "সর্বমোট নগদ প্রাপ্তি" },
  costOfGoodsSold: { en: "Cost of Goods Sold", bn: "বিক্রিত পণ্যের মোট ক্রয়মূল্য" },
  grossProfit: { en: "Gross Profit", bn: "মোট মুনাফা" },
  reportGenerated: { en: "Report generated by Digiwizr Sales Tracker", bn: "DigiWizr Sales Tracker কর্তৃক প্রস্তুত রিপোর্ট" },
  downloadPDF: { en: "Download PDF Report", bn: "পিডিএফ রিপোর্ট ডাউনলোড করুন" },

  // RECENT ENTRIES
  sale: { en: "SALE", bn: "বিক্রয়" },
  expense: { en: "EXPENSE", bn: "খরচ" },
  collection: { en: "COLLECTION", bn: "আদায়" },
  deleteEntryConfirm: { en: "Delete entry?", bn: "এন্ট্রিটি মুছে ফেলবেন?" },
};

function getCurrentLanguage() {
  return localStorage.getItem(LS_LANGUAGE) || DEFAULT_LANGUAGE;
}

/**
 * Returns the currency symbol for the current language setting.
 * En-$ -> "$", En-৳ / Bn-৳ -> "৳".
 */
function getCurrency() {
  return getCurrentLanguage() === "En-$" ? "$" : "৳";
}

/**
 * Returns the translated string for a given key, based on the
 * current language setting. Falls back to the key itself (and
 * logs a warning) if the key doesn't exist, so a typo never
 * renders as "undefined" on screen.
 */
function t(key) {
  const entry = translations[key];
  if (!entry) {
    console.warn("Missing translation key:", key);
    return key;
  }
  return getCurrentLanguage() === "Bn-৳" ? entry.bn : entry.en;
}

/**
 * Applies t() to every element carrying a data-i18n attribute.
 * Covers static labels, headings, and button text that don't
 * depend on data from the backend.
 */
function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
}

/**
 * Toggles the Bengali typography class on <body> and keeps the
 * language dropdown(s) in sync with the stored setting.
 */
function applyLanguageDisplay() {
  const lang = getCurrentLanguage();
  document.body.classList.toggle("lang-bn", lang === "Bn-৳");

  document.querySelectorAll(".language-select").forEach((select) => {
    select.value = lang;
  });

  applyStaticTranslations();
}

/**
 * Re-renders whichever dynamic (data-driven) content belongs to
 * the currently active screen, so a language/currency change is
 * reflected instantly without needing to navigate away and back.
 */
function refreshCurrentScreenDynamicContent() {
  const activeKey = Object.keys(screens).find((key) => screens[key].classList.contains("active"));

  if (activeKey === "home") {
    loadDailySummary();
    loadRecentEntries();
    refreshSyncBadge();
    updateLastSyncedText();
  } else if (activeKey === "sale") {
    loadProductsForSale();
  } else if (activeKey === "products") {
    loadProductsForManage();
  } else if (activeKey === "dailyReport") {
    const dateInput = $("reportDateInput");
    if (dateInput && dateInput.value) loadDailyReport(dateInput.value);
  }

  updateOfflineBanner();
}

function handleLanguageChange(newLang) {
  localStorage.setItem(LS_LANGUAGE, newLang);
  applyLanguageDisplay();
  refreshCurrentScreenDynamicContent();
}

function initLanguageSwitcher() {
  applyLanguageDisplay();

  document.querySelectorAll(".language-select").forEach((select) => {
    select.addEventListener("change", (e) => handleLanguageChange(e.target.value));
  });
}

/**
 * Shows the language dropdown only on the screens it's meant to
 * appear on (setup, PIN entry, home) and hides it everywhere else.
 */
function updateLanguageSwitcherVisibility(activeScreenName) {
  const shouldShow = ["setup", "pinEntry", "home"].includes(activeScreenName);
  document.querySelectorAll(".language-select-wrap").forEach((wrap) => {
    wrap.style.display = shouldShow ? "block" : "none";
  });
}

// -----------------------------------------------------------
// STATE
// -----------------------------------------------------------
let selectedProduct = null; // currently selected product object ({name, size, cost, price, rowIndex}) on the Sale screen
let recoveryReturnScreen = "setup"; // where the recovery screen's back link goes
let pendingRecovery = null; // { sheetId, businessName, recoveryPIN } while on recovery step 2
let editingProductRowIndex = null; // set while editing an existing product

// -----------------------------------------------------------
// DOM SHORTCUTS
// -----------------------------------------------------------
const $ = (id) => document.getElementById(id);

const screens = {
  setup: $("screen-setup"),
  pinEntry: $("screen-pin-entry"),
  recovery: $("screen-recovery"),
  home: $("screen-home"),
  sale: $("screen-sale"),
  expense: $("screen-expense"),
  collections: $("screen-collections"),
  products: $("screen-products"),
  dailyReport: $("screen-daily-report"),
};

const headerScreenTitle = $("headerScreenTitle");
const headerBusinessName = $("headerBusinessName");
const backBtn = $("backBtn");
const offlineBanner = $("offlineBanner");
const syncBadge = $("syncBadge");
const syncBadgeText = $("syncBadgeText");
const lastSyncedText = $("lastSyncedText");

// Screen titles shown in the header for sub-screens only
const SCREEN_TITLES = {
  sale: "Record a Sale",
  expense: "Record an Expense",
  collections: "Collections",
  products: "Manage Products",
  dailyReport: "Daily Report",
};

// Screens reachable via the shared header back button (always returns Home)
const BACK_TO_HOME_SCREENS = ["sale", "expense", "collections", "products", "dailyReport"];

/* =========================================================
   NAVIGATION
   ========================================================= */
function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    el.classList.toggle("active", key === name);
  });

  const isSubScreen = BACK_TO_HOME_SCREENS.includes(name);
  backBtn.style.display = isSubScreen ? "inline-flex" : "none";

  if (SCREEN_TITLES[name]) {
    headerScreenTitle.textContent = SCREEN_TITLES[name];
    headerScreenTitle.style.display = "block";
  } else {
    headerScreenTitle.style.display = "none";
  }

  if (name === "sale") loadProductsForSale();
  if (name === "products") loadProductsForManage();
  if (name === "home") loadHomeData();
  if (name === "dailyReport") initDailyReportScreen();

  updateLanguageSwitcherVisibility(name);
}

backBtn.addEventListener("click", () => showScreen("home"));

function applyBusinessNameToHeader(name) {
  headerBusinessName.textContent = name;
  headerBusinessName.style.display = "block";
}

/* =========================================================
   BACKEND COMMUNICATION
   ========================================================= */
/**
 * Calls the Apps Script backend with the given action + params.
 * Uses text/plain content-type to avoid CORS preflight (Apps Script
 * web apps can't answer OPTIONS preflight requests), while still
 * sending a JSON body that the script parses on its end.
 */
async function callBackend(action, params) {
  if (!BACKEND_URL) {
    throw new Error("Backend URL is not configured yet.");
  }

  const payload = Object.assign({}, params, { action });

  const response = await fetch(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Network response was not ok (" + response.status + ")");
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Unknown backend error");
  }

  return data;
}

/* =========================================================
   MESSAGE HELPERS
   ========================================================= */
function showMessage(el, text, type) {
  el.textContent = text;
  el.className = "message visible " + type;
}

function clearMessage(el) {
  el.textContent = "";
  el.className = "message";
}

/* =========================================================
   SIMPLE PIN HASHING
   (Lightweight obfuscation for local comparison only — not
   cryptographic-grade security. Good enough to avoid storing
   the raw PIN in plain text in localStorage.)
   ========================================================= */
function simpleHash(str) {
  let hash = 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

/* =========================================================
   DATE / TIME FORMATTING
   ========================================================= */
function formatDateTimeDisplay(date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function markSynced() {
  localStorage.setItem(LS_LAST_SYNCED, new Date().toISOString());
  updateLastSyncedText();
}

function updateLastSyncedText() {
  const iso = localStorage.getItem(LS_LAST_SYNCED);
  if (!iso) {
    lastSyncedText.textContent = t("lastSynced") + " " + (getCurrentLanguage() === "Bn-৳" ? "কখনো না" : "Never");
    return;
  }
  lastSyncedText.textContent = t("lastSynced") + " " + formatDateTimeDisplay(new Date(iso));
}

/* =========================================================
   SCREEN 1 — SETUP
   ========================================================= */
$("setupBtn").addEventListener("click", handleSetup);
$("goToRecoveryFromSetup").addEventListener("click", () => showRecoveryScreen("setup"));

async function handleSetup() {
  const msgEl = $("setupMessage");
  clearMessage(msgEl);

  const businessName = $("businessNameInput").value.trim();
  const phone = $("phoneInput").value.trim();
  const email = $("emailInput").value.trim();
  const address = $("addressInput").value.trim();
  const pin = $("setupPinInput").value.trim();
  const pinConfirm = $("setupPinConfirmInput").value.trim();

  if (!businessName) {
    showMessage(msgEl, "Please enter your business name.", "error");
    return;
  }
  if (!phone) {
    showMessage(msgEl, "Please enter a phone number.", "error");
    return;
  }
  if (!email) {
    showMessage(msgEl, "Please enter an email address.", "error");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showMessage(msgEl, "Please enter a valid email address.", "error");
    return;
  }
  if (!/^\d{4}$/.test(pin)) {
    showMessage(msgEl, "PIN must be exactly 4 digits.", "error");
    return;
  }
  if (pin !== pinConfirm) {
    showMessage(msgEl, "PINs do not match.", "error");
    return;
  }

  setSetupLoading(true);

  try {
    const data = await callBackend("setupClient", { businessName, phone, email, address });

    localStorage.setItem(LS_SHEET_ID, data.sheetId);
    localStorage.setItem(LS_BUSINESS_NAME, businessName);
    localStorage.setItem(LS_ACCESS_PIN_HASH, simpleHash(pin));
    localStorage.setItem(LS_RECOVERY_PIN, data.recoveryPIN);

    showSetupCompleteModal(data.recoveryPIN, businessName);
  } catch (err) {
    showMessage(msgEl, "Setup failed: " + err.message, "error");
  } finally {
    setSetupLoading(false);
  }
}

function setSetupLoading(isLoading) {
  $("setupBtn").disabled = isLoading;
  $("setupSpinner").style.display = isLoading ? "flex" : "none";
}

function showSetupCompleteModal(recoveryPIN, businessName) {
  $("modalRecoveryPin").textContent = recoveryPIN;
  $("setupCompleteModal").style.display = "flex";

  $("modalConfirmBtn").onclick = () => {
    $("setupCompleteModal").style.display = "none";
    applyBusinessNameToHeader(businessName);
    sessionStorage.setItem(SS_AUTHENTICATED, "true");
    showScreen("home");
  };
}

/* =========================================================
   SCREEN 2 — ACCESS PIN ENTRY
   ========================================================= */
$("unlockBtn").addEventListener("click", handleUnlock);
$("goToRecoveryFromPin").addEventListener("click", () => showRecoveryScreen("pinEntry"));

$("accessPinInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleUnlock();
});

function handleUnlock() {
  const msgEl = $("pinEntryMessage");
  clearMessage(msgEl);

  const pinInput = $("accessPinInput");
  const entered = pinInput.value.trim();
  const storedHash = localStorage.getItem(LS_ACCESS_PIN_HASH);

  if (simpleHash(entered) === storedHash) {
    sessionStorage.setItem(SS_AUTHENTICATED, "true");
    pinInput.value = "";
    const businessName = localStorage.getItem(LS_BUSINESS_NAME) || "";
    applyBusinessNameToHeader(businessName);
    showScreen("home");
  } else {
    showMessage(msgEl, "Incorrect PIN. Please try again.", "error");
    pinInput.value = "";
    pinInput.focus();
  }
}

/* =========================================================
   SCREEN 3 — ACCOUNT RECOVERY
   ========================================================= */
$("recoveryBackLink").addEventListener("click", () => {
  showScreen(recoveryReturnScreen);
});

$("recoverAccountBtn").addEventListener("click", handleRecoverAccount);
$("setNewPinBtn").addEventListener("click", handleSetNewPin);

function showRecoveryScreen(returnScreen) {
  recoveryReturnScreen = returnScreen;
  pendingRecovery = null;

  $("recoveryPinInput").value = "";
  $("newPinInput").value = "";
  $("newPinConfirmInput").value = "";
  clearMessage($("recoveryMessage"));
  clearMessage($("recoveryStep2Message"));

  $("recoveryStep1").style.display = "block";
  $("recoveryStep2").style.display = "none";

  showScreen("recovery");
}

async function handleRecoverAccount() {
  const msgEl = $("recoveryMessage");
  clearMessage(msgEl);

  const recoveryPIN = $("recoveryPinInput").value.trim();

  if (!/^\d{6}$/.test(recoveryPIN)) {
    showMessage(msgEl, "Please enter a valid 6-digit Recovery PIN.", "error");
    return;
  }

  const btn = $("recoverAccountBtn");
  btn.disabled = true;

  try {
    const data = await callBackend("recoverAccount", { recoveryPIN });

    pendingRecovery = {
      sheetId: data.sheetId,
      businessName: data.businessName,
      recoveryPIN: recoveryPIN,
    };

    $("recoveryStep1").style.display = "none";
    $("recoveryStep2").style.display = "block";
  } catch (err) {
    showMessage(msgEl, "Recovery PIN not found. Please check and try again.", "error");
  } finally {
    btn.disabled = false;
  }
}

function handleSetNewPin() {
  const msgEl = $("recoveryStep2Message");
  clearMessage(msgEl);

  const newPin = $("newPinInput").value.trim();
  const newPinConfirm = $("newPinConfirmInput").value.trim();

  if (!pendingRecovery) {
    showMessage(msgEl, "Something went wrong. Please start recovery again.", "error");
    return;
  }
  if (!/^\d{4}$/.test(newPin)) {
    showMessage(msgEl, "PIN must be exactly 4 digits.", "error");
    return;
  }
  if (newPin !== newPinConfirm) {
    showMessage(msgEl, "PINs do not match.", "error");
    return;
  }

  localStorage.setItem(LS_SHEET_ID, pendingRecovery.sheetId);
  localStorage.setItem(LS_BUSINESS_NAME, pendingRecovery.businessName);
  localStorage.setItem(LS_ACCESS_PIN_HASH, simpleHash(newPin));
  localStorage.setItem(LS_RECOVERY_PIN, pendingRecovery.recoveryPIN);

  sessionStorage.setItem(SS_AUTHENTICATED, "true");
  applyBusinessNameToHeader(pendingRecovery.businessName);

  pendingRecovery = null;
  showScreen("home");
}

/* =========================================================
   SCREEN 4 — HOME
   ========================================================= */
$("cardSale").addEventListener("click", () => showScreen("sale"));
$("cardExpense").addEventListener("click", () => showScreen("expense"));
$("cardCollections").addEventListener("click", () => showScreen("collections"));
$("cardManageProducts").addEventListener("click", () => showScreen("products"));
$("cardDailyReport").addEventListener("click", () => showScreen("dailyReport"));
$("syncNowBtn").addEventListener("click", () => syncPendingEntries());

[$("cardSale"), $("cardExpense"), $("cardCollections"), $("cardManageProducts"), $("cardDailyReport")].forEach((card) => {
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      card.click();
    }
  });
});

function loadHomeData() {
  clearMessage($("homeMessage"));
  refreshSyncBadge();
  updateLastSyncedText();
  loadDailySummary();
  loadRecentEntries();
  if (navigator.onLine) syncPendingEntries();
}

async function loadDailySummary() {
  const revenueEl = $("statRevenueValue");
  const profitEl = $("statProfitValue");
  const profitPercentEl = $("statProfitPercentValue");

  [revenueEl, profitEl, profitPercentEl].forEach((el) => {
    el.classList.add("shimmer");
    el.classList.remove("positive", "negative");
    el.textContent = "\u00A0";
  });

  const sheetId = localStorage.getItem(LS_SHEET_ID);

  try {
    const data = await callBackend("getDailySummary", { sheetId });

    const revenue = safeFloat(data.revenue);
    const profit = safeFloat(data.profit);
    const profitPercentage = safeFloat(data.profitPercentage);

    revenueEl.textContent = getCurrency() + revenue;

    profitEl.textContent = getCurrency() + profit;
    profitEl.classList.add(profit < 0 ? "negative" : "positive");

    profitPercentEl.textContent = profitPercentage.toFixed(1) + "%";
    profitPercentEl.classList.add(profitPercentage < 0 ? "negative" : "positive");
  } catch (err) {
    revenueEl.textContent = "—";
    profitEl.textContent = "—";
    profitPercentEl.textContent = "—";
  } finally {
    [revenueEl, profitEl, profitPercentEl].forEach((el) => el.classList.remove("shimmer"));
  }
}

async function loadRecentEntries() {
  const loadingEl = $("recentEntriesLoading");
  const listEl = $("recentEntriesList");

  listEl.innerHTML = "";
  loadingEl.style.display = "flex";

  const sheetId = localStorage.getItem(LS_SHEET_ID);

  try {
    const data = await callBackend("getRecentEntries", { sheetId });
    renderRecentEntries(data.entries || []);
  } catch (err) {
    listEl.innerHTML = `<div class="empty-state">${t("error")}</div>`;
  } finally {
    loadingEl.style.display = "none";
  }
}

function getTabBadgeInfo(tab) {
  if (tab === "Sales") return { label: t("sale"), className: "sale" };
  if (tab === "Expenses") return { label: t("expense"), className: "expense" };
  if (tab === "Collections") return { label: t("collection"), className: "collection" };
  return { label: tab, className: "" };
}

function renderRecentEntries(entries) {
  const listEl = $("recentEntriesList");
  listEl.innerHTML = "";

  if (entries.length === 0) {
    listEl.innerHTML = `<div class="empty-state">${t("noData")}</div>`;
    return;
  }

  entries.forEach((entry) => {
    const badgeInfo = getTabBadgeInfo(entry.tab);
    const valueText = entry.tab === "Sales" ? t("qty") + ": " + entry.value : getCurrency() + entry.value;

    const card = document.createElement("div");
    card.className = "entry-card";

    const badge = document.createElement("span");
    badge.className = "entry-badge " + badgeInfo.className;
    badge.textContent = badgeInfo.label;
    card.appendChild(badge);

    const details = document.createElement("div");
    details.className = "entry-details";

    const desc = document.createElement("div");
    desc.className = "entry-desc";
    desc.textContent = entry.label || "(no description)";
    details.appendChild(desc);

    const meta = document.createElement("div");
    meta.className = "entry-meta";
    meta.textContent = entry.date + " • " + valueText;
    details.appendChild(meta);

    card.appendChild(details);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "entry-delete-btn";
    deleteBtn.textContent = t("delete");
    deleteBtn.addEventListener("click", () => handleDeleteEntry(entry.tab, entry.rowIndex));
    card.appendChild(deleteBtn);

    listEl.appendChild(card);
  });
}

async function handleDeleteEntry(tab, rowIndex) {
  const confirmed = window.confirm(t("deleteEntryConfirm"));
  if (!confirmed) return;

  const msgEl = $("homeMessage");
  clearMessage(msgEl);
  const sheetId = localStorage.getItem(LS_SHEET_ID);

  try {
    await callBackend("deleteEntry", { sheetId, tabName: tab, rowIndex });
    showMessage(msgEl, t("success"), "success");
    loadRecentEntries();
    loadDailySummary();
  } catch (err) {
    showMessage(msgEl, t("error") + " (" + err.message + ")", "error");
  }
}

/* =========================================================
   SCREEN 5 — RECORD A SALE
   ========================================================= */
/**
 * Parses a value to a finite number, defaulting to 0 for anything
 * missing, blank, or non-numeric. Used everywhere a Cost/Price/
 * Sell Price value is read before display or before being sent to
 * the backend, so "BDT undefined" / "BDT NaN" can never render.
 */
function safeFloat(value) {
  const n = parseFloat(value);
  return isNaN(n) || !isFinite(n) ? 0 : n;
}

/**
 * Normalizes a product entry into a consistent shape. The backend
 * always returns { name, size, cost, price, rowIndex } now, with
 * cost/price already numeric — this keeps things safe regardless
 * (a plain string product, or a stale/malformed response).
 */
function normalizeProduct(product) {
  if (typeof product === "string") {
    return { name: product, size: "", cost: 0, price: 0, rowIndex: null };
  }
  return {
    name: product.name || product.itemName || "",
    size: product.size || "",
    cost: safeFloat(product.cost),
    price: safeFloat(product.price),
    rowIndex: product.rowIndex !== undefined ? product.rowIndex : null,
  };
}

// Used on the Manage Products list: "Name | Size | Cost: BDT XX | Price: BDT XX"
function buildProductMetaText(product) {
  const parts = [];
  if (product.size) parts.push(product.size);
  parts.push(t("costPrice") + ": " + getCurrency() + product.cost);
  parts.push(t("price") + ": " + getCurrency() + product.price);
  return " | " + parts.join(" | ");
}

// Used on the Record a Sale selection cards: "Name | Size | Cost: BDT XX | Price: BDT XX"
function buildSaleCardMetaText(product) {
  const parts = [];
  if (product.size) parts.push(product.size);
  parts.push(t("costPrice") + ": " + getCurrency() + product.cost);
  parts.push(t("price") + ": " + getCurrency() + product.price);
  return " | " + parts.join(" | ");
}

function sortProductsAlphabetically(products) {
  return products.slice().sort((a, b) => {
    const nameA = normalizeProduct(a).name.toLowerCase();
    const nameB = normalizeProduct(b).name.toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

async function loadProductsForSale() {
  const listEl = $("saleProductList");
  const loadingEl = $("saleLoading");
  const formEl = $("saleFormFields");
  const msgEl = $("saleMessage");

  clearMessage(msgEl);
  selectedProduct = null;
  listEl.innerHTML = "";
  formEl.style.display = "none";
  loadingEl.style.display = "flex";

  const sheetId = localStorage.getItem(LS_SHEET_ID);

  try {
    const data = await callBackend("getProducts", { sheetId });
    const sortedProducts = sortProductsAlphabetically(data.products || []);
    renderProductList(sortedProducts);
    formEl.style.display = "block";
  } catch (err) {
    showMessage(msgEl, t("error") + " (" + err.message + ")", "error");
  } finally {
    loadingEl.style.display = "none";
  }
}

function renderProductList(products) {
  const listEl = $("saleProductList");
  listEl.innerHTML = "";

  if (products.length === 0) {
    listEl.innerHTML = `<div class="empty-state">${t("noData")}</div>`;
    return;
  }

  products.forEach((rawProduct) => {
    const product = normalizeProduct(rawProduct);
    const metaText = buildSaleCardMetaText(product);

    const card = document.createElement("div");
    card.className = "product-card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");

    const nameEl = document.createElement("span");
    nameEl.className = "product-card-name";
    nameEl.textContent = product.name;
    card.appendChild(nameEl);

    const metaEl = document.createElement("span");
    metaEl.className = "product-card-meta";
    metaEl.textContent = metaText;
    card.appendChild(metaEl);

    card.addEventListener("click", () => selectProduct(product, card));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectProduct(product, card);
      }
    });

    listEl.appendChild(card);
  });
}

function selectProduct(product, cardEl) {
  selectedProduct = product; // full { name, size, cost, price, rowIndex } object
  document.querySelectorAll("#saleProductList .product-card").forEach((c) => {
    c.classList.remove("selected");
  });
  cardEl.classList.add("selected");
}

$("saveSaleBtn").addEventListener("click", handleSaveSale);

async function handleSaveSale() {
  const msgEl = $("saleMessage");
  clearMessage(msgEl);

  if (!selectedProduct) {
    showMessage(msgEl, "Please select a product.", "error");
    return;
  }

  const quantityRaw = $("quantityInput").value.trim();
  const quantity = Number(quantityRaw);

  if (!quantityRaw || isNaN(quantity) || quantity <= 0) {
    showMessage(msgEl, "Please enter a valid quantity.", "error");
    $("quantityInput").focus();
    return;
  }

  const notes = $("notesInput").value.trim();
  const sheetId = localStorage.getItem(LS_SHEET_ID);

  const entry = {
    action: "saveSale",
    sheetId,
    itemName: selectedProduct.name,
    quantity: quantityRaw,
    sellPrice: safeFloat(selectedProduct.price),
    costPrice: safeFloat(selectedProduct.cost),
    notes,
  };

  const btn = $("saveSaleBtn");
  btn.disabled = true;

  try {
    if (!navigator.onLine) throw new Error("offline");

    await callBackend("saveSale", entry);
    markSynced();
    showMessage(msgEl, t("saleRecorded"), "success");
    resetSaleForm();
  } catch (err) {
    if (!navigator.onLine || err.message === "offline") {
      queuePendingEntry(entry);
      showMessage(msgEl, t("offline"), "error");
      resetSaleForm();
    } else {
      showMessage(msgEl, t("error") + " (" + err.message + ")", "error");
    }
  } finally {
    btn.disabled = false;
  }
}

function resetSaleForm() {
  selectedProduct = null;
  document.querySelectorAll("#saleProductList .product-card").forEach((c) => {
    c.classList.remove("selected");
  });
  $("quantityInput").value = "";
  $("notesInput").value = "";
}

/* =========================================================
   SCREEN 6 — RECORD AN EXPENSE
   ========================================================= */
$("saveExpenseBtn").addEventListener("click", handleSaveExpense);

async function handleSaveExpense() {
  const msgEl = $("expenseMessage");
  clearMessage(msgEl);

  const description = $("descriptionInput").value.trim();
  const amount = $("amountInput").value.trim();
  const sheetId = localStorage.getItem(LS_SHEET_ID);

  if (!description || !amount) {
    showMessage(msgEl, "Please fill in both fields.", "error");
    return;
  }

  const entry = {
    action: "saveExpense",
    sheetId,
    description,
    amount,
  };

  const btn = $("saveExpenseBtn");
  btn.disabled = true;

  try {
    if (!navigator.onLine) throw new Error("offline");

    await callBackend("saveExpense", entry);
    markSynced();
    showMessage(msgEl, t("expenseRecorded"), "success");
    clearExpenseForm();
  } catch (err) {
    if (!navigator.onLine || err.message === "offline") {
      queuePendingEntry(entry);
      showMessage(msgEl, t("offline"), "error");
      clearExpenseForm();
    } else {
      showMessage(msgEl, t("error") + " (" + err.message + ")", "error");
    }
  } finally {
    btn.disabled = false;
  }
}

function clearExpenseForm() {
  $("descriptionInput").value = "";
  $("amountInput").value = "";
}

/* =========================================================
   SCREEN 7 — COLLECTIONS
   ========================================================= */
$("saveCollectionBtn").addEventListener("click", handleSaveCollection);

async function handleSaveCollection() {
  const msgEl = $("collectionsMessage");
  clearMessage(msgEl);

  const description = $("collectionDescriptionInput").value.trim();
  const amount = $("collectionAmountInput").value.trim();
  const sheetId = localStorage.getItem(LS_SHEET_ID);

  if (!amount) {
    showMessage(msgEl, "Please enter an amount.", "error");
    return;
  }

  const entry = {
    action: "saveCollection",
    sheetId,
    description,
    amount,
  };

  const btn = $("saveCollectionBtn");
  btn.disabled = true;

  try {
    if (!navigator.onLine) throw new Error("offline");

    await callBackend("saveCollection", entry);
    markSynced();
    showMessage(msgEl, t("collectionRecorded"), "success");
    clearCollectionForm();
  } catch (err) {
    if (!navigator.onLine || err.message === "offline") {
      queuePendingEntry(entry);
      showMessage(msgEl, t("offline"), "error");
      clearCollectionForm();
    } else {
      showMessage(msgEl, t("error") + " (" + err.message + ")", "error");
    }
  } finally {
    btn.disabled = false;
  }
}

function clearCollectionForm() {
  $("collectionDescriptionInput").value = "";
  $("collectionAmountInput").value = "";
}

/* =========================================================
   SCREEN 8 — MANAGE PRODUCTS
   ========================================================= */
async function loadProductsForManage() {
  const listEl = $("productsList");
  const loadingEl = $("productsLoading");
  const msgEl = $("productsMessage");

  clearMessage(msgEl);
  listEl.style.display = "none";
  listEl.innerHTML = "";
  loadingEl.style.display = "flex";

  const sheetId = localStorage.getItem(LS_SHEET_ID);

  try {
    const data = await callBackend("getProducts", { sheetId });
    renderManageList(data.products || []);
  } catch (err) {
    showMessage(msgEl, t("error") + " (" + err.message + ")", "error");
  } finally {
    loadingEl.style.display = "none";
    listEl.style.display = "flex";
  }
}

function renderManageList(products) {
  const listEl = $("productsList");
  listEl.innerHTML = "";

  if (products.length === 0) {
    listEl.innerHTML = `<li class="empty-state">${t("noData")}</li>`;
    return;
  }

  products.forEach((rawProduct) => {
    const product = normalizeProduct(rawProduct);
    const metaText = buildProductMetaText(product);

    const li = document.createElement("li");

    const textWrap = document.createElement("div");
    textWrap.className = "product-text";

    const nameEl = document.createElement("span");
    nameEl.className = "product-name";
    nameEl.textContent = product.name;
    textWrap.appendChild(nameEl);

    if (metaText) {
      const metaEl = document.createElement("span");
      metaEl.className = "product-meta";
      metaEl.textContent = metaText;
      textWrap.appendChild(metaEl);
    }

    li.appendChild(textWrap);

    const actions = document.createElement("div");
    actions.className = "product-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn edit-btn";
    editBtn.setAttribute("aria-label", "Edit product");
    editBtn.textContent = "\u270E"; // pencil
    editBtn.addEventListener("click", () => startEditProduct(product));
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-btn delete-btn";
    deleteBtn.setAttribute("aria-label", "Delete product");
    deleteBtn.textContent = "\uD83D\uDDD1"; // trash emoji
    deleteBtn.addEventListener("click", () => handleDeleteProduct(product));
    actions.appendChild(deleteBtn);

    li.appendChild(actions);

    listEl.appendChild(li);
  });
}

function startEditProduct(product) {
  editingProductRowIndex = product.rowIndex;
  $("newProductInput").value = product.name;
  $("newProductSizeInput").value = product.size;
  $("newProductCostInput").value = product.cost;
  $("newProductPriceInput").value = product.price;
  $("addProductBtn").textContent = t("updateProduct");
  $("cancelEditProductBtn").style.display = "inline-flex";
  $("newProductInput").focus();
}

function cancelEditProduct() {
  editingProductRowIndex = null;
  $("newProductInput").value = "";
  $("newProductSizeInput").value = "";
  $("newProductCostInput").value = "";
  $("newProductPriceInput").value = "";
  $("addProductBtn").textContent = t("addProduct");
  $("cancelEditProductBtn").style.display = "none";
}

$("cancelEditProductBtn").addEventListener("click", cancelEditProduct);
$("addProductBtn").addEventListener("click", handleAddOrUpdateProduct);

async function handleAddOrUpdateProduct() {
  const msgEl = $("productsMessage");
  clearMessage(msgEl);

  const name = $("newProductInput").value.trim();
  const size = $("newProductSizeInput").value.trim();
  const cost = $("newProductCostInput").value.trim();
  const price = $("newProductPriceInput").value.trim();
  const sheetId = localStorage.getItem(LS_SHEET_ID);

  if (!name) {
    showMessage(msgEl, "Please enter a product name.", "error");
    return;
  }

  const btn = $("addProductBtn");
  btn.disabled = true;

  try {
    if (editingProductRowIndex) {
      await callBackend("updateProduct", { sheetId, rowIndex: editingProductRowIndex, name, size, cost, price });
      showMessage(msgEl, t("success"), "success");
    } else {
      await callBackend("addProduct", { sheetId, name, size, cost, price });
      showMessage(msgEl, t("success"), "success");
    }
    cancelEditProduct();
    loadProductsForManage();
  } catch (err) {
    showMessage(msgEl, t("error") + " (" + err.message + ")", "error");
  } finally {
    btn.disabled = false;
  }
}

async function handleDeleteProduct(product) {
  const confirmed = window.confirm(t("confirmDeleteProduct"));
  if (!confirmed) return;

  const msgEl = $("productsMessage");
  clearMessage(msgEl);
  const sheetId = localStorage.getItem(LS_SHEET_ID);

  try {
    await callBackend("deleteProduct", { sheetId, rowIndex: product.rowIndex });
    showMessage(msgEl, "Product deleted.", "success");
    if (editingProductRowIndex === product.rowIndex) cancelEditProduct();
    loadProductsForManage();
  } catch (err) {
    showMessage(msgEl, t("error") + " (" + err.message + ")", "error");
  }
}

/* =========================================================
   DAILY REPORT SCREEN
   ========================================================= */

function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// "2026-07-21" -> "21/07/2026" (the DD/MM/YYYY format the backend expects)
function isoDateToDDMMYYYY(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// "2026-07-21" -> "Tuesday, 21 July 2026"
// Built from local y/m/d components (not `new Date(isoString)`) so the
// weekday never shifts a day off due to UTC-vs-local parsing.
function formatLongDateFromISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const weekday = dateObj.toLocaleDateString("en-US", { weekday: "long" });
  const month = dateObj.toLocaleDateString("en-US", { month: "long" });
  return `${weekday}, ${d} ${month} ${y}`;
}

function initDailyReportScreen() {
  const dateInput = $("reportDateInput");
  if (!dateInput.value) {
    dateInput.value = todayISODate();
  }
  loadDailyReport(dateInput.value);
}

$("reportDateInput").addEventListener("change", (e) => {
  if (e.target.value) loadDailyReport(e.target.value);
});

async function loadDailyReport(isoDate) {
  const msgEl = $("reportMessage");
  const loadingEl = $("reportLoading");
  const contentEl = $("reportContent");

  clearMessage(msgEl);
  contentEl.style.display = "none";
  loadingEl.style.display = "flex";

  $("reportDateDisplay").textContent = formatLongDateFromISO(isoDate);

  const sheetId = localStorage.getItem(LS_SHEET_ID);
  const businessName = localStorage.getItem(LS_BUSINESS_NAME) || "";
  const ddmmyyyy = isoDateToDDMMYYYY(isoDate);

  try {
    const data = await callBackend("getDailyReport", { sheetId, date: ddmmyyyy });

    renderReportSales(data.sales || []);
    renderReportCollections(data.collections || []);
    renderReportExpenses(data.expenses || []);
    renderReportSummary(data.summary || {});

    $("printBusinessName").textContent = businessName;
    $("printReportDate").textContent = formatLongDateFromISO(isoDate);
    $("printHeaderBusinessName").textContent = businessName;
    $("reportGeneratedNote").textContent = t("reportGenerated") + " — sales.digiwizr.com";

    contentEl.style.display = "block";
  } catch (err) {
    showMessage(msgEl, t("error") + " (" + err.message + ")", "error");
  } finally {
    loadingEl.style.display = "none";
  }
}

function renderReportSales(sales) {
  const el = $("reportSalesBody");

  if (sales.length === 0) {
    el.innerHTML = `<div class="report-empty-state">${t("noData")}</div>`;
    return;
  }

  let total = 0;
  const rows = sales.map((s) => {
    const qty = safeFloat(s.quantity);
    const unitPrice = safeFloat(s.sellPrice);
    const rowTotal = qty * unitPrice;
    total += rowTotal;
    return `
      <div class="report-table-row">
        <span>${escapeHtml(s.itemName)}</span>
        <span>${escapeHtml(s.size || "")}</span>
        <span>${qty}</span>
        <span>${getCurrency()}${unitPrice}</span>
        <span>${getCurrency()}${roundTo2Display(rowTotal)}</span>
      </div>`;
  }).join("");

  el.innerHTML = `
    <div class="report-table">
      <div class="report-table-header-row">
        <span>${t("product")}</span><span>${t("sizeColumn")}</span><span>${t("qty")}</span><span>${t("unitPrice")}</span><span>${t("total")}</span>
      </div>
      ${rows}
      <div class="report-subtotal-row"><span>${t('totalSales')}:</span><span>${getCurrency()}${roundTo2Display(total)}</span></div>
    </div>`;
}

function renderReportTwoColumnSection(elId, entries, emptyText, subtotalLabel) {
  const el = $(elId);

  if (entries.length === 0) {
    el.innerHTML = `<div class="report-empty-state">${emptyText}</div>`;
    return;
  }

  let total = 0;
  const rows = entries.map((entry) => {
    const amount = safeFloat(entry.amount);
    total += amount;
    return `
      <div class="report-2col-row">
        <span>${escapeHtml(entry.description || "(no description)")}</span>
        <span>${getCurrency()}${amount}</span>
      </div>`;
  }).join("");

  el.innerHTML = `
    <div class="report-table">
      ${rows}
      <div class="report-subtotal-row"><span>${subtotalLabel}</span><span>${getCurrency()}${roundTo2Display(total)}</span></div>
    </div>`;
}

function renderReportCollections(collections) {
  renderReportTwoColumnSection(
    "reportCollectionsBody",
    collections,
    t("noData"),
    t("totalCollections") + ":"
  );
}

function renderReportExpenses(expenses) {
  renderReportTwoColumnSection(
    "reportExpensesBody",
    expenses,
    t("noData"),
    t("totalExpenses") + ":"
  );
}

function renderReportSummary(summary) {
  const totalCashIn = safeFloat(summary.totalCashIn);
  const totalExpenses = safeFloat(summary.totalExpenses);
  const costOfGoodsSold = safeFloat(summary.costOfGoodsSold);
  const grossProfit = safeFloat(summary.grossProfit);
  const profitPercentage = safeFloat(summary.profitPercentage);

  const profitClass = grossProfit < 0 ? "negative" : "positive";
  const profitPctClass = profitPercentage < 0 ? "negative" : "positive";

  $("reportSummaryBody").innerHTML = `
    <div class="report-summary-row"><span>${t('totalCashIn')}</span><span class="value">${getCurrency()}${roundTo2Display(totalCashIn)}</span></div>
    <div class="report-summary-row"><span>${t('totalExpenses')}</span><span class="value">${getCurrency()}${roundTo2Display(totalExpenses)}</span></div>
    <div class="report-summary-row"><span>${t('costOfGoodsSold')}</span><span class="value">${getCurrency()}${roundTo2Display(costOfGoodsSold)}</span></div>
    <div class="report-summary-row"><span>${t('grossProfit')}</span><span class="value ${profitClass}">${getCurrency()}${roundTo2Display(grossProfit)}</span></div>
    <div class="report-summary-row"><span>Profit Percentage</span><span class="value ${profitPctClass}">${profitPercentage.toFixed(1)}%</span></div>
  `;
}

function roundTo2Display(n) {
  return Math.round(safeFloat(n) * 100) / 100;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

$("downloadPdfBtn").addEventListener("click", () => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  $("printFooterLine").textContent =
    `Generated on ${dd}/${mm}/${yyyy} at ${hh}:${min} — sales.digiwizr.com`;

  window.print();
});

/* =========================================================
   OFFLINE HANDLING & PENDING SYNC QUEUE
   ========================================================= */
function getPendingSync() {
  try {
    return JSON.parse(localStorage.getItem(LS_PENDING_SYNC)) || [];
  } catch (e) {
    return [];
  }
}

function setPendingSync(list) {
  localStorage.setItem(LS_PENDING_SYNC, JSON.stringify(list));
}

function queuePendingEntry(entry) {
  const pending = getPendingSync();
  pending.push(Object.assign({}, entry, { timestamp: new Date().toISOString() }));
  setPendingSync(pending);
  refreshSyncBadge();
}

/**
 * Attempts to send every queued entry to the backend. Entries that
 * succeed are removed from the queue; entries that fail stay queued
 * for the next attempt.
 */
async function syncPendingEntries() {
  if (!BACKEND_URL) return;

  const pending = getPendingSync();
  if (pending.length === 0) return;

  const stillPending = [];
  let anySucceeded = false;

  for (const entry of pending) {
    try {
      const { action, timestamp, ...params } = entry;
      await callBackend(action, params);
      anySucceeded = true;
    } catch (err) {
      stillPending.push(entry);
    }
  }

  setPendingSync(stillPending);
  refreshSyncBadge();

  if (anySucceeded) {
    markSynced();
    if (screens.home.classList.contains("active")) {
      loadDailySummary();
      loadRecentEntries();
    }
  }
}

function refreshSyncBadge() {
  const pending = getPendingSync();
  syncBadge.classList.toggle("visible", pending.length > 0);
  syncBadgeText.textContent =
    pending.length > 0
      ? `${pending.length} ${t("pendingSync")}`
      : "";
}

function updateOfflineBanner() {
  offlineBanner.classList.toggle("visible", !navigator.onLine);
}

window.addEventListener("online", () => {
  updateOfflineBanner();
  syncPendingEntries();
});

window.addEventListener("offline", updateOfflineBanner);

/* =========================================================
   iOS SAFARI "ADD TO HOME SCREEN" BANNER
   ========================================================= */
function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isIosSafari() {
  const ua = navigator.userAgent;
  const isSafariUA = /Safari/.test(ua);
  const isOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|mercury/.test(ua);
  return isIosDevice() && isSafariUA && !isOtherBrowser;
}

function isRunningStandalone() {
  const iosStandalone = window.navigator.standalone === true;
  const displayModeStandalone = window.matchMedia("(display-mode: standalone)").matches;
  return iosStandalone || displayModeStandalone;
}

function shouldShowIosInstallBanner() {
  if (isRunningStandalone()) return false;
  if (!isIosSafari()) return false;
  if (localStorage.getItem(LS_IOS_BANNER_DISMISSED) === "true") return false;
  return true;
}

function showIosInstallBanner() {
  $("iosInstallBanner").classList.add("visible");
  document.body.classList.add("ios-banner-visible");
}

function dismissIosInstallBanner() {
  $("iosInstallBanner").classList.remove("visible");
  document.body.classList.remove("ios-banner-visible");
  localStorage.setItem(LS_IOS_BANNER_DISMISSED, "true");
}

function initIosInstallBanner() {
  if (shouldShowIosInstallBanner()) showIosInstallBanner();
  $("iosBannerClose").addEventListener("click", dismissIosInstallBanner);
}

/* =========================================================
   APP INIT
   ========================================================= */
function init() {
  initLanguageSwitcher();
  updateOfflineBanner();
  initIosInstallBanner();

  const savedSheetId = localStorage.getItem(LS_SHEET_ID);
  const savedBusinessName = localStorage.getItem(LS_BUSINESS_NAME);
  const isAuthenticated = sessionStorage.getItem(SS_AUTHENTICATED) === "true";

  if (!savedSheetId) {
    recoveryReturnScreen = "setup";
    showScreen("setup");
    return;
  }

  applyBusinessNameToHeader(savedBusinessName || "");

  if (isAuthenticated) {
    showScreen("home");
    if (navigator.onLine) syncPendingEntries();
  } else {
    recoveryReturnScreen = "pinEntry";
    showScreen("pinEntry");
  }
}

init();
