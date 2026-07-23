document.addEventListener("DOMContentLoaded", async () => {
  let catalogData = null;

  try {
    const res = await fetch("pricelist/data/catalog.json");
    if (!res.ok) throw new Error("Failed to load catalog.json");
    catalogData = await res.json();
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

  document.getElementById("btn-export").addEventListener("click", () => {
    if (!catalogData) return;
    
    catalogData.brand = document.getElementById("brand-input").value;
    catalogData.edition = document.getElementById("edition-input").value;
    catalogData.phones = document.getElementById("phones-input").value.split(",").map(s => s.trim()).filter(Boolean);

    const jsonStr = JSON.stringify(catalogData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = "catalog.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert("Downloaded catalog.json! Please upload it to your GitHub repository in the 'pricelist/data' folder to apply changes.");
  });
});
