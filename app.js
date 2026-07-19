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

// sessionStorage key (cleared when the browser tab/app session ends)
const SS_AUTHENTICATED = "digiwizr_authenticated";

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
};

// Screens reachable via the shared header back button (always returns Home)
const BACK_TO_HOME_SCREENS = ["sale", "expense", "collections", "products"];

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
    lastSyncedText.textContent = "Last synced: Never";
    return;
  }
  lastSyncedText.textContent = "Last synced: " + formatDateTimeDisplay(new Date(iso));
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
$("manageProductsLink").addEventListener("click", () => showScreen("products"));
$("syncNowBtn").addEventListener("click", () => syncPendingEntries());

[$("cardSale"), $("cardExpense"), $("cardCollections")].forEach((card) => {
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

    revenueEl.textContent = "BDT " + data.revenue;

    profitEl.textContent = "BDT " + data.profit;
    profitEl.classList.add(data.profit < 0 ? "negative" : "positive");

    profitPercentEl.textContent = Number(data.profitPercentage).toFixed(1) + "%";
    profitPercentEl.classList.add(data.profitPercentage < 0 ? "negative" : "positive");
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
    listEl.innerHTML = '<div class="empty-state">Could not load recent entries.</div>';
  } finally {
    loadingEl.style.display = "none";
  }
}

const TAB_BADGE_INFO = {
  Sales: { label: "SALE", className: "sale" },
  Expenses: { label: "EXPENSE", className: "expense" },
  Collections: { label: "COLLECTION", className: "collection" },
};

function renderRecentEntries(entries) {
  const listEl = $("recentEntriesList");
  listEl.innerHTML = "";

  if (entries.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No entries yet.</div>';
    return;
  }

  entries.forEach((entry) => {
    const badgeInfo = TAB_BADGE_INFO[entry.tab] || { label: entry.tab, className: "" };
    const valueText = entry.tab === "Sales" ? "Qty: " + entry.value : "BDT " + entry.value;

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
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => handleDeleteEntry(entry.tab, entry.rowIndex));
    card.appendChild(deleteBtn);

    listEl.appendChild(card);
  });
}

async function handleDeleteEntry(tab, rowIndex) {
  const confirmed = window.confirm("Delete this entry?");
  if (!confirmed) return;

  const msgEl = $("homeMessage");
  clearMessage(msgEl);
  const sheetId = localStorage.getItem(LS_SHEET_ID);

  try {
    await callBackend("deleteEntry", { sheetId, tabName: tab, rowIndex });
    showMessage(msgEl, "Entry deleted.", "success");
    loadRecentEntries();
    loadDailySummary();
  } catch (err) {
    showMessage(msgEl, "Could not delete entry: " + err.message, "error");
  }
}

/* =========================================================
   SCREEN 5 — RECORD A SALE
   ========================================================= */
/**
 * Normalizes a product entry into a consistent shape. The backend
 * always returns { name, size, cost, price, rowIndex } now, but
 * this keeps things safe if a plain string ever slips through.
 */
function normalizeProduct(product) {
  if (typeof product === "string") {
    return { name: product, size: "", cost: "", price: "", rowIndex: null };
  }
  return {
    name: product.name || product.itemName || "",
    size: product.size || "",
    cost: product.cost !== undefined && product.cost !== null ? product.cost : "",
    price: product.price !== undefined && product.price !== null ? product.price : "",
    rowIndex: product.rowIndex !== undefined ? product.rowIndex : null,
  };
}

// Used on the Manage Products list: "Name | Size | BDT Cost | BDT Price"
function buildProductMetaText(product) {
  const parts = [];
  if (product.size) parts.push(product.size);
  if (product.cost !== "") parts.push("BDT " + product.cost);
  if (product.price !== "") parts.push("BDT " + product.price);
  return parts.length ? " | " + parts.join(" | ") : "";
}

// Used on the Record a Sale selection cards: "Name | Size | Cost: BDT X | Price: BDT Y"
function buildSaleCardMetaText(product) {
  const parts = [];
  if (product.size) parts.push(product.size);
  parts.push("Cost: BDT " + (product.cost !== "" ? product.cost : 0));
  parts.push("Price: BDT " + (product.price !== "" ? product.price : 0));
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
    showMessage(msgEl, "Could not load products: " + err.message, "error");
  } finally {
    loadingEl.style.display = "none";
  }
}

function renderProductList(products) {
  const listEl = $("saleProductList");
  listEl.innerHTML = "";

  if (products.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No products yet. Add some from "Manage Products".</div>';
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
    sellPrice: selectedProduct.price !== "" ? selectedProduct.price : 0,
    costPrice: selectedProduct.cost !== "" ? selectedProduct.cost : 0,
    notes,
  };

  const btn = $("saveSaleBtn");
  btn.disabled = true;

  try {
    if (!navigator.onLine) throw new Error("offline");

    await callBackend("saveSale", entry);
    markSynced();
    showMessage(msgEl, "Sale recorded!", "success");
    resetSaleForm();
  } catch (err) {
    if (!navigator.onLine || err.message === "offline") {
      queuePendingEntry(entry);
      showMessage(msgEl, "Saved offline — will sync when connected", "error");
      resetSaleForm();
    } else {
      showMessage(msgEl, "Could not save sale: " + err.message, "error");
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
    showMessage(msgEl, "Expense recorded!", "success");
    clearExpenseForm();
  } catch (err) {
    if (!navigator.onLine || err.message === "offline") {
      queuePendingEntry(entry);
      showMessage(msgEl, "Saved offline — will sync when connected", "error");
      clearExpenseForm();
    } else {
      showMessage(msgEl, "Could not save expense: " + err.message, "error");
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
    showMessage(msgEl, "Collection recorded!", "success");
    clearCollectionForm();
  } catch (err) {
    if (!navigator.onLine || err.message === "offline") {
      queuePendingEntry(entry);
      showMessage(msgEl, "Saved offline — will sync when connected", "error");
      clearCollectionForm();
    } else {
      showMessage(msgEl, "Could not save collection: " + err.message, "error");
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
    showMessage(msgEl, "Could not load products: " + err.message, "error");
  } finally {
    loadingEl.style.display = "none";
    listEl.style.display = "flex";
  }
}

function renderManageList(products) {
  const listEl = $("productsList");
  listEl.innerHTML = "";

  if (products.length === 0) {
    listEl.innerHTML = '<li class="empty-state">No products added yet.</li>';
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
  $("addProductBtn").textContent = "Update Product";
  $("cancelEditProductBtn").style.display = "inline-flex";
  $("newProductInput").focus();
}

function cancelEditProduct() {
  editingProductRowIndex = null;
  $("newProductInput").value = "";
  $("newProductSizeInput").value = "";
  $("newProductCostInput").value = "";
  $("newProductPriceInput").value = "";
  $("addProductBtn").textContent = "Add Product";
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
      showMessage(msgEl, "Product updated!", "success");
    } else {
      await callBackend("addProduct", { sheetId, name, size, cost, price });
      showMessage(msgEl, "Product added!", "success");
    }
    cancelEditProduct();
    loadProductsForManage();
  } catch (err) {
    showMessage(msgEl, "Could not save product: " + err.message, "error");
  } finally {
    btn.disabled = false;
  }
}

async function handleDeleteProduct(product) {
  const confirmed = window.confirm("Delete this product?");
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
    showMessage(msgEl, "Could not delete product: " + err.message, "error");
  }
}

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
      ? `${pending.length} ${pending.length === 1 ? "entry" : "entries"} pending sync`
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
