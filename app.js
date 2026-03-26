(function () {
  const appConfig = window.MAP_APP_CONFIG;
  const firebaseConfig = window.FIREBASE_CONFIG;

  const viewport = document.querySelector(".map-viewport");
  const mapStage = document.querySelector(".map-stage");
  const mapImage = document.querySelector(".map-image");
  const congestionLayer = document.querySelector(".congestion-layer");
  const controlButtons = document.querySelectorAll(".map-control-button");
  const categoryMenu = document.querySelector(".category-menu");

  if (!appConfig || !firebaseConfig || !viewport || !mapStage || !mapImage || !congestionLayer || !categoryMenu) {
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
    startY: 0,
    startScrollLeft: 0,
    items: [],
    targetScrollLeft: 0,
    currentVelocity: 0,
    scrollEase: 0.22,
    verticalOffset: 0,
    verticalTargetOffset: 0,
    lastPointerX: 0,
    lastMoveTime: 0,
    animationFrameId: 0
  };

  const statusLabelByKey = Object.fromEntries(
    appConfig.statuses.map((status) => [status.key, status.label])
  );

  const clampScrollLeft = (value) =>
    Math.max(0, Math.min(viewport.scrollWidth - viewport.clientWidth, value));

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
        const x = Number(item.x);
        const y = Number(item.y);

        if (Number.isNaN(x) || Number.isNaN(y)) {
          return;
        }

        const marker = document.createElement("div");
        marker.className = "congestion-marker";
        marker.style.left = `${(x / appConfig.mapWidth) * 100}%`;
        marker.style.top = `${((y + 34) / appConfig.mapHeight) * 100}%`;
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
    const centered = Math.max(0, maxScrollLeft / 2);

    viewport.scrollLeft = centered;
    state.targetScrollLeft = centered;
  };

  const stopAnimation = () => {
    if (state.animationFrameId) {
      cancelAnimationFrame(state.animationFrameId);
      state.animationFrameId = 0;
    }
  };

  const applyVerticalOffset = () => {
    mapStage.style.transform = `translateY(${state.verticalOffset}px)`;
  };

  const animateScroll = () => {
    stopAnimation();

    const tick = () => {
      const horizontalDiff = state.targetScrollLeft - viewport.scrollLeft;
      const verticalDiff = state.verticalTargetOffset - state.verticalOffset;

      if (
        Math.abs(horizontalDiff) < 0.5 &&
        Math.abs(state.currentVelocity) < 0.2 &&
        Math.abs(verticalDiff) < 0.5
      ) {
        viewport.scrollLeft = clampScrollLeft(state.targetScrollLeft);
        state.verticalOffset = state.verticalTargetOffset;
        applyVerticalOffset();
        state.currentVelocity = 0;
        state.animationFrameId = 0;
        return;
      }

      if (!state.isDragging) {
        state.targetScrollLeft = clampScrollLeft(state.targetScrollLeft + state.currentVelocity);
        state.currentVelocity *= 0.92;
      }

      viewport.scrollLeft += horizontalDiff * state.scrollEase;
      state.verticalOffset += verticalDiff * 0.16;
      applyVerticalOffset();

      state.animationFrameId = requestAnimationFrame(tick);
    };

    state.animationFrameId = requestAnimationFrame(tick);
  };

  const moveByButton = (direction) => {
    const amount = Math.max(240, Math.round(viewport.clientWidth * 0.35));
    const delta = direction === "left" ? -amount : amount;
    const baseScrollLeft = state.animationFrameId ? state.targetScrollLeft : viewport.scrollLeft;

    state.isDragging = false;
    state.currentVelocity = 0;
    state.scrollEase = 0.07;
    state.targetScrollLeft = clampScrollLeft(baseScrollLeft + delta);
    animateScroll();
  };

  const startDrag = (clientX, clientY) => {
    stopAnimation();
    state.isDragging = true;
    state.startX = clientX;
    state.startY = clientY;
    state.startScrollLeft = viewport.scrollLeft;
    state.targetScrollLeft = viewport.scrollLeft;
    state.currentVelocity = 0;
    state.scrollEase = 0.22;
    state.lastPointerX = clientX;
    state.lastMoveTime = performance.now();
    viewport.classList.add("is-dragging");
  };

  const moveDrag = (clientX, clientY) => {
    if (!state.isDragging) {
      return;
    }

    const deltaX = clientX - state.startX;
    const deltaY = clientY - state.startY;
    const now = performance.now();
    const timeDelta = Math.max(now - state.lastMoveTime, 1);
    const pointerDelta = clientX - state.lastPointerX;

    state.targetScrollLeft = clampScrollLeft(state.startScrollLeft - deltaX);
    state.verticalTargetOffset = Math.max(-192, Math.min(192, deltaY * 0.66));
    state.verticalOffset = state.verticalTargetOffset;
    applyVerticalOffset();
    state.currentVelocity = (-pointerDelta / timeDelta) * 18;
    state.lastPointerX = clientX;
    state.lastMoveTime = now;

    if (!state.animationFrameId) {
      animateScroll();
    }
  };

  const endDrag = () => {
    if (!state.isDragging) {
      return;
    }

    state.isDragging = false;
    viewport.classList.remove("is-dragging");
    state.verticalTargetOffset = 0;
    animateScroll();
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
    startDrag(event.clientX, event.clientY);
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener("pointermove", (event) => {
    moveDrag(event.clientX, event.clientY);
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

  collectionRef.onSnapshot(hydrateItems, (error) => {
    console.error("Failed to subscribe map data", error);
  });

  if (mapImage.complete) {
    centerMap();
  }
})();
