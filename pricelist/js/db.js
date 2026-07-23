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
  
  // Fallback to local file depending on current page location
  const fallbackPath = window.location.pathname.includes('/admin.html') 
    ? "pricelist/data/catalog.json" 
    : "data/catalog.json";
    
  const res = await fetch(fallbackPath);
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
