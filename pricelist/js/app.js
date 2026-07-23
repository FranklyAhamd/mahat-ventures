(function () {
  "use strict";

  const NAIRA = "\u20A6";

  let catalog = null;
  let totalItems = 0;

  const $ = (sel) => document.querySelector(sel);

  function formatPrice(price) {
    if (!price || !String(price).trim()) return "";
    return `${NAIRA}${price.trim()}`;
  }

  function phoneLink(num) {
    return `tel:+234${num.replace(/^0/, "")}`;
  }

  function whatsappLink(num, message) {
    const n = "234" + num.replace(/^0/, "");
    return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
  }

  async function loadCatalog() {
    if (window.loadDatabaseCatalog) {
      catalog = await window.loadDatabaseCatalog();
    } else {
      const res = await fetch("data/catalog.json");
      if (!res.ok) throw new Error("Could not load catalog");
      catalog = await res.json();
    }
  }

  function countItems(categories) {
    return categories.reduce((sum, cat) => sum + cat.items.length, 0);
  }

  function renderMeta() {
    document.title = `${catalog.edition} | ${catalog.brand}`;
    $("#brand-name").textContent = catalog.brand;
    $("#edition").textContent = catalog.edition;
    $("#footer-brand").textContent = catalog.brand;
    $("#footer-edition").textContent = catalog.edition;
    $("#year").textContent = new Date().getFullYear();

    const orderMsg = `Hello ${catalog.brand}, I would like to make an enquiry/order from your ${catalog.edition}.`;
    const waUrl = whatsappLink(catalog.phones[0], orderMsg);
    $("#whatsapp-btn").href = waUrl;

    // Contact Pills in Hero
    const pillsHtml = catalog.phones
      .map(
        (p) => `
        <a href="${phoneLink(p)}" class="phone-pill">
          <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
          ${p}
        </a>`
      )
      .join("");
    $("#hero-contact-pills").innerHTML = pillsHtml;

    const cardsHtml = catalog.phones
      .map(
        (p, i) => `
      <a href="${whatsappLink(p, orderMsg)}" class="contact-card" target="_blank" rel="noopener">
        <div class="contact-card__icon">${i + 1}</div>
        <div>
          <div class="contact-card__label">Call or WhatsApp</div>
          <div class="contact-card__phone">${p}</div>
        </div>
      </a>`
      )
      .join("");
    $("#contact-cards").innerHTML = cardsHtml;
  }

  function renderNav(categories) {
    const nav = $("#publisher-chips");
    nav.innerHTML = categories
      .map(
        (cat, i) => `
      <a href="#${cat.id}" class="chip-link ${i === 0 ? 'active' : ''}" data-id="${cat.id}">
        ${cat.name}
        <span class="chip-count">${cat.items.length}</span>
      </a>`
      )
      .join("");
      
    // Auto-scrolling logic for the category chips
    let scrollSpeed = 0.5; // pixels per frame
    let scrollPos = nav.scrollLeft;
    let isPaused = false;
    let interactionTimeout;
    
    const pauseScroll = () => {
      isPaused = true;
      clearTimeout(interactionTimeout);
      interactionTimeout = setTimeout(() => {
        isPaused = false;
        scrollPos = nav.scrollLeft;
      }, 2500);
    };

    nav.addEventListener('mouseenter', () => { isPaused = true; });
    nav.addEventListener('mouseleave', () => { isPaused = false; scrollPos = nav.scrollLeft; });
    nav.addEventListener('touchstart', pauseScroll, {passive: true});
    nav.addEventListener('touchmove', pauseScroll, {passive: true});
    nav.addEventListener('wheel', pauseScroll, {passive: true});

    const scrollStep = () => {
      if (!isPaused && nav.scrollWidth > nav.clientWidth) {
        scrollPos += scrollSpeed;
        if (scrollPos >= nav.scrollWidth - nav.clientWidth) {
          scrollPos = 0; // jump to start when reaching end
        }
        nav.scrollLeft = scrollPos;
      }
      requestAnimationFrame(scrollStep);
    };
    
    requestAnimationFrame(scrollStep);
  }

  let cart = [];

  function renderSections(categories) {
    const container = $("#catalog-sections");
    container.innerHTML = categories
      .map((cat) => {
        const rows = cat.items
          .map((item) => {
            const price = formatPrice(item.price);
            const priceNum = Number(String(item.price).replace(/,/g, '')) || 0;
            const priceCell = price
              ? `<div class="price-cell-inner"><span class="price-tag">${price}</span> <button class="btn-add-cart" data-title="${escapeAttr(item.title)}" data-price="${priceNum}">+ Add</button></div>`
              : `<span class="price-tag price-tag--empty">—</span>`;
            return `<tr data-title="${escapeAttr(item.title.toLowerCase())}"><td>${escapeHtml(item.title)}</td><td>${priceCell}</td></tr>`;
          })
          .join("");

        return `
        <section class="section-card" id="${cat.id}" data-category="${escapeAttr(cat.name.toLowerCase())}">
          <div class="section-card__header">
            <h3>${escapeHtml(cat.name)}</h3>
            <span class="section-card__badge">${cat.items.length} titles</span>
          </div>
          <table class="price-table">
            <tbody>${rows}</tbody>
          </table>
        </section>`;
      })
      .join("");

    updateItemCount(countItems(categories));
  }

  function updateCartUI() {
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    $("#cart-badge").textContent = totalQty;
    $("#floating-cart").style.display = totalQty > 0 ? "flex" : "none";
    
    const container = $("#cart-items-container");
    if (cart.length === 0) {
      container.innerHTML = `<div class="cart-empty">Your cart is empty</div>`;
      $("#cart-grand-total").textContent = "₦0";
      return;
    }

    let totalAmount = 0;
    container.innerHTML = cart.map((item, index) => {
      const itemTotal = item.price * item.qty;
      totalAmount += itemTotal;
      return `
        <div class="cart-item">
          <div class="cart-item-details">
            <div class="cart-item-title">${escapeHtml(item.title)}</div>
            <div class="cart-item-price">₦${item.price.toLocaleString()} x ${item.qty} = ₦${itemTotal.toLocaleString()}</div>
          </div>
          <div class="cart-item-actions">
            <button class="cart-qty-btn" data-index="${index}" data-delta="-1">-</button>
            <span class="cart-qty">${item.qty}</span>
            <button class="cart-qty-btn" data-index="${index}" data-delta="1">+</button>
          </div>
        </div>
      `;
    }).join("");

    $("#cart-grand-total").textContent = `₦${totalAmount.toLocaleString()}`;
  }

  function setupCart() {
    $("#catalog-sections").addEventListener("click", (e) => {
      if (e.target.classList.contains("btn-add-cart")) {
        const title = e.target.dataset.title;
        const price = Number(e.target.dataset.price);
        
        const overlay = $("#prompt-overlay");
        const titleEl = $("#prompt-desc");
        const qtyEl = $("#prompt-qty");
        titleEl.textContent = title;
        qtyEl.value = 1;
        overlay.hidden = false;

        const cleanup = () => {
          overlay.hidden = true;
          $("#prompt-add").onclick = null;
          $("#prompt-cancel").onclick = null;
          $("#prompt-minus").onclick = null;
          $("#prompt-plus").onclick = null;
        };

        $("#prompt-cancel").onclick = cleanup;
        $("#prompt-minus").onclick = () => {
          if (qtyEl.value > 1) qtyEl.value--;
        };
        $("#prompt-plus").onclick = () => {
          qtyEl.value++;
        };
        $("#prompt-add").onclick = () => {
          const qty = parseInt(qtyEl.value, 10);
          cleanup();
          if (isNaN(qty) || qty <= 0) return;

          const existing = cart.find(i => i.title === title);
          if (existing) {
            existing.qty += qty;
          } else {
            cart.push({ title, price, qty });
          }
          updateCartUI();
        };
      }
    });

    $("#cart-items-container").addEventListener("click", (e) => {
      if (e.target.classList.contains("cart-qty-btn")) {
        const index = parseInt(e.target.dataset.index, 10);
        const delta = parseInt(e.target.dataset.delta, 10);
        if (cart[index]) {
          cart[index].qty += delta;
          if (cart[index].qty <= 0) {
            cart.splice(index, 1);
          }
          updateCartUI();
        }
      }
    });

    $("#floating-cart").addEventListener("click", () => {
      $("#cart-overlay").hidden = false;
    });

    $("#cart-close").addEventListener("click", () => {
      $("#cart-overlay").hidden = true;
    });

    $("#cart-overlay").addEventListener("click", (e) => {
      if (e.target === $("#cart-overlay")) {
        $("#cart-overlay").hidden = true;
      }
    });

    $("#checkout-btn").addEventListener("click", () => {
      if (cart.length === 0) return;

      // Build a nicely formatted WhatsApp message
      let text = `*🛒 NEW ORDER*\n`;
      text += `━━━━━━━━━━━━━━━━\n\n`;
      let total = 0;
      cart.forEach((item, i) => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        text += `${i + 1}. *${item.title}*\n`;
        text += `   ${item.qty} x ₦${item.price.toLocaleString()} = *₦${itemTotal.toLocaleString()}*\n\n`;
      });
      text += `━━━━━━━━━━━━━━━━\n`;
      text += `*💰 TOTAL: ₦${total.toLocaleString()}*\n\n`;
      text += `Sent from ${catalog.brand || 'MAHAT'} Price List`;

      // Convert Nigerian number: 08051550404 → 2348051550404
      const rawPhone = catalog.phones && catalog.phones[0] ? catalog.phones[0] : "";
      const phone = rawPhone.replace(/\D/g, "").replace(/^0/, "234");
      if (!phone) {
        alert("Phone number not found in catalog!");
        return;
      }
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
      window.open(url, "_blank");
    });

    updateCartUI();
  }


  function escapeHtml(text) {
    const d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML;
  }

  function escapeAttr(text) {
    return text.replace(/"/g, "&quot;");
  }

  function updateItemCount(n) {
    $("#item-count").textContent = n.toLocaleString();
  }

  function filterCatalog(query) {
    const q = query.trim().toLowerCase();
    const sections = $("#catalog-sections");
    const cards = sections.querySelectorAll(".section-card");
    let visibleItems = 0;
    let visibleSections = 0;

    cards.forEach((card) => {
      const catName = card.dataset.category || "";
      const rows = card.querySelectorAll("tbody tr");
      let sectionVisible = false;

      rows.forEach((row) => {
        const title = row.dataset.title || "";
        const priceText = row.textContent.toLowerCase();
        const match = !q || title.includes(q) || catName.includes(q) || priceText.includes(q);
        row.hidden = !match;
        if (match) {
          sectionVisible = true;
          visibleItems++;
        }
      });

      card.hidden = !sectionVisible;
      if (sectionVisible) visibleSections++;
    });

    updateItemCount(q ? visibleItems : totalItems);
    $("#empty-state").hidden = visibleSections > 0;

    document.querySelectorAll(".chip-link").forEach((link) => {
      const card = document.getElementById(link.dataset.id);
      link.hidden = card ? card.hidden : false;
    });
  }

  function setupSearch() {
    const input = $("#search");
    const clearBtn = $("#search-clear");

    input.addEventListener("input", () => {
      filterCatalog(input.value);
      clearBtn.classList.toggle("visible", input.value.length > 0);
    });

    clearBtn.addEventListener("click", () => {
      input.value = "";
      clearBtn.classList.remove("visible");
      filterCatalog("");
      input.focus();
    });

    $("#reset-search").addEventListener("click", () => {
      input.value = "";
      clearBtn.classList.remove("visible");
      filterCatalog("");
    });
  }

  function setupNavSync() {
    const chipsContainer = $("#publisher-chips");

    chipsContainer.addEventListener("click", (e) => {
      const link = e.target.closest(".chip-link");
      if (!link) return;
      e.preventDefault();
      document.querySelectorAll(".chip-link").forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      const targetId = link.getAttribute("href").substring(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        const headerOffset = 130;
        const elementPosition = targetEl.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset;
        window.scrollTo({
             top: offsetPosition,
             behavior: "smooth"
        });
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            document.querySelectorAll(".chip-link").forEach((l) => {
              l.classList.toggle("active", l.dataset.id === id);
            });
          }
        });
      },
      { rootMargin: "-10% 0px -60% 0px", threshold: 0 }
    );

    document.querySelectorAll(".section-card").forEach((el) => observer.observe(el));
  }

  async function init() {
    try {
      await loadCatalog();
      totalItems = countItems(catalog.categories);
      renderMeta();
      renderNav(catalog.categories);
      renderSections(catalog.categories);
      setupSearch();
      setupNavSync();
      setupCart();
    } catch (err) {
      $("#catalog-sections").innerHTML = `<p class="empty-state">Failed to load price list. Please refresh the page.</p>`;
      console.error(err);
    }
  }

  init();
})();

