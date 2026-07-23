// pricelist/js/db.js
const firebaseConfig = {
  apiKey: "AIzaSyA_VomVhNVx4251igEdumkbf_iDK7PJoiM",
  authDomain: "mahat-ventures.firebaseapp.com",
  databaseURL: "https://mahat-ventures-default-rtdb.firebaseio.com",
  projectId: "mahat-ventures",
  storageBucket: "mahat-ventures.firebasestorage.app",
  messagingSenderId: "188096910263",
  appId: "1:188096910263:web:201fd952445d645866ce32",
  measurementId: "G-J698WTK3MS"
};

// Initialize Firebase (guard against double-init)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

/**
 * Resolves the correct path to catalog.json regardless of which page we're on.
 * Works on: local dev, GitHub Pages (/mahat-ventures/), Vercel (/)
 */
function getCatalogFallbackUrl() {
  const path = window.location.pathname;
  // If we're inside /pricelist/ we go up one level: ../data/catalog.json
  if (path.includes("/pricelist/")) {
    return "../data/catalog.json";
  }
  // If we're at root admin.html, data lives in pricelist/data/
  return "pricelist/data/catalog.json";
}

/**
 * Loads the catalog from Firebase.
 * Falls back to the local catalog.json if Firebase is empty or fails.
 */
window.loadDatabaseCatalog = async function() {
  try {
    const snapshot = await db.ref('/catalog').once('value');
    const data = snapshot.val();
    if (data) {
      console.log("✅ Loaded catalog from Firebase.");
      return data;
    }
    console.log("Firebase is empty, falling back to local JSON.");
  } catch (err) {
    console.warn("Firebase load failed, falling back to local JSON.", err.message);
  }

  const fallbackUrl = getCatalogFallbackUrl();
  console.log("Fetching fallback:", fallbackUrl);
  const res = await fetch(fallbackUrl);
  if (!res.ok) throw new Error(`Could not load fallback catalog from ${fallbackUrl} (${res.status})`);
  return await res.json();
};

/**
 * Saves the catalog to Firebase.
 */
window.saveDatabaseCatalog = async function(catalogData) {
  await db.ref('/catalog').set(catalogData);
  return true;
};
