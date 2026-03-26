(function () {
  const appConfig = window.MAP_APP_CONFIG;
  const firebaseConfig = window.FIREBASE_CONFIG;

  const headingElement = document.querySelector("#status-heading");
  const messageElement = document.querySelector("#status-control-message");
  const optionButtons = Array.from(document.querySelectorAll(".status-option-button"));

  if (!appConfig || !firebaseConfig || !headingElement || !messageElement || !optionButtons.length) {
    return;
  }

  const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore(app);
  const collectionRef = db.collection(appConfig.collectionName);

  if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
    db.useEmulator("127.0.0.1", 8084);
  }

  const statusMap = Object.fromEntries(appConfig.statuses.map((status) => [status.key, status]));
  const state = {
    itemId: "",
    itemName: "",
    currentStatus: "normal",
    unsubscribe: null
  };

  const setMessage = (text, isError = false) => {
    messageElement.textContent = text;
    messageElement.style.color = isError ? "#C63A2F" : "#2F8FE8";
  };

  const setBusy = (isBusy) => {
    optionButtons.forEach((button) => {
      button.disabled = isBusy;
    });
  };

  const decodeItemName = () => {
    const params = new URLSearchParams(window.location.search);
    const encodedName = params.get("item");

    if (!encodedName) {
      return "";
    }

    try {
      return decodeURIComponent(escape(atob(encodedName)));
    } catch (error) {
      console.error("Failed to decode item name", error);
      return "";
    }
  };

  const renderCurrentStatus = (item) => {
    state.itemName = item.name;
    state.currentStatus = item.status;
    headingElement.textContent = `${item.name} : ${statusMap[item.status]?.label || "보통"}`;

    optionButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.status === item.status);
    });
  };

  const subscribeItem = async (itemName) => {
    const snapshot = await collectionRef.where("name", "==", itemName).limit(1).get();

    if (snapshot.empty) {
      headingElement.textContent = "항목을 찾을 수 없습니다.";
      setMessage("유효하지 않은 상태 변경 URL입니다.", true);
      setBusy(true);
      return;
    }

    const doc = snapshot.docs[0];
    state.itemId = doc.id;

    state.unsubscribe = collectionRef.doc(doc.id).onSnapshot(
      (itemDoc) => {
        if (!itemDoc.exists) {
          headingElement.textContent = "항목을 찾을 수 없습니다.";
          setMessage("항목 데이터가 삭제되었거나 접근할 수 없습니다.", true);
          setBusy(true);
          return;
        }

        renderCurrentStatus({ id: itemDoc.id, ...itemDoc.data() });
        setBusy(false);
      },
      (error) => {
        console.error("Failed to subscribe status item", error);
        setMessage("항목 상태를 불러오는 중 오류가 발생했습니다.", true);
      }
    );
  };

  const updateStatus = async (statusKey) => {
    if (!state.itemId) {
      return;
    }

    setBusy(true);
    setMessage("상태를 반영하고 있습니다.");

    try {
      await collectionRef.doc(state.itemId).update({
        status: statusKey,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setMessage("혼잡도를 반영했습니다.");
    } catch (error) {
      console.error("Failed to update status", error);
      setMessage("혼잡도 변경 중 오류가 발생했습니다.", true);
      setBusy(false);
    }
  };

  optionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      updateStatus(button.dataset.status);
    });
  });

  const itemName = decodeItemName();

  if (!itemName) {
    headingElement.textContent = "잘못된 접근입니다.";
    setMessage("URL에 유효한 항목 정보가 없습니다.", true);
    setBusy(true);
    return;
  }

  subscribeItem(itemName).catch((error) => {
    console.error("Failed to initialize status control", error);
    headingElement.textContent = `${itemName} : 상태 확인 실패`;
    setMessage("상태 변경 페이지를 초기화하는 중 오류가 발생했습니다.", true);
    setBusy(true);
  });

  window.addEventListener("beforeunload", () => {
    if (state.unsubscribe) {
      state.unsubscribe();
    }
  });
})();
