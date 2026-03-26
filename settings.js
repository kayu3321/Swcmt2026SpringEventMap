(function () {
  const appConfig = window.MAP_APP_CONFIG;
  const firebaseConfig = window.FIREBASE_CONFIG;

  const categoryMenu = document.querySelector(".category-menu");
  const adminPanel = document.querySelector("#settings-admin-panel");
  const addItemForm = document.querySelector("#add-item-form");
  const addCategory = document.querySelector("#add-category");
  const addStatus = document.querySelector("#add-status");
  const itemList = document.querySelector("#settings-item-list");
  const message = document.querySelector("#settings-message");
  const authMessage = document.querySelector("#settings-auth-message");
  const userBadge = document.querySelector("#settings-user");
  const loginButton = document.querySelector("#settings-login-button");
  const logoutButton = document.querySelector("#settings-logout-button");
  const mapPickerModal = document.querySelector("#map-picker-modal");
  const mapPickerImage = document.querySelector("#map-picker-image");
  const mapPickerItems = document.querySelector("#map-picker-items");
  const mapPickerIndicator = document.querySelector("#map-picker-indicator");
  const mapPickerCoords = document.querySelector("#map-picker-coords");

  if (
    !appConfig ||
    !firebaseConfig ||
    !categoryMenu ||
    !adminPanel ||
    !addItemForm ||
    !addCategory ||
    !addStatus ||
    !itemList ||
    !message ||
    !authMessage ||
    !userBadge ||
    !loginButton ||
    !logoutButton ||
    !mapPickerModal ||
    !mapPickerImage ||
    !mapPickerItems ||
    !mapPickerIndicator ||
    !mapPickerCoords
  ) {
    return;
  }

  const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth(app);
  const provider = new firebase.auth.GoogleAuthProvider();
  const db = firebase.firestore(app);
  const collectionRef = db.collection(appConfig.collectionName);
  const isLocalhost =
    window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";

  if (isLocalhost) {
    auth.useEmulator("http://127.0.0.1:9099");
    db.useEmulator("127.0.0.1", 8084);
  }

  const state = {
    activeCategory: appConfig.defaultCategory,
    expandedItemId: null,
    items: [],
    pickerTarget: null,
    unsubscribeItems: null,
    pickerItemId: null
  };

  const setAdminVisible = (isVisible) => {
    adminPanel.classList.toggle("is-hidden", !isVisible);
    categoryMenu.classList.toggle("is-hidden", !isVisible);
  };

  const setAuthMessage = (text, isError = false) => {
    authMessage.textContent = text;
    authMessage.style.color = isError ? "#C63A2F" : "#2F8FE8";
  };

  const setMessage = (text, isError = false) => {
    message.textContent = text;
    message.style.color = isError ? "#C63A2F" : "#2F8FE8";
  };

  const slugify = (category, name) =>
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
      id: slugify(item.category, item.name),
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

  const buildOptions = (items, selectedValue) =>
    items
      .map((item) => {
        const selected = item.key === selectedValue ? " selected" : "";
        return `<option value="${item.key}"${selected}>${item.label}</option>`;
      })
      .join("");

  const encodeItemName = (name) => {
    try {
      return btoa(unescape(encodeURIComponent(name)));
    } catch (error) {
      console.error("Failed to encode item name", error);
      return "";
    }
  };

  const buildStatusControlUrl = (item) => {
    const encodedName = encodeItemName(item.name);
    if (!encodedName) {
      return "";
    }

    return `${window.location.origin}/status?item=${encodeURIComponent(encodedName)}`;
  };

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
    const parentForm = xInput.closest("form");
    state.pickerTarget = { xInput, yInput };
    state.pickerItemId = parentForm?.dataset.id || null;
    mapPickerModal.classList.remove("is-hidden");
    mapPickerModal.setAttribute("aria-hidden", "false");

    const x = Number(xInput.value);
    const y = Number(yInput.value);

    if (!Number.isNaN(x) && !Number.isNaN(y) && x >= 0 && y >= 0) {
      mapPickerIndicator.classList.remove("is-hidden");
      mapPickerIndicator.style.left = `${(x / appConfig.mapWidth) * 100}%`;
      mapPickerIndicator.style.top = `${(y / appConfig.mapHeight) * 100}%`;
      mapPickerCoords.textContent = `현재 좌표: X ${x}, Y ${y}`;
      renderMapPickerItems();
      return;
    }

    mapPickerIndicator.classList.add("is-hidden");
    mapPickerCoords.textContent = "아직 선택한 좌표가 없습니다.";
    renderMapPickerItems();
  };

  const closeMapPicker = () => {
    if (state.pickerTarget && state.pickerItemId) {
      const x = Number(state.pickerTarget.xInput.value);
      const y = Number(state.pickerTarget.yInput.value);
      const item = state.items.find((entry) => entry.id === state.pickerItemId);

      if (!Number.isNaN(x) && !Number.isNaN(y) && item) {
        collectionRef
          .doc(state.pickerItemId)
          .update({
            x,
            y,
            category: item.category,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          })
          .then(() => {
            setMessage("지도에서 선택한 좌표를 저장했습니다.");
          })
          .catch((error) => {
            console.error("Failed to save picker coordinates", error);
            setMessage("지도 좌표 저장 중 오류가 발생했습니다.", true);
          });
      }
    }

    state.pickerTarget = null;
    state.pickerItemId = null;
    mapPickerModal.classList.add("is-hidden");
    mapPickerModal.setAttribute("aria-hidden", "true");
  };

  const pickerColorByCategory = {
    experience: "#2F8FE8",
    craft: "#FFB24F",
    performance: "#C63A2F",
    dining: "#27965F"
  };

  const renderMapPickerItems = () => {
    mapPickerItems.innerHTML = "";

    const activeItem = state.items.find((item) => item.id === state.pickerItemId);
    const visibleCategory = activeItem?.category || String(addCategory.value || state.activeCategory);

    state.items
      .filter((item) => item.id !== state.pickerItemId && item.category === visibleCategory)
      .forEach((item) => {
        const x = Number(item.x);
        const y = Number(item.y);

        if (Number.isNaN(x) || Number.isNaN(y)) {
          return;
        }

        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "map-picker-item-dot";
        dot.style.left = `${(x / appConfig.mapWidth) * 100}%`;
        dot.style.top = `${(y / appConfig.mapHeight) * 100}%`;
        dot.style.backgroundColor = pickerColorByCategory[item.category] || "#2F8FE8";
        dot.title = `${item.name} (${appConfig.categories.find((category) => category.key === item.category)?.label || item.category})`;
        dot.setAttribute("aria-label", dot.title);

        dot.addEventListener("click", () => {
          if (!state.pickerTarget) {
            return;
          }

          state.pickerTarget.xInput.value = String(x);
          state.pickerTarget.yInput.value = String(y);
          mapPickerIndicator.classList.remove("is-hidden");
          mapPickerIndicator.style.left = `${(x / appConfig.mapWidth) * 100}%`;
          mapPickerIndicator.style.top = `${(y / appConfig.mapHeight) * 100}%`;
          mapPickerCoords.textContent = `선택 좌표: X ${x}, Y ${y}`;
        });

        mapPickerItems.appendChild(dot);
      });
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

        const categoryLabel =
          appConfig.categories.find((category) => category.key === item.category)?.label || "";
        const statusControlUrl = buildStatusControlUrl(item);

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
              <span class="category-menu-label">${categoryLabel}</span>
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
            <button class="settings-danger-button" type="button" data-action="delete-item" data-id="${item.id}" data-name="${item.name}">항목 삭제</button>
          </form>
          <div class="settings-item-url">
            <span class="settings-item-url-label">상태 변경 URL</span>
            <a class="settings-item-url-link" href="${statusControlUrl}" target="_blank" rel="noreferrer">${statusControlUrl}</a>
          </div>
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
    return sameCategory.length
      ? Math.max(...sameCategory.map((item) => item.sortOrder || 0)) + 1
      : 1;
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

    renderList();
    if (!mapPickerModal.classList.contains("is-hidden")) {
      renderMapPickerItems();
    }
  };

  const handleAdminSession = async (user) => {
    const tokenResult = await user.getIdTokenResult(true);

    if (!tokenResult.claims.admin) {
      setAdminVisible(false);
      userBadge.classList.remove("is-hidden");
      userBadge.textContent = `${user.email || user.displayName || "사용자"} 계정으로 로그인됨`;
      setAuthMessage("이 계정에는 관리자 권한(admin claim)이 없습니다.", true);
      return;
    }

    userBadge.classList.remove("is-hidden");
    userBadge.textContent = `${user.email || user.displayName || "관리자"} 계정으로 로그인됨`;
    setAdminVisible(true);
    setAuthMessage("관리자 인증이 완료되었습니다.");

    await ensureSeedData();
    state.unsubscribeItems = collectionRef.onSnapshot(hydrateItems, (error) => {
      console.error("Failed to subscribe settings items", error);
      setMessage("항목 데이터를 불러오는 중 오류가 발생했습니다.", true);
    });
  };

  itemList.addEventListener("click", (event) => {
    const toggleButton = event.target.closest('[data-action="toggle"]');
    const pickerButton = event.target.closest('[data-action="open-picker"]');
    const deleteButton = event.target.closest('[data-action="delete-item"]');

    if (deleteButton) {
      const { id, name } = deleteButton.dataset;
      const confirmed = window.confirm(`"${name}" 항목을 삭제할까요?`);

      if (!confirmed) {
        return;
      }

      collectionRef
        .doc(id)
        .delete()
        .then(() => {
          setMessage("항목을 삭제했습니다.");
        })
        .catch((error) => {
          console.error("Failed to delete item", error);
          setMessage("항목 삭제 중 오류가 발생했습니다.", true);
        });
      return;
    }

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
      setMessage("항목명을 입력해 주세요.", true);
      return;
    }

    const id = slugify(category, name);

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

    const x = Math.max(
      0,
      Math.min(appConfig.mapWidth, Math.round(relativeX * appConfig.mapWidth))
    );
    const y = Math.max(
      0,
      Math.min(appConfig.mapHeight, Math.round(relativeY * appConfig.mapHeight))
    );

    state.pickerTarget.xInput.value = String(x);
    state.pickerTarget.yInput.value = String(y);

    mapPickerIndicator.classList.remove("is-hidden");
    mapPickerIndicator.style.left = `${relativeX * 100}%`;
    mapPickerIndicator.style.top = `${relativeY * 100}%`;
    mapPickerCoords.textContent = `선택 좌표: X ${x}, Y ${y}`;
  });

  loginButton.addEventListener("click", async () => {
    try {
      if (isLocalhost) {
        setAuthMessage("로컬 환경에서는 리디렉션 방식으로 로그인합니다.");
        await auth.signInWithRedirect(provider);
        return;
      }

      await auth.signInWithPopup(provider);
      setAuthMessage("관리자 권한을 확인하고 있습니다.");
    } catch (error) {
      console.error("Failed to sign in", error);
      setAuthMessage("Google 로그인에 실패했습니다.", true);
    }
  });

  logoutButton.addEventListener("click", async () => {
    try {
      await auth.signOut();
      setAuthMessage("로그아웃했습니다.");
    } catch (error) {
      console.error("Failed to sign out", error);
      setAuthMessage("로그아웃 중 오류가 발생했습니다.", true);
    }
  });

  refreshSelectOptions();
  renderMenu();

  auth.getRedirectResult().catch((error) => {
    console.error("Failed to complete redirect sign-in", error);
    setAuthMessage("리디렉션 로그인 처리 중 오류가 발생했습니다.", true);
  });

  auth.onAuthStateChanged(async (user) => {
    if (state.unsubscribeItems) {
      state.unsubscribeItems();
      state.unsubscribeItems = null;
    }

    state.items = [];
    itemList.innerHTML = "";
    setMessage("");

    if (!user) {
      setAdminVisible(false);
      userBadge.classList.add("is-hidden");
      userBadge.textContent = "";
      setAuthMessage("관리자만 로그인할 수 있습니다.");
      return;
    }

    try {
      await handleAdminSession(user);
    } catch (error) {
      console.error("Failed to initialize settings admin session", error);
      setAdminVisible(false);
      userBadge.classList.remove("is-hidden");
      userBadge.textContent = `${user.email || user.displayName || "사용자"} 계정으로 로그인됨`;
      setAuthMessage("관리자 권한을 확인하는 중 오류가 발생했습니다.", true);
    }
  });
})();
