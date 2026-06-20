const defaults = {
  loanAmount: 1000000,
  interestRate: 8.5,
  loanTenure: 20
};

const fields = {
  loanAmount: document.getElementById("loanAmount"),
  loanAmountRange: document.getElementById("loanAmountRange"),
  interestRate: document.getElementById("interestRate"),
  interestRateRange: document.getElementById("interestRateRange"),
  loanTenure: document.getElementById("loanTenure"),
  loanTenureRange: document.getElementById("loanTenureRange")
};

const display = {
  loanAmountValue: document.getElementById("loanAmountValue"),
  interestRateValue: document.getElementById("interestRateValue"),
  loanTenureValue: document.getElementById("loanTenureValue"),
  monthlyEmi: document.getElementById("monthlyEmi"),
  principalAmount: document.getElementById("principalAmount"),
  totalInterest: document.getElementById("totalInterest"),
  totalPayment: document.getElementById("totalPayment"),
  tenureSummary: document.getElementById("tenureSummary"),
  principalBar: document.getElementById("principalBar"),
  interestBar: document.getElementById("interestBar"),
  interestShare: document.getElementById("interestShare"),
  loanInsight: document.getElementById("loanInsight"),
  repaymentTable: document.getElementById("repaymentTable"),
  formMessage: document.getElementById("formMessage"),
  toastMessage: document.getElementById("toastMessage")
};

const form = document.getElementById("emiForm");
const resetButton = document.getElementById("resetButton");
const copySummaryButton = document.getElementById("copySummaryButton");
const downloadSummaryButton = document.getElementById("downloadSummaryButton");

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0
});

function formatCurrency(value) {
  return `Rs. ${moneyFormatter.format(Math.round(value))}`;
}

function showFormMessage(message, type = "info") {
  display.formMessage.textContent = message;
  display.formMessage.className = `form-message ${type}`;
}

function showToast(message, type = "success") {
  display.toastMessage.textContent = message;
  display.toastMessage.className = `toast-message show ${type}`;

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    display.toastMessage.className = "toast-message";
  }, 2600);
}

function clampValue(input) {
  const min = Number(input.min);
  const max = Number(input.max);
  const value = Number(input.value);

  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function syncInputPair(source, target) {
  const value = clampValue(source);
  source.value = value;
  target.value = value;
}

function calculateEmi(principal, annualRate, years) {
  const months = years * 12;
  const monthlyRate = annualRate / 12 / 100;

  if (monthlyRate === 0) {
    return principal / months;
  }

  const growthFactor = Math.pow(1 + monthlyRate, months);
  return principal * monthlyRate * growthFactor / (growthFactor - 1);
}

function buildYearlyRepayment(principal, annualRate, years, emi) {
  const monthlyRate = annualRate / 12 / 100;
  const totalMonths = years * 12;
  let balance = principal;
  const rows = [];

  for (let month = 1; month <= totalMonths; month += 1) {
    const interestForMonth = monthlyRate === 0 ? 0 : balance * monthlyRate;
    const principalForMonth = Math.min(emi - interestForMonth, balance);
    const yearIndex = Math.ceil(month / 12);

    balance = Math.max(0, balance - principalForMonth);

    if (!rows[yearIndex - 1]) {
      rows[yearIndex - 1] = {
        year: yearIndex,
        principalPaid: 0,
        interestPaid: 0,
        balance: 0
      };
    }

    rows[yearIndex - 1].principalPaid += principalForMonth;
    rows[yearIndex - 1].interestPaid += interestForMonth;
    rows[yearIndex - 1].balance = balance;
  }

  return rows;
}

function renderRepaymentTable(rows) {
  display.repaymentTable.innerHTML = rows.map((row) => `
    <tr>
      <td>Year ${row.year}</td>
      <td>${formatCurrency(row.principalPaid)}</td>
      <td>${formatCurrency(row.interestPaid)}</td>
      <td>${formatCurrency(row.balance)}</td>
    </tr>
  `).join("");
}

function updateOutputs() {
  const principal = clampValue(fields.loanAmount);
  const annualRate = clampValue(fields.interestRate);
  const years = clampValue(fields.loanTenure);
  const months = years * 12;
  const emi = calculateEmi(principal, annualRate, years);
  const totalPayment = emi * months;
  const totalInterest = totalPayment - principal;
  const principalPercent = totalPayment ? (principal / totalPayment) * 100 : 0;
  const interestPercent = 100 - principalPercent;
  const repaymentRows = buildYearlyRepayment(principal, annualRate, years, emi);

  display.loanAmountValue.textContent = formatCurrency(principal);
  display.interestRateValue.textContent = `${annualRate.toFixed(2)}%`;
  display.loanTenureValue.textContent = `${years} ${years === 1 ? "Year" : "Years"}`;

  display.monthlyEmi.textContent = formatCurrency(emi);
  display.principalAmount.textContent = formatCurrency(principal);
  display.totalInterest.textContent = formatCurrency(totalInterest);
  display.totalPayment.textContent = formatCurrency(totalPayment);
  display.tenureSummary.textContent = `${months} Months`;

  display.principalBar.style.width = `${principalPercent}%`;
  display.interestBar.style.width = `${interestPercent}%`;
  display.interestShare.textContent = `${interestPercent.toFixed(1)}% Interest`;

  display.loanInsight.textContent =
    `For a ${years}-year loan at ${annualRate.toFixed(2)}%, you will pay about ${formatCurrency(totalInterest)} in interest over the full tenure.`;

  renderRepaymentTable(repaymentRows);
}

function getCurrentSummary() {
  return [
    "EMI Calculator Summary",
    `Loan Amount: ${display.principalAmount.textContent}`,
    `Interest Rate: ${display.interestRateValue.textContent}`,
    `Tenure: ${display.tenureSummary.textContent}`,
    `Monthly EMI: ${display.monthlyEmi.textContent}`,
    `Total Interest: ${display.totalInterest.textContent}`,
    `Total Payment: ${display.totalPayment.textContent}`
  ].join("\n");
}

function copySummary() {
  const summary = getCurrentSummary();

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(summary)
      .then(() => {
        copySummaryButton.textContent = "Copied";
        showToast("Loan summary copied. You can paste it anywhere now.");
        setTimeout(() => {
          copySummaryButton.textContent = "Copy Summary";
        }, 1600);
      })
      .catch(() => {
        showToast("Copy was blocked by the browser. Please try again.", "error");
      });
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = summary;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "absolute";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);

  if (copied) {
    copySummaryButton.textContent = "Copied";
    showToast("Loan summary copied. You can paste it anywhere now.");
    setTimeout(() => {
      copySummaryButton.textContent = "Copy Summary";
    }, 1600);
  } else {
    showToast("Copy was blocked by the browser. Please select and copy the summary manually.", "error");
  }
}

function downloadSummary() {
  const summary = getCurrentSummary();
  const file = new Blob([summary], { type: "text/plain" });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(file);
  link.download = "emi-summary.txt";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);

  showToast("Summary downloaded as emi-summary.txt.");
}

function attachPairListeners(numberInput, rangeInput) {
  numberInput.addEventListener("input", () => {
    syncInputPair(numberInput, rangeInput);
    updateOutputs();
  });

  rangeInput.addEventListener("input", () => {
    syncInputPair(rangeInput, numberInput);
    updateOutputs();
  });
}

attachPairListeners(fields.loanAmount, fields.loanAmountRange);
attachPairListeners(fields.interestRate, fields.interestRateRange);
attachPairListeners(fields.loanTenure, fields.loanTenureRange);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  updateOutputs();
  showFormMessage(`Done. Your updated EMI is ${display.monthlyEmi.textContent}.`, "success");
  showToast("EMI calculated successfully.");
});

resetButton.addEventListener("click", () => {
  fields.loanAmount.value = defaults.loanAmount;
  fields.loanAmountRange.value = defaults.loanAmount;
  fields.interestRate.value = defaults.interestRate;
  fields.interestRateRange.value = defaults.interestRate;
  fields.loanTenure.value = defaults.loanTenure;
  fields.loanTenureRange.value = defaults.loanTenure;
  updateOutputs();
  showFormMessage("Values reset to the default sample loan.", "info");
  showToast("Calculator reset to default values.");
});

copySummaryButton.addEventListener("click", copySummary);
downloadSummaryButton.addEventListener("click", downloadSummary);

updateOutputs();
