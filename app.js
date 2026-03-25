(function () {
  const appConfig = window.MAP_APP_CONFIG;
  const firebaseConfig = window.FIREBASE_CONFIG;

  const viewport = document.querySelector(".map-viewport");
  const mapImage = document.querySelector(".map-image");
  const congestionLayer = document.querySelector(".congestion-layer");
  const controlButtons = document.querySelectorAll(".map-control-button");
  const categoryMenu = document.querySelector(".category-menu");

  if (!appConfig || !firebaseConfig || !viewport || !mapImage || !congestionLayer || !categoryMenu) {
    return;
  }

  const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore(app);
  const collectionRef = db.collection(appConfig.collectionName);

  if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
    db.useEmulator("127.0.0.1", 8084);
  }

  const state = {
    activeCategory: appConfig.defaultCategory,
    isDragging: false,
    startX: 0,
    startScrollLeft: 0,
    items: []
  };

  const makeItemId = (category, name) =>
    `${category}-${name}`
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const randomStatusKey = () => {
    const options = appConfig.statuses;
    return options[Math.floor(Math.random() * options.length)].key;
  };

  const buildSeedItems = () =>
    appConfig.defaultItems.map((item, index) => ({
      id: makeItemId(item.category, item.name),
      name: item.name,
      category: item.category,
      status: randomStatusKey(),
      x: item.x,
      y: item.y,
      sortOrder: index + 1
    }));

  const ensureSeedData = async () => {
    const snapshot = await collectionRef.limit(1).get();
    if (!snapshot.empty) {
      return;
    }

    const batch = db.batch();
    const now = firebase.firestore.FieldValue.serverTimestamp();

    buildSeedItems().forEach((item) => {
      batch.set(collectionRef.doc(item.id), {
        name: item.name,
        category: item.category,
        status: item.status,
        x: item.x,
        y: item.y,
        sortOrder: item.sortOrder,
        createdAt: now,
        updatedAt: now
      });
    });

    await batch.commit();
  };

  const statusLabelByKey = Object.fromEntries(
    appConfig.statuses.map((status) => [status.key, status.label])
  );

  const renderMenu = () => {
    categoryMenu.innerHTML = "";

    appConfig.categories.forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "category-menu-button";
      button.dataset.category = category.key;

      if (category.key === state.activeCategory) {
        button.classList.add("is-active");
      }

      button.innerHTML = `
        <span class="category-menu-icon" aria-hidden="true">${category.icon}</span>
        <span class="category-menu-label">${category.label}</span>
      `;

      button.addEventListener("click", () => {
        state.activeCategory = category.key;
        renderMenu();
        renderCongestionBadges();
      });

      categoryMenu.appendChild(button);
    });
  };

  const renderCongestionBadges = () => {
    congestionLayer.innerHTML = "";

    state.items
      .filter((item) => item.category === state.activeCategory)
      .forEach((item, index) => {
        if (typeof item.x !== "number" || typeof item.y !== "number") {
          return;
        }

        const marker = document.createElement("div");
        marker.className = "congestion-marker";
        marker.style.left = `${(item.x / appConfig.mapWidth) * 100}%`;
        marker.style.top = `${((item.y + 34) / appConfig.mapHeight) * 100}%`;
        marker.style.zIndex = String(index + 1);

        const name = document.createElement("div");
        name.className = "congestion-name";
        name.textContent = item.name;

        const badge = document.createElement("div");
        badge.className = "congestion-badge";
        badge.dataset.level = item.status;
        badge.textContent = statusLabelByKey[item.status] || "보통";

        marker.appendChild(name);
        marker.appendChild(badge);
        congestionLayer.appendChild(marker);
      });
  };

  const centerMap = () => {
    const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
    viewport.scrollLeft = Math.max(0, maxScrollLeft / 2);
  };

  const moveByButton = (direction) => {
    const amount = Math.max(240, Math.round(viewport.clientWidth * 0.35));
    const delta = direction === "left" ? -amount : amount;

    viewport.scrollBy({
      left: delta,
      behavior: "smooth"
    });
  };

  const startDrag = (clientX) => {
    state.isDragging = true;
    state.startX = clientX;
    state.startScrollLeft = viewport.scrollLeft;
    viewport.classList.add("is-dragging");
  };

  const moveDrag = (clientX) => {
    if (!state.isDragging) {
      return;
    }

    const deltaX = clientX - state.startX;
    viewport.scrollLeft = state.startScrollLeft - deltaX;
  };

  const endDrag = () => {
    state.isDragging = false;
    viewport.classList.remove("is-dragging");
  };

  const hydrateItems = (snapshot) => {
    state.items = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        if (a.category === b.category) {
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        }

        return a.category.localeCompare(b.category, "ko");
      });

    renderCongestionBadges();
  };

  mapImage.addEventListener(
    "load",
    () => {
      centerMap();
    },
    { once: true }
  );

  window.addEventListener("resize", centerMap);

  viewport.addEventListener("pointerdown", (event) => {
    startDrag(event.clientX);
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener("pointermove", (event) => {
    moveDrag(event.clientX);
  });

  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);
  viewport.addEventListener("lostpointercapture", endDrag);

  controlButtons.forEach((button) => {
    button.addEventListener("click", () => {
      moveByButton(button.dataset.direction);
    });
  });

  renderMenu();

  ensureSeedData()
    .then(() => collectionRef.onSnapshot(hydrateItems))
    .catch((error) => {
      console.error("Failed to initialize map data", error);
    });

  if (mapImage.complete) {
    centerMap();
  }
})();
