// 구독 객체 예시입니다. 아래 함수들이 사용하는 주요 속성은
// name(이름), amount(결제 금액), cycle(결제 주기),
// nextPaymentDate(다음 결제일), category(카테고리), paymentMethod(결제 수단)입니다.
// cycle은 "monthly" 또는 "yearly"를 사용하고 날짜는 "YYYY-MM-DD" 형식입니다.

// 구독 한 건의 결제 금액을 월 기준 금액으로 환산합니다.
// 연간 결제 금액은 12로 나눈 뒤 가장 가까운 원 단위로 반올림합니다.
function getMonthlyAmount(subscription) {
  if (subscription.cycle === "yearly") {
    return Math.round(subscription.amount / 12);
  } else {
    return subscription.amount;
  }
}

// 구독 배열의 각 금액을 월 기준으로 환산한 다음 모두 더합니다.
function getTotalMonthlyAmount(subscriptions) {
  let total = 0;
  for (const subscription of subscriptions) {
    total += getMonthlyAmount(subscription);
  }
  return total;
}

// 월 합계에 12개월을 곱해 연간 지출 추정치를 계산합니다.
function getTotalYearlyAmount(subscriptions) {
  return getTotalMonthlyAmount(subscriptions) * 12;
}

// 오늘 날짜와 다음 결제일 사이의 날짜 차이를 일수로 반환합니다.
// 입력은 "YYYY-MM-DD" 문자열이어야 하며,
// 결제일이 오늘이면 0, 미래면 양수, 이미 지났으면 음수가 됩니다.
function getDaysUntilPayment(today, nextPaymentDate) {
  const todayDate = new Date(today);
  const paymentDate = new Date(nextPaymentDate);
  const timeDiff = paymentDate - todayDate;
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  return daysDiff;
}

// 오늘부터 daysThreshold일까지 결제일이 남은 구독만 배열로 반환합니다.
// 이미 결제일이 지난 구독은 결과에 포함하지 않습니다.
function getUpcomingPayments(subscriptions, daysThreshold) {
  return subscriptions.filter(subscription => {
    // UTC ISO 날짜의 날짜 부분만 사용해 날짜 문자열끼리 비교할 수 있게 합니다.
    const daysLeft = getDaysUntilPayment(
      new Date().toISOString().split("T")[0],
      subscription.nextPaymentDate
    );
    return daysLeft >= 0 && daysLeft <= daysThreshold;
  });
}

// 구독을 카테고리별로 묶어 월 환산 합계를 객체로 반환합니다.
// 예: { "영상": 13500, "음악": 10900 }
function getMonthlyAmountByCategory(subscriptions) {
  const categoryTotals = {};
  for (const subscription of subscriptions) {
    const category = subscription.category;
    const monthlyAmount = getMonthlyAmount(subscription);
    // 같은 카테고리가 이미 있으면 누적하고, 처음이면 새 합계를 만듭니다.
    if (categoryTotals[category]) {
      categoryTotals[category] += monthlyAmount;
    } else {
      categoryTotals[category] = monthlyAmount;
    }
  }
  return categoryTotals;
}

// 결제 수단별 월 환산 지출을 묶습니다.
// 이 화면에서는 사용하지 않지만, 카드/결제 수단별 분석에 재사용할 수 있습니다.
// 예: { "신한카드": 13500, "삼성카드": 10900 }
function getMonthlyAmountByPaymentMethod(subscriptions) {
  const paymentMethodTotals = {};
  for (const subscription of subscriptions) {
    const paymentMethod = subscription.paymentMethod;
    const monthlyAmount = getMonthlyAmount(subscription);
    // 동일한 결제 수단을 사용하는 구독들의 금액을 누적합니다.
    if (paymentMethodTotals[paymentMethod]) {
      paymentMethodTotals[paymentMethod] += monthlyAmount;
    } else {
      paymentMethodTotals[paymentMethod] = monthlyAmount;
    }
  }
  return paymentMethodTotals;
}
