import { scoringCategories, scoringKeys, scoringLabels, type GameState, type ScoringKey } from "../types";
import type { TurnRecommendation } from "../turn-computer";
import type { WorkerResponse } from "./messages";

const STORAGE_KEY = "kniffel-game-state-v1";
const pipPositions = [[5], [1, 9], [1, 5, 9], [1, 3, 7, 9], [1, 3, 5, 7, 9], [1, 3, 4, 6, 7, 9]];

function dieFace(value: number): string {
  return '<span class="die-face" aria-hidden="true">' + pipPositions[value - 1].map((position) =>
    '<i class="pip" style="grid-area: ' + Math.ceil(position / 3) + ' / ' + ((position - 1) % 3 + 1) + '"></i>'
  ).join("") + '</span>';
}

type StoredState = {
  cappedUpperScore: number;
  openFields: ScoringKey[];
};

const elements = {
  fieldGroups: getElement<HTMLDivElement>("field-groups"),
  openCount: getElement<HTMLElement>("open-count"),
  upperRange: getElement<HTMLInputElement>("upper-score-range"),
  upperInput: getElement<HTMLInputElement>("upper-score-input"),
  upperOutput: getElement<HTMLOutputElement>("upper-score-output"),
  reset: getElement<HTMLButtonElement>("reset-state"),
  diceInputs: getElement<HTMLDivElement>("dice-inputs"),
  dicePicker: getElement<HTMLDivElement>("dice-picker"),
  diceHint: getElement<HTMLParagraphElement>("dice-hint"),
  analyze: getElement<HTMLButtonElement>("analyze"),
  buttonLabel: document.querySelector<HTMLSpanElement>("#analyze .button-label")!,
  formError: getElement<HTMLParagraphElement>("form-error"),
  result: getElement<HTMLElement>("result"),
  resultTitle: getElement<HTMLHeadingElement>("result-title"),
  resultDetail: getElement<HTMLParagraphElement>("result-detail"),
  resultDice: getElement<HTMLDivElement>("result-dice"),
  expectedScore: getElement<HTMLElement>("expected-score"),
  recommendedField: getElement<HTMLElement>("recommended-field"),
  recommendedFieldMetric: getElement<HTMLElement>("recommended-field-metric"),
  probabilityList: getElement<HTMLDivElement>("probability-list"),
};

let state = loadState();
let solverReady = false;
let requestId = 0;
let activeRequestId = 0;
let isCalculating = false;
let selectedDie: HTMLButtonElement | null = null;

const solverWorker = new Worker(new URL("./solver-worker.js", import.meta.url), { type: "module" });

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

function loadState(): StoredState {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as Partial<StoredState> | null;
    if (
      parsed &&
      Number.isInteger(parsed.cappedUpperScore) &&
      parsed.cappedUpperScore! >= 0 &&
      parsed.cappedUpperScore! <= 63 &&
      Array.isArray(parsed.openFields) &&
      parsed.openFields.every((field) => scoringKeys.includes(field as ScoringKey))
    ) {
      return {
        cappedUpperScore: parsed.cappedUpperScore!,
        openFields: scoringKeys.filter((key) => parsed.openFields!.includes(key)),
      };
    }
  } catch {
    // Ignore malformed local data and return the default state.
  }
  return { cappedUpperScore: 0, openFields: [...scoringKeys] };
}

function saveState(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderFields(): void {
  elements.fieldGroups.replaceChildren();
  for (const section of ["upper", "lower"] as const) {
    const group = document.createElement("section");
    group.className = "field-group";
    group.setAttribute("aria-label", section === "upper" ? "Upper section" : "Lower section");

    const grid = document.createElement("div");
    grid.className = "field-grid";
    for (const category of scoringCategories.filter((item) => item.section === section)) {
      const isOpen = state.openFields.includes(category.key);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `field-button ${isOpen ? "is-open" : "is-filled"}`;
      button.dataset.field = category.key;
      button.setAttribute("aria-pressed", String(!isOpen));
      button.setAttribute(
        "aria-label",
        `${category.label}: ${isOpen ? "open" : "filled"}. Mark as ${isOpen ? "filled" : "open"}`,
      );

      const name = document.createElement("span");
      name.className = "field-name";
      if (section === "upper") {
        name.innerHTML = dieFace(scoringKeys.indexOf(category.key) + 1);
      } else {
        const shortLabels: Partial<Record<ScoringKey, string>> = {
          threeOfAKind: "3 of a kind", fourOfAKind: "4 of a kind",
        };
        name.textContent = shortLabels[category.key] || category.label;
      }
      const status = document.createElement("span");
      status.className = "field-status";
      status.textContent = isOpen ? "" : "✓";
      status.setAttribute("aria-hidden", "true");
      button.append(name, status);
      button.addEventListener("click", () => toggleField(category.key));
      grid.append(button);
    }
    group.append(grid);
    elements.fieldGroups.append(group);
  }
  elements.openCount.textContent = String(state.openFields.length);
}

function toggleField(field: ScoringKey): void {
  state.openFields = state.openFields.includes(field)
    ? state.openFields.filter((key) => key !== field)
    : scoringKeys.filter((key) => key === field || state.openFields.includes(key));
  saveState();
  renderFields();
  invalidateResult();
}

function closeDicePicker(): void {
  selectedDie?.setAttribute("aria-expanded", "false");
  selectedDie = null;
  elements.dicePicker.hidden = true;
  elements.diceHint.textContent = "Tap a die to set its value.";
}

function selectDie(button: HTMLButtonElement): void {
  selectedDie?.setAttribute("aria-expanded", "false");
  selectedDie = button;
  button.setAttribute("aria-expanded", "true");
  elements.dicePicker.hidden = false;
  const index = Number(button.dataset.die) + 1;
  elements.dicePicker.setAttribute("aria-label", "Choose value for die " + index);
  elements.diceHint.textContent = "Choose a value for die " + index + ".";
  elements.dicePicker.querySelectorAll<HTMLButtonElement>("button").forEach((option) => {
    option.setAttribute("aria-pressed", String(option.dataset.value === button.dataset.value));
  });
}

function renderDiceInputs(): void {
  for (let index = 0; index < 5; index++) {
    const wrapper = document.createElement("div");
    wrapper.className = "die-input";
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.die = String(index);
    button.dataset.value = "0";
    button.innerHTML = '<span class="empty-die" aria-hidden="true">+</span>';
    button.setAttribute("aria-label", "Die " + (index + 1) + ": not set. Choose value");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "dice-picker");
    button.addEventListener("click", () => {
      if (selectedDie === button) closeDicePicker();
      else selectDie(button);
    });
    wrapper.append(button);
    elements.diceInputs.append(wrapper);
  }
  for (let value = 1; value <= 6; value++) {
    const option = document.createElement("button");
    option.type = "button";
    option.dataset.value = String(value);
    option.innerHTML = dieFace(value);
    option.setAttribute("aria-label", String(value));
    option.addEventListener("click", () => {
      if (!selectedDie) return;
      const button = selectedDie;
      button.dataset.value = String(value);
      button.innerHTML = dieFace(value);
      button.setAttribute("aria-label", "Die " + (Number(button.dataset.die) + 1) + ": " + value + ". Choose value");
      invalidateResult();
      // Advance through unset dice, then return focus to the die just edited.
      const next = elements.diceInputs.querySelector<HTMLButtonElement>('button[data-value="0"]');
      if (next) {
        selectDie(next);
        elements.dicePicker.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
      } else {
        closeDicePicker();
        button.focus({ preventScroll: true });
      }
    });
    elements.dicePicker.append(option);
  }
}

document.addEventListener("click", (event) => {
  const target = event.target as Node;
  if (!elements.diceInputs.contains(target) && !elements.dicePicker.contains(target)) closeDicePicker();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && selectedDie) {
    selectedDie.focus({ preventScroll: true });
    closeDicePicker();
  }
});

function updateUpperScore(value: number): void {
  const capped = Math.max(0, Math.min(63, Number.isFinite(value) ? Math.round(value) : 0));
  state.cappedUpperScore = capped;
  elements.upperRange.value = String(capped);
  elements.upperInput.value = String(capped);
  elements.upperOutput.value = `${capped} / 63`;
  saveState();
  invalidateResult();
}

function getDice(): number[] | null {
  const values = [...elements.diceInputs.querySelectorAll<HTMLButtonElement>("button")].map(
    (button) => Number(button.dataset.value),
  );
  return values.every((value) => Number.isInteger(value) && value >= 1 && value <= 6) ? values : null;
}

function getRerollsRemaining(): number {
  return Number(document.querySelector<HTMLInputElement>('input[name="rerolls"]:checked')!.value);
}

function invalidateResult(): void {
  activeRequestId = ++requestId;
  isCalculating = false;
  elements.result.hidden = true;
  elements.formError.hidden = true;
  updateAnalyzeButton();
}

function updateAnalyzeButton(): void {
  elements.analyze.disabled = !solverReady || isCalculating;
  elements.buttonLabel.textContent = isCalculating
    ? "Calculating…"
    : solverReady
      ? "Find best move"
      : "Loading strategy…";
}

function analyze(): void {
  const dice = getDice();
  if (!dice) {
    elements.formError.textContent = "Choose a value for all five dice.";
    elements.formError.hidden = false;
    return;
  }
  if (state.openFields.length === 0) {
    elements.formError.textContent = "Mark at least one scoring field as open.";
    elements.formError.hidden = false;
    return;
  }

  elements.formError.hidden = true;
  elements.result.hidden = true;
  isCalculating = true;
  updateAnalyzeButton();
  activeRequestId = ++requestId;
  const gameState: GameState = {
    cappedUpperScore: state.cappedUpperScore,
    openFields: [...state.openFields],
  };
  solverWorker.postMessage({
    type: "analyze",
    id: activeRequestId,
    gameState,
    dice,
    throwsRemaining: getRerollsRemaining(),
  });
}

function renderResult(recommendation: TurnRecommendation): void {
  const dice = getDice();
  if (!dice) return;
  const rerolls = new Set(recommendation.rerollDiceIndices);
  const throwsRemaining = getRerollsRemaining();

  elements.resultDice.replaceChildren();
  dice.forEach((die, index) => {
    const item = document.createElement("div");
    item.className = `result-die ${rerolls.has(index) ? "reroll" : "keep"}`;
    item.innerHTML = `${dieFace(die)}<small>${rerolls.has(index) ? "Reroll" : "Keep"}</small>`;
    item.setAttribute("aria-label", `Die ${index + 1}: ${die}, ${rerolls.has(index) ? "reroll" : "keep"}`);
    elements.resultDice.append(item);
  });

  if (throwsRemaining === 0) {
    const field = recommendation.recommendedField;
    elements.resultTitle.textContent = field ? `Score ${scoringLabels[field]}` : "Score this roll";
    elements.resultDetail.textContent = "No rerolls remain. Use the strongest available scoring field.";
  } else if (rerolls.size === 0) {
    elements.resultTitle.textContent = "Keep all five";
    elements.resultDetail.textContent = "This roll is stronger than any available reroll.";
  } else {
    elements.resultTitle.textContent = `Reroll ${rerolls.size} ${rerolls.size === 1 ? "die" : "dice"}`;
    const keptDice = dice.filter((_, index) => !rerolls.has(index));
    elements.resultDetail.textContent = keptDice.length
      ? `Keep ${keptDice.join(", ")} and reroll the highlighted ${rerolls.size === 1 ? "die" : "dice"}.`
      : "Reroll all five dice.";
  }

  elements.expectedScore.textContent = recommendation.expectedScore.toFixed(2);
  elements.recommendedFieldMetric.hidden = !recommendation.recommendedField;
  elements.recommendedField.textContent = recommendation.recommendedField
    ? scoringLabels[recommendation.recommendedField]
    : "—";

  elements.probabilityList.replaceChildren();
  const probabilities = Object.entries(recommendation.fieldProbabilities)
    .map(([key, probability]) => [key as ScoringKey, probability || 0] as const)
    .sort((a, b) => b[1] - a[1]);
  for (const [field, probability] of probabilities) {
    const row = document.createElement("div");
    row.className = "probability-row";
    const percentage = `${(probability * 100).toFixed(probability < 0.001 ? 2 : 1)}%`;
    row.innerHTML = `
      <span>${scoringLabels[field]}</span>
      <span class="probability-track"><i style="width: ${Math.max(0, Math.min(100, probability * 100))}%"></i></span>
      <strong>${percentage}</strong>
    `;
    elements.probabilityList.append(row);
  }
  elements.result.hidden = false;
  elements.result.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" });
}

solverWorker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
  const response = event.data;
  if (response.type === "ready") {
    solverReady = true;
    updateAnalyzeButton();
    return;
  }
  if (response.type === "error") {
    if (response.id !== undefined && response.id !== activeRequestId) return;
    isCalculating = false;
    elements.formError.textContent = response.message;
    elements.formError.hidden = false;
    updateAnalyzeButton();
    return;
  }
  if (response.id !== activeRequestId) return;
  isCalculating = false;
  updateAnalyzeButton();
  renderResult(response.recommendation);
});

solverWorker.addEventListener("error", () => {
  solverReady = false;
  isCalculating = false;
  elements.formError.textContent = "The strategy engine could not be loaded. Refresh and try again.";
  elements.formError.hidden = false;
  updateAnalyzeButton();
});

elements.upperRange.addEventListener("input", () => updateUpperScore(Number(elements.upperRange.value)));
elements.upperInput.addEventListener("change", () => updateUpperScore(Number(elements.upperInput.value)));
elements.reset.addEventListener("click", () => {
  state = { cappedUpperScore: 0, openFields: [...scoringKeys] };
  saveState();
  updateUpperScore(0);
  renderFields();
});
elements.analyze.addEventListener("click", analyze);
document.querySelectorAll<HTMLInputElement>('input[name="rerolls"]').forEach((input) => {
  input.addEventListener("change", invalidateResult);
});

renderFields();
renderDiceInputs();
updateUpperScore(state.cappedUpperScore);
updateAnalyzeButton();
