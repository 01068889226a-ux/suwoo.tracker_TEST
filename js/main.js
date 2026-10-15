// localStorage에서 데이터를 저장하고 찾을 때 사용할 이름입니다.
const STORAGE_KEY = "subscription-tracker-data";
// 페이지가 시작될 때 브라우저에 저장된 구독을 불러옵니다.
let subscriptions = loadSubscriptions();

// 폼과 화면 요소를 한 번 찾아 변수에 저장해 이벤트 처리에 재사용합니다.
const form = document.getElementById("subscription-form");
const formHeading = document.getElementById("form-heading");
const submitButton = document.getElementById("submit-button");
const cancelEditButton = document.getElementById("cancel-edit");
const subscriptionIdInput = document.getElementById("subscription-id");

// localStorage에 저장한 구독 배열을 읽어옵니다.
function loadSubscriptions() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData === null) {
      return [];
    }

    const parsedData = JSON.parse(savedData);
    // 예상한 자료형이 아닌 값은 정상적인 구독 목록으로 취급하지 않습니다.
    if (!Array.isArray(parsedData)) {
      throw new Error("저장된 구독 데이터의 형식이 올바르지 않습니다.");
    }
    return parsedData;
  } catch (error) {
    // 저장 공간 접근 불가 또는 JSON 손상 등 실제 실패를 화면에 알립니다.
    SubscriptionUI.showMessage(
      `저장된 데이터를 불러오지 못했습니다. 브라우저 저장 공간을 확인해 주세요. (${error.message})`
    );
    return [];
  }
}

// 새 배열을 localStorage에 저장한 뒤 메모리 데이터와 화면을 함께 갱신합니다.
// 저장에 실패하면 이전 화면 데이터를 유지하고 false를 반환합니다.
function saveSubscriptions(nextSubscriptions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSubscriptions));
    subscriptions = nextSubscriptions;
    SubscriptionUI.showMessage("");
    SubscriptionUI.render(subscriptions);
    return true;
  } catch (error) {
    SubscriptionUI.showMessage(
      `구독을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요. (${error.message})`
    );
    return false;
  }
}

// 폼 입력과 수정 상태를 초기화해 다음 구독을 추가할 수 있게 합니다.
function resetForm() {
  form.reset();
  subscriptionIdInput.value = "";
  formHeading.textContent = "새 구독 추가";
  submitButton.textContent = "구독 추가";
  cancelEditButton.hidden = true;
}

// 선택한 구독의 값을 입력 폼에 채우고 폼을 수정 모드로 전환합니다.
function startEditing(subscription) {
  subscriptionIdInput.value = subscription.id;
  document.getElementById("name").value = subscription.name;
  document.getElementById("amount").value = subscription.amount;
  document.getElementById("cycle").value = subscription.cycle;
  document.getElementById("next-payment-date").value = subscription.nextPaymentDate;
  document.getElementById("category").value = subscription.category;
  document.getElementById("payment-method").value = subscription.paymentMethod || "";
  formHeading.textContent = "구독 수정";
  submitButton.textContent = "변경 저장";
  cancelEditButton.hidden = false;
  document.getElementById("name").focus();
}

// 브라우저가 지원하면 UUID를 쓰고, 아니면 시간과 임의 문자열로 id를 만듭니다.
function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `sub_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// 제출 이벤트의 기본 동작(페이지 새로고침)을 막고 폼 값을 데이터 객체로 변환합니다.
form.addEventListener("submit", event => {
  event.preventDefault();
  if (!form.reportValidity()) {
    return;
  }

  const formData = new FormData(form);
  const id = subscriptionIdInput.value;
  const subscription = {
    // 수정 모드에서는 기존 id를 보존하고 새 구독이면 새 id를 발급합니다.
    id: id || createId(),
    name: String(formData.get("name")).trim(),
    amount: Number(formData.get("amount")),
    cycle: String(formData.get("cycle")),
    nextPaymentDate: String(formData.get("nextPaymentDate")),
    category: String(formData.get("category")).trim(),
    paymentMethod: String(formData.get("paymentMethod")).trim()
  };

  // 브라우저 기본 검사 외에도 공백 이름/카테고리와 잘못된 금액을 확인합니다.
  if (!subscription.name || !subscription.category || !Number.isFinite(subscription.amount) || subscription.amount <= 0) {
    SubscriptionUI.showMessage("이름과 카테고리를 입력하고 결제 금액은 1원 이상으로 설정해 주세요.");
    return;
  }

  // id가 있으면 같은 구독을 교체하고, 없으면 배열 끝에 새 구독을 추가합니다.
  const nextSubscriptions = id
    ? subscriptions.map(item => item.id === id ? subscription : item)
    : [...subscriptions, subscription];
  if (saveSubscriptions(nextSubscriptions)) {
    resetForm();
  }
});

// 카드가 다시 그려질 때마다 버튼별 이벤트를 달지 않고,
// 목록 컨테이너 하나에서 클릭을 받아 수정/삭제를 구분합니다.
document.getElementById("subscription-list").addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  // 버튼의 data-id에 해당하는 실제 구독 데이터를 찾습니다.
  const subscription = subscriptions.find(item => item.id === button.dataset.id);
  if (!subscription) {
    SubscriptionUI.showMessage("해당 구독을 찾을 수 없습니다. 목록을 새로 확인해 주세요.");
    return;
  }

  // 수정 버튼이면 폼을 채우고 삭제 흐름은 실행하지 않습니다.
  if (button.dataset.action === "edit") {
    startEditing(subscription);
    return;
  }

  // 삭제 전 확인 창을 띄워 실수로 지우는 것을 방지합니다.
  if (button.dataset.action === "delete") {
    const confirmed = window.confirm(`"${subscription.name}" 구독을 삭제할까요?`);
    if (!confirmed) {
      return;
    }
    const nextSubscriptions = subscriptions.filter(item => item.id !== subscription.id);
    // 편집 중인 항목을 삭제했으면 폼도 초기화합니다.
    if (saveSubscriptions(nextSubscriptions) && subscriptionIdInput.value === subscription.id) {
      resetForm();
    }
  }
});

// 수정 취소는 현재 입력 내용을 버리고 신규 추가 모드로 돌아갑니다.
cancelEditButton.addEventListener("click", resetForm);

// 첫 화면을 그릴 때 localStorage에서 읽어 온 데이터로 UI를 채웁니다.
SubscriptionUI.render(subscriptions);
