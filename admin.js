// admin.js — MAHAT Admin Dashboard

document.addEventListener("DOMContentLoaded", async () => {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const pwd = prompt("Enter Admin Password:");
  if (pwd !== "mahatadmin123") {
    alert("Incorrect password!");
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;flex-direction:column;gap:1rem">
        <h1 style="color:#ef4444">Access Denied</h1>
        <p>Incorrect password. <a href="pricelist/index.html">Go back to store</a></p>
      </div>`;
    return;
  }

  let catalogData = null;

  // ── Toast ────────────────────────────────────────────────────────────────────
  function showToast(msg, type = "success") {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.className = `toast show ${type}`;
    setTimeout(() => { t.className = "toast"; }, 3500);
  }

  // ── Loading overlay ──────────────────────────────────────────────────────────
  const loadingOverlay = document.getElementById("loading-overlay");
  function setLoading(on) {
    loadingOverlay.classList.toggle("hidden", !on);
  }

  // ── Slug helper ──────────────────────────────────────────────────────────────
  function slug(text) {
    return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
  }

  // ── Load catalog ─────────────────────────────────────────────────────────────
  try {
    setLoading(true);
    catalogData = await window.loadDatabaseCatalog();
    setLoading(false);
    renderEditor();
  } catch (e) {
    setLoading(false);
    showToast("Error loading catalog data. Check console.", "error");
    console.error(e);
  }

  // ── Render editor ────────────────────────────────────────────────────────────
  function renderEditor() {
    document.getElementById("brand-input").value = catalogData.brand || "";
    document.getElementById("edition-input").value = catalogData.edition || "";
    document.getElementById("phones-input").value = (catalogData.phones || []).join(", ");
    renderCategories();
  }

  function renderCategories() {
    const container = document.getElementById("editor-container");
    container.innerHTML = "";

    (catalogData.categories || []).forEach((cat, catIndex) => {
      container.appendChild(buildCategoryBlock(cat, catIndex));
    });
  }

  function buildCategoryBlock(cat, catIndex) {
    const catBlock = document.createElement("div");
    catBlock.className = "category-block";

    // Header
    const header = document.createElement("div");
    header.className = "category-header";

    const catNameInput = document.createElement("input");
    catNameInput.type = "text";
    catNameInput.value = cat.name;
    catNameInput.placeholder = "Category Name";
    catNameInput.addEventListener("input", (e) => {
      cat.name = e.target.value;
      cat.id = slug(e.target.value);
    });

    const removeCatBtn = document.createElement("button");
    removeCatBtn.className = "btn-remove-cat";
    removeCatBtn.textContent = "✕ Remove";
    removeCatBtn.addEventListener("click", () => {
      if (!confirm(`Remove entire category "${cat.name}"?`)) return;
      const idx = catalogData.categories.indexOf(cat);
      if (idx > -1) catalogData.categories.splice(idx, 1);
      renderCategories();
    });

    header.appendChild(catNameInput);
    header.appendChild(removeCatBtn);
    catBlock.appendChild(header);

    // Items
    const itemsDiv = document.createElement("div");
    itemsDiv.className = "category-items";

    function renderItems() {
      itemsDiv.innerHTML = "";
      cat.items.forEach((item, itemIndex) => {
        const row = document.createElement("div");
        row.className = "item-row";

        const titleInput = document.createElement("input");
        titleInput.type = "text";
        titleInput.value = item.title;
        titleInput.placeholder = "Book Title";
        titleInput.addEventListener("input", (e) => item.title = e.target.value);

        const priceInput = document.createElement("input");
        priceInput.type = "text";
        priceInput.value = item.price || "";
        priceInput.placeholder = "Price (e.g. 1,200)";
        priceInput.addEventListener("input", (e) => item.price = e.target.value);

        const removeBtn = document.createElement("button");
        removeBtn.className = "btn-remove";
        removeBtn.textContent = "✕";
        removeBtn.title = "Remove item";
        removeBtn.addEventListener("click", () => {
          cat.items.splice(itemIndex, 1);
          renderItems();
        });

        row.appendChild(titleInput);
        row.appendChild(priceInput);
        row.appendChild(removeBtn);
        itemsDiv.appendChild(row);
      });

      const addBtn = document.createElement("button");
      addBtn.className = "btn-add";
      addBtn.textContent = "+ Add Book";
      addBtn.addEventListener("click", () => {
        cat.items.push({ title: "", price: "" });
        renderItems();
      });
      itemsDiv.appendChild(addBtn);
    }

    renderItems();
    catBlock.appendChild(itemsDiv);
    return catBlock;
  }

  // ── Add new category button ──────────────────────────────────────────────────
  document.getElementById("btn-add-category").addEventListener("click", () => {
    const name = prompt("Enter new category name:") || "New Category";
    if (!catalogData.categories) catalogData.categories = [];
    catalogData.categories.push({ id: slug(name), name, items: [] });
    renderCategories();
    // scroll to bottom
    document.getElementById("editor-container").lastElementChild
      ?.scrollIntoView({ behavior: "smooth" });
  });

  // ── Save to DB ───────────────────────────────────────────────────────────────
  document.getElementById("btn-save").addEventListener("click", async () => {
    if (!catalogData) return;

    catalogData.brand = document.getElementById("brand-input").value;
    catalogData.edition = document.getElementById("edition-input").value;
    catalogData.phones = document.getElementById("phones-input").value
      .split(",").map(s => s.trim()).filter(Boolean);

    // Assign IDs from names
    (catalogData.categories || []).forEach(cat => {
      cat.id = cat.id || slug(cat.name);
    });

    const btn = document.getElementById("btn-save");
    btn.textContent = "Saving...";
    btn.disabled = true;

    try {
      await window.saveDatabaseCatalog(catalogData);
      btn.textContent = "💾 Save Prices to Database";
      btn.disabled = false;
      showToast("✅ Prices updated for all customers!", "success");
    } catch (err) {
      btn.textContent = "💾 Save Prices to Database";
      btn.disabled = false;
      showToast("❌ Failed to save. Check Firebase config.", "error");
    }
  });

  // ── Backup / Download ────────────────────────────────────────────────────────
  document.getElementById("btn-backup").addEventListener("click", () => {
    if (!catalogData) { showToast("No data to back up yet.", "error"); return; }

    // Collect current form values first
    catalogData.brand = document.getElementById("brand-input").value;
    catalogData.edition = document.getElementById("edition-input").value;
    catalogData.phones = document.getElementById("phones-input").value
      .split(",").map(s => s.trim()).filter(Boolean);

    const json = JSON.stringify(catalogData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    a.href = url;
    a.download = `catalog-backup-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("✅ Backup downloaded!", "success");
  });

  // ── PDF Upload & Parse ───────────────────────────────────────────────────────
  async function handlePdfUpload(file) {
    if (!file) return;
    const statusEl = document.getElementById("pdf-status");
    statusEl.className = "pdf-status loading visible";
    statusEl.textContent = "📖 Reading PDF... This may take a few seconds.";

    try {
      // Dynamically load PDF.js from CDN
      if (!window.pdfjsLib) {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        fullText += pageText + "\n\n";
      }

      // Parse extracted text into categories/items
      const parsed = parsePdfText(fullText);

      if (parsed.categories.length === 0) {
        statusEl.className = "pdf-status error visible";
        statusEl.textContent = "⚠️ Could not detect categories from this PDF. The text may be scanned/image-based (not selectable text). You can still add items manually below.";
        return;
      }

      // Merge parsed into catalog (add new categories, don't replace existing)
      if (!catalogData.categories) catalogData.categories = [];

      let added = 0;
      parsed.categories.forEach(newCat => {
        const existing = catalogData.categories.find(c =>
          c.name.toLowerCase() === newCat.name.toLowerCase()
        );
        if (existing) {
          // merge items not already present
          newCat.items.forEach(ni => {
            if (!existing.items.find(ei => ei.title.toLowerCase() === ni.title.toLowerCase())) {
              existing.items.push(ni);
              added++;
            }
          });
        } else {
          catalogData.categories.push(newCat);
          added += newCat.items.length;
        }
      });

      renderCategories();
      statusEl.className = "pdf-status visible";
      statusEl.textContent = `✅ Done! Found ${parsed.categories.length} categories and ${added} items. Review below and click Save.`;
    } catch (err) {
      console.error(err);
      statusEl.className = "pdf-status error visible";
      statusEl.textContent = `❌ Error reading PDF: ${err.message}`;
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  /**
   * Heuristic parser for school book price list PDFs.
   * Looks for UPPERCASE category headers and lines that look like "book title ... price"
   */
  function parsePdfText(text) {
    const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
    const categories = [];
    let currentCat = null;

    // Patterns
    const pricePattern = /[\d,]+(?:\.\d{1,2})?$/;
    const headerPattern = /^[A-Z][A-Z\s\-&/]{4,}$/; // ALL CAPS line = category header

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect category header (all caps, no numbers)
      if (headerPattern.test(line) && !/\d/.test(line) && line.length < 60) {
        currentCat = { id: slug(line), name: line, items: [] };
        categories.push(currentCat);
        continue;
      }

      // Detect item line (has a price at the end or following line)
      if (currentCat) {
        const priceMatch = line.match(/^(.+?)\s+([\d,]{3,})$/);
        if (priceMatch) {
          const title = priceMatch[1].trim();
          const price = priceMatch[2].trim();
          if (title.length > 2) {
            currentCat.items.push({ title, price });
          }
          continue;
        }

        // Line without price — just a title, check next line for price
        const nextLine = lines[i + 1] || "";
        const nextIsPrice = /^[\d,]{3,}$/.test(nextLine);
        if (nextIsPrice && line.length > 3 && line.length < 80 && !/^[A-Z\s]{10,}$/.test(line)) {
          currentCat.items.push({ title: line, price: nextLine.trim() });
          i++; // skip the price line
          continue;
        }

        // Line that looks like a book title (mixed case, reasonable length)
        if (line.length > 4 && line.length < 80 && /[a-zA-Z]/.test(line)) {
          // Only add if it doesn't look like a header/footer
          const looksLikeTitle = /[a-z]/.test(line) || /Vol|Book|Class|Nursery|Primary|Junior|Basic/i.test(line);
          if (looksLikeTitle) {
            currentCat.items.push({ title: line, price: "" });
          }
        }
      }
    }

    // Remove empty categories
    return { categories: categories.filter(c => c.items.length > 0) };
  }

  // Wire up both PDF upload inputs
  ["pdf-upload-input", "pdf-upload-input2"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) handlePdfUpload(file);
      e.target.value = ""; // reset so same file can be re-picked
    });
  });
});
