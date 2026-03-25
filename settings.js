(function () {
  const appConfig = window.MAP_APP_CONFIG;
  const firebaseConfig = window.FIREBASE_CONFIG;

  const categoryMenu = document.querySelector(".category-menu");
  const addItemForm = document.querySelector("#add-item-form");
  const addCategory = document.querySelector("#add-category");
  const addStatus = document.querySelector("#add-status");
  const itemList = document.querySelector("#settings-item-list");
  const message = document.querySelector("#settings-message");
  const mapPickerModal = document.querySelector("#map-picker-modal");
  const mapPickerImage = document.querySelector("#map-picker-image");
  const mapPickerIndicator = document.querySelector("#map-picker-indicator");
  const mapPickerCoords = document.querySelector("#map-picker-coords");

  if (!appConfig || !firebaseConfig || !categoryMenu || !addItemForm || !addCategory || !addStatus || !itemList || !message || !mapPickerModal || !mapPickerImage || !mapPickerIndicator || !mapPickerCoords) {
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
    expandedItemId: null,
    items: [],
    pickerTarget: null
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

  const setMessage = (text, isError) => {
    message.textContent = text;
    message.style.color = isError ? "#C63A2F" : "#2F8FE8";
  };

  const buildOptions = (items, selectedValue) =>
    items
      .map((item) => {
        const selected = item.key === selectedValue ? " selected" : "";
        return `<option value="${item.key}"${selected}>${item.label}</option>`;
      })
      .join("");

  const renderMenu = () => {
    categoryMenu.innerHTML = "";

    appConfig.categories.forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "category-menu-button";

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
        renderList();
      });

      categoryMenu.appendChild(button);
    });
  };

  const openMapPicker = (xInput, yInput) => {
    state.pickerTarget = { xInput, yInput };
    mapPickerModal.classList.remove("is-hidden");
    mapPickerModal.setAttribute("aria-hidden", "false");

    const x = Number(xInput.value);
    const y = Number(yInput.value);

    if (!Number.isNaN(x) && !Number.isNaN(y) && x >= 0 && y >= 0) {
      mapPickerIndicator.classList.remove("is-hidden");
      mapPickerIndicator.style.left = `${(x / appConfig.mapWidth) * 100}%`;
      mapPickerIndicator.style.top = `${(y / appConfig.mapHeight) * 100}%`;
      mapPickerCoords.textContent = `현재 좌표: X ${x}, Y ${y}`;
    } else {
      mapPickerIndicator.classList.add("is-hidden");
      mapPickerCoords.textContent = "아직 선택된 좌표가 없습니다.";
    }
  };

  const closeMapPicker = () => {
    state.pickerTarget = null;
    mapPickerModal.classList.add("is-hidden");
    mapPickerModal.setAttribute("aria-hidden", "true");
  };

  const renderList = () => {
    itemList.innerHTML = "";

    state.items
      .filter((item) => item.category === state.activeCategory)
      .forEach((item) => {
        const card = document.createElement("article");
        card.className = "settings-item-card";

        if (state.expandedItemId === item.id) {
          card.classList.add("is-expanded");
        }

        card.innerHTML = `
          <div class="settings-item-row">
            <button class="settings-item-name" type="button" data-action="toggle" data-id="${item.id}">
              ${item.name}
              <small>X: ${item.x ?? "-"}, Y: ${item.y ?? "-"}</small>
            </button>
            <select class="settings-item-status" data-action="status" data-id="${item.id}">
              ${buildOptions(appConfig.statuses, item.status)}
            </select>
            <div>
              <span class="category-menu-label">${appConfig.categories.find((category) => category.key === item.category)?.label || ""}</span>
            </div>
          </div>
          <form class="settings-item-coords" data-action="coords-form" data-id="${item.id}">
            <label>
              <span>X 좌표</span>
              <input name="x" type="number" min="0" max="${appConfig.mapWidth}" value="${item.x ?? 0}">
            </label>
            <label>
              <span>Y 좌표</span>
              <input name="y" type="number" min="0" max="${appConfig.mapHeight}" value="${item.y ?? 0}">
            </label>
            <label>
              <span>카테고리</span>
              <select name="category">
                ${buildOptions(appConfig.categories, item.category)}
              </select>
            </label>
            <button class="settings-secondary-button settings-map-picker-button" type="button" data-action="open-picker">지도에서 선택</button>
            <button class="settings-secondary-button" type="submit">좌표 저장</button>
          </form>
        `;

        itemList.appendChild(card);
      });
  };

  const refreshSelectOptions = () => {
    addCategory.innerHTML = buildOptions(appConfig.categories, appConfig.defaultCategory);
    addStatus.innerHTML = buildOptions(appConfig.statuses, appConfig.statuses[0].key);
  };

  const nextSortOrder = (category) => {
    const sameCategory = state.items.filter((item) => item.category === category);
    return sameCategory.length ? Math.max(...sameCategory.map((item) => item.sortOrder || 0)) + 1 : 1;
  };

  itemList.addEventListener("click", (event) => {
    const toggleButton = event.target.closest('[data-action="toggle"]');
    const pickerButton = event.target.closest('[data-action="open-picker"]');

    if (pickerButton) {
      const form = pickerButton.closest("form");
      const xInput = form?.querySelector('input[name="x"]');
      const yInput = form?.querySelector('input[name="y"]');

      if (xInput && yInput) {
        openMapPicker(xInput, yInput);
      }
      return;
    }

    if (!toggleButton) {
      return;
    }

    const { id } = toggleButton.dataset;
    state.expandedItemId = state.expandedItemId === id ? null : id;
    renderList();
  });

  itemList.addEventListener("change", async (event) => {
    const statusSelect = event.target.closest('[data-action="status"]');
    if (!statusSelect) {
      return;
    }

    try {
      await collectionRef.doc(statusSelect.dataset.id).update({
        status: statusSelect.value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setMessage("상태를 저장했습니다.");
    } catch (error) {
      console.error("Failed to update status", error);
      setMessage("상태 저장 중 오류가 발생했습니다.", true);
    }
  });

  itemList.addEventListener("submit", async (event) => {
    const form = event.target.closest('[data-action="coords-form"]');
    if (!form) {
      return;
    }

    event.preventDefault();

    const id = form.dataset.id;
    const formData = new FormData(form);
    const x = Number(formData.get("x"));
    const y = Number(formData.get("y"));
    const category = String(formData.get("category"));

    try {
      await collectionRef.doc(id).update({
        x,
        y,
        category,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setMessage("좌표와 카테고리를 저장했습니다.");
    } catch (error) {
      console.error("Failed to update coordinates", error);
      setMessage("좌표 저장 중 오류가 발생했습니다.", true);
    }
  });

  addItemForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(addItemForm);
    const name = String(formData.get("name")).trim();
    const category = String(formData.get("category"));
    const status = String(formData.get("status"));
    const x = Number(formData.get("x"));
    const y = Number(formData.get("y"));

    if (!name) {
      setMessage("항목명을 입력해주세요.", true);
      return;
    }

    const id = makeItemId(category, name);

    try {
      await collectionRef.doc(id).set(
        {
          name,
          category,
          status,
          x,
          y,
          sortOrder: nextSortOrder(category),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );

      addItemForm.reset();
      refreshSelectOptions();
      setMessage("새 항목을 추가했습니다.");
    } catch (error) {
      console.error("Failed to add item", error);
      setMessage("항목 추가 중 오류가 발생했습니다.", true);
    }
  });

  addItemForm.addEventListener("click", (event) => {
    const pickerButton = event.target.closest('[data-picker-target="add-item-form"]');
    if (!pickerButton) {
      return;
    }

    const xInput = addItemForm.querySelector("#add-x");
    const yInput = addItemForm.querySelector("#add-y");

    if (xInput && yInput) {
      openMapPicker(xInput, yInput);
    }
  });

  mapPickerModal.addEventListener("click", (event) => {
    const closeButton = event.target.closest('[data-action="close-map-picker"]');
    if (closeButton) {
      closeMapPicker();
    }
  });

  mapPickerImage.addEventListener("click", (event) => {
    if (!state.pickerTarget) {
      return;
    }

    const rect = mapPickerImage.getBoundingClientRect();
    const relativeX = (event.clientX - rect.left) / rect.width;
    const relativeY = (event.clientY - rect.top) / rect.height;

    const x = Math.max(0, Math.min(appConfig.mapWidth, Math.round(relativeX * appConfig.mapWidth)));
    const y = Math.max(0, Math.min(appConfig.mapHeight, Math.round(relativeY * appConfig.mapHeight)));

    state.pickerTarget.xInput.value = String(x);
    state.pickerTarget.yInput.value = String(y);

    mapPickerIndicator.classList.remove("is-hidden");
    mapPickerIndicator.style.left = `${relativeX * 100}%`;
    mapPickerIndicator.style.top = `${relativeY * 100}%`;
    mapPickerCoords.textContent = `선택 좌표: X ${x}, Y ${y}`;
  });

  const hydrateItems = (snapshot) => {
    state.items = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        if (a.category === b.category) {
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        }

        return a.category.localeCompare(b.category, "ko");
      });

    renderList();
  };

  refreshSelectOptions();
  renderMenu();

  ensureSeedData()
    .then(() => collectionRef.onSnapshot(hydrateItems))
    .catch((error) => {
      console.error("Failed to initialize settings data", error);
      setMessage("초기 데이터를 불러오는 중 오류가 발생했습니다.", true);
    });
})();
