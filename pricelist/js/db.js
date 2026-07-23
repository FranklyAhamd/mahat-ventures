// pricelist/js/db.js
// FIREBASE CONFIGURATION
// REPLACE THESE WITH YOUR ACTUAL FIREBASE CONFIG KEYS
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/**
 * Loads the catalog from Firebase.
 * If Firebase is empty (or fails due to invalid config), it falls back to the local catalog.json.
 */
window.loadDatabaseCatalog = async function() {
  try {
    const snapshot = await db.ref('/catalog').once('value');
    const data = snapshot.val();
    if (data) {
      return data;
    }
  } catch (err) {
    console.warn("Firebase load failed (likely using placeholder config). Falling back to local JSON.");
  }
  
  // Fallback to local file
  const res = await fetch("data/catalog.json");
  if (!res.ok) throw new Error("Could not load fallback catalog");
  return await res.json();
};

/**
 * Saves the catalog to Firebase.
 */
window.saveDatabaseCatalog = async function(catalogData) {
  try {
    await db.ref('/catalog').set(catalogData);
    return true;
  } catch (err) {
    console.error("Failed to save to Firebase. Did you add your real config?", err);
    throw err;
  }
};
