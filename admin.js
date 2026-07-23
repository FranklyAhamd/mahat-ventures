document.addEventListener("DOMContentLoaded", async () => {
  // Simple password check to prevent random access
  const pwd = prompt("Enter Admin Password:");
  if (pwd !== "mahatadmin123") {
    alert("Incorrect password!");
    document.body.innerHTML = "<h1>Access Denied</h1>";
    return;
  }

  let catalogData = null;

  try {
    // Load from DB (or fallback)
    catalogData = await window.loadDatabaseCatalog();
    renderEditor();
  } catch (e) {
    alert("Error loading catalog data.");
    console.error(e);
  }

  function renderEditor() {
    document.getElementById("brand-input").value = catalogData.brand || "";
    document.getElementById("edition-input").value = catalogData.edition || "";
    document.getElementById("phones-input").value = (catalogData.phones || []).join(", ");

    const container = document.getElementById("editor-container");
    container.innerHTML = "";

    catalogData.categories.forEach((cat, catIndex) => {
      const catBlock = document.createElement("div");
      catBlock.className = "category-block";

      const header = document.createElement("div");
      header.className = "category-header";
      
      const catNameInput = document.createElement("input");
      catNameInput.type = "text";
      catNameInput.value = cat.name;
      catNameInput.style.fontWeight = "bold";
      catNameInput.addEventListener("input", (e) => cat.name = e.target.value);
      
      header.appendChild(catNameInput);
      catBlock.appendChild(header);

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
          priceInput.type = "number";
          priceInput.value = item.price || "";
          priceInput.placeholder = "Price";
          priceInput.addEventListener("input", (e) => item.price = Number(e.target.value));

          const removeBtn = document.createElement("button");
          removeBtn.className = "btn-remove";
          removeBtn.textContent = "Remove";
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
          cat.items.push({ title: "New Book", price: 0 });
          renderItems();
        });
        itemsDiv.appendChild(addBtn);
      }

      renderItems();
      catBlock.appendChild(itemsDiv);
      container.appendChild(catBlock);
    });
  }

  document.getElementById("btn-save").addEventListener("click", async () => {
    if (!catalogData) return;
    
    catalogData.brand = document.getElementById("brand-input").value;
    catalogData.edition = document.getElementById("edition-input").value;
    catalogData.phones = document.getElementById("phones-input").value.split(",").map(s => s.trim()).filter(Boolean);

    try {
      const btn = document.getElementById("btn-save");
      btn.textContent = "Saving...";
      btn.disabled = true;
      
      await window.saveDatabaseCatalog(catalogData);
      
      btn.textContent = "Saved!";
      setTimeout(() => {
        btn.textContent = "Save Prices to Database";
        btn.disabled = false;
      }, 2000);
      alert("Prices successfully updated for all customers!");
    } catch (err) {
      alert("Failed to save. Did you add your real Firebase config keys?");
      document.getElementById("btn-save").textContent = "Save Prices to Database";
      document.getElementById("btn-save").disabled = false;
    }
  });
});
