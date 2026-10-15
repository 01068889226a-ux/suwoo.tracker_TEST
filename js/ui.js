// DOM 요소를 만들고 화면에 표시하는 역할만 담당합니다.
// 데이터 저장/수정과 버튼 동작은 main.js에서 처리합니다.
window.SubscriptionUI = {
  // 금액을 한국식 천 단위 구분자와 원 단위로 표시합니다.
  formatWon(amount) {
    return `${new Intl.NumberFormat("ko-KR").format(amount)}원`;
  },

  // 상태 메시지를 보여주거나 숨깁니다. 빈 문자열이면 메시지를 감춥니다.
  showMessage(message) {
    const messageElement = document.getElementById("app-message");
    messageElement.textContent = message;
    messageElement.hidden = !message;
  },

  // 계산 로직(logic.js)을 이용해 요약 숫자를 다시 계산하고 화면에 반영합니다.
  renderSummary(subscriptions) {
    document.getElementById("monthly-total").textContent =
      this.formatWon(getTotalMonthlyAmount(subscriptions));
    document.getElementById("yearly-total").textContent =
      this.formatWon(getTotalYearlyAmount(subscriptions));
    document.getElementById("upcoming-count").textContent =
      `${getUpcomingPayments(subscriptions, 7).length}건`;
    document.getElementById("subscription-count").textContent =
      `${subscriptions.length}개`;
  },

  // 구독 데이터 배열을 카드 목록으로 바꿉니다.
  renderSubscriptions(subscriptions) {
    const list = document.getElementById("subscription-list");
    list.replaceChildren();

    // 등록된 구독이 없을 때는 빈 목록 안내를 표시하고 이후 처리를 끝냅니다.
    if (subscriptions.length === 0) {
      const emptyState = document.createElement("p");
      emptyState.className = "empty-state";
      emptyState.textContent = "등록된 구독이 없습니다. 오른쪽에서 첫 구독을 추가해 보세요.";
      list.append(emptyState);
      return;
    }

    // 날짜 비교 함수에 넘길 오늘 날짜 문자열을 YYYY-MM-DD로 만듭니다.
    const today = new Date().toISOString().split("T")[0];
    for (const subscription of subscriptions) {
      // 각 구독마다 카드와 자식 요소를 생성합니다.
      // 사용자 입력은 innerHTML 대신 textContent로 넣어 HTML로 해석되지 않게 합니다.
      const card = document.createElement("article");
      card.className = "subscription-card";

      const main = document.createElement("div");
      main.className = "subscription-main";

      const name = document.createElement("p");
      name.className = "subscription-name";
      name.textContent = subscription.name;

      const meta = document.createElement("div");
      meta.className = "subscription-meta";
      const cycle = document.createElement("span");
      // 저장된 주기 코드를 사용자가 읽을 수 있는 한국어로 바꿉니다.
      cycle.textContent = subscription.cycle === "yearly" ? "연간 결제" : "월간 결제";
      const category = document.createElement("span");
      category.textContent = subscription.category;
      meta.append(cycle, category);
      if (subscription.paymentMethod) {
        const paymentMethod = document.createElement("span");
        paymentMethod.textContent = subscription.paymentMethod;
        meta.append(paymentMethod);
      }

      const price = document.createElement("p");
      // 연간 결제도 getMonthlyAmount 함수로 월 기준 금액으로 환산해 표시합니다.
      price.className = "subscription-price";
      price.textContent = `${this.formatWon(getMonthlyAmount(subscription))} / 월`;
      main.append(name, meta, price);

      const side = document.createElement("div");
      side.className = "subscription-side";
      // 남은 날 수를 계산해 D-day, D-숫자 또는 지난 날짜인 D+숫자로 표시합니다.
      const daysLeft = getDaysUntilPayment(today, subscription.nextPaymentDate);
      const dday = document.createElement("span");
      dday.className = daysLeft >= 0 && daysLeft <= 7 ? "dday dday-soon" : "dday";
      dday.textContent = daysLeft < 0 ? `D+${Math.abs(daysLeft)}` : daysLeft === 0 ? "D-day" : `D-${daysLeft}`;

      const actions = document.createElement("div");
      actions.className = "card-actions";
      // 이벤트는 목록 컨테이너에서 위임해 처리합니다.
      // 각 버튼의 data-id로 어떤 구독에 대한 작업인지 식별합니다.
      const editButton = document.createElement("button");
      editButton.className = "text-button";
      editButton.type = "button";
      editButton.dataset.action = "edit";
      editButton.dataset.id = subscription.id;
      editButton.textContent = "수정";
      editButton.setAttribute("aria-label", `${subscription.name} 수정`);
      const deleteButton = document.createElement("button");
      deleteButton.className = "text-button text-button-danger";
      deleteButton.type = "button";
      deleteButton.dataset.action = "delete";
      deleteButton.dataset.id = subscription.id;
      deleteButton.textContent = "삭제";
      deleteButton.setAttribute("aria-label", `${subscription.name} 삭제`);
      actions.append(editButton, deleteButton);
      side.append(dday, actions);

      card.append(main, side);
      list.append(card);
    }
  },

  // 카테고리별 월 지출액과 전체 월 지출 중 비중을 표시합니다.
  renderCategories(subscriptions) {
    const breakdown = document.getElementById("category-breakdown");
    breakdown.replaceChildren();
    const totals = getMonthlyAmountByCategory(subscriptions);
    const monthlyTotal = getTotalMonthlyAmount(subscriptions);
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    // 구독이 없으면 비율 막대 대신 안내 문구를 표시합니다.
    if (entries.length === 0) {
      const emptyState = document.createElement("p");
      emptyState.className = "empty-state";
      emptyState.textContent = "구독을 추가하면 카테고리별 지출 비중이 표시됩니다.";
      breakdown.append(emptyState);
      return;
    }

    for (const [category, amount] of entries) {
      // 전체 합계가 0인 경우 0으로 나누지 않도록 비율을 0으로 둡니다.
      const share = monthlyTotal === 0 ? 0 : (amount / monthlyTotal) * 100;
      const item = document.createElement("div");
      item.className = "category-item";
      const heading = document.createElement("div");
      heading.className = "category-heading";
      const name = document.createElement("span");
      name.className = "category-name";
      name.textContent = category;
      const value = document.createElement("span");
      value.className = "category-amount";
      value.textContent = this.formatWon(amount);
      heading.append(name, value);

      const track = document.createElement("div");
      track.className = "category-track";
      // role과 aria-label은 막대 비율을 스크린 리더에도 전달합니다.
      track.setAttribute("role", "img");
      track.setAttribute("aria-label", `${category} ${share.toFixed(1)}%`);
      const bar = document.createElement("div");
      bar.className = "category-bar";
      bar.style.width = `${share}%`;
      track.append(bar);
      const percentage = document.createElement("span");
      percentage.className = "category-share";
      percentage.textContent = `${share.toFixed(1)}%`;
      item.append(heading, track, percentage);
      breakdown.append(item);
    }
  },

  // 데이터 변경 후 화면의 세 영역을 한 번에 다시 그리는 진입점입니다.
  render(subscriptions) {
    this.renderSummary(subscriptions);
    this.renderSubscriptions(subscriptions);
    this.renderCategories(subscriptions);
  }
};
