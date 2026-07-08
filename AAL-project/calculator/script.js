const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");
const keys = document.querySelector(".keys");

let expression = "";
let justCalculated = false;

const operators = new Set(["+", "-", "*", "/", "%"]);

function render(value = expression) {
  expressionEl.textContent = formatExpression(value) || "0";
  resultEl.textContent = formatResult(value) || "0";
}

function formatExpression(value) {
  return value
    .replaceAll("*", "×")
    .replaceAll("/", "÷")
    .replaceAll("-", "−");
}

function formatResult(value) {
  if (!value) return "0";

  const last = value.at(-1);
  if (operators.has(last) || last === ".") return "";

  try {
    const result = Function(`"use strict"; return (${value})`)();
    if (!Number.isFinite(result)) return "Error";
    return Number.parseFloat(result.toFixed(10)).toString();
  } catch {
    return "";
  }
}

function appendValue(value) {
  if (justCalculated && !operators.has(value)) {
    expression = "";
  }

  justCalculated = false;

  if (value === ".") {
    const currentNumber = expression.split(/[+\-*/%]/).pop();
    if (currentNumber.includes(".")) return;
  }

  if (operators.has(value)) {
    const last = expression.at(-1);

    if (!expression && value !== "-") return;
    if (operators.has(last)) {
      expression = expression.slice(0, -1);
    }
  }

  expression += value;
  render();
}

function clearCalculator() {
  expression = "";
  justCalculated = false;
  render();
}

function deleteLast() {
  expression = expression.slice(0, -1);
  justCalculated = false;
  render();
}

function calculate() {
  const result = formatResult(expression);
  if (!result || result === "Error") {
    resultEl.textContent = result || "Error";
    return;
  }

  expression = result;
  justCalculated = true;
  render();
}

keys.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const { value, action } = button.dataset;

  if (action === "clear") clearCalculator();
  if (action === "delete") deleteLast();
  if (action === "equals") calculate();
  if (value) appendValue(value);
});

document.addEventListener("keydown", (event) => {
  const key = event.key;

  if (/^\d$/.test(key) || operators.has(key) || key === ".") {
    event.preventDefault();
    appendValue(key);
  }

  if (key === "Enter" || key === "=") {
    event.preventDefault();
    calculate();
  }

  if (key === "Backspace") deleteLast();
  if (key === "Escape") clearCalculator();
});

render();
