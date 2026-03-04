import { calculateForEnemy } from "./calculatorCore.js";
import { loadDataBundle } from "./dataLoader.js";
import { createState, findEnemy } from "./state.js";
import {
  hideError,
  renderDetail,
  renderEnemyOptions,
  renderInnerMatrix,
  renderMainlineMatrix,
  renderPhaseOptions,
  renderTimeOptions,
  setMetaInfo,
  showError,
} from "./ui.js";

const refs = {
  metaInfo: document.getElementById("meta-info"),
  enemySelect: document.getElementById("enemy-select"),
  timeSelect: document.getElementById("time-select"),
  phaseSelect: document.getElementById("phase-select"),
  detailToggle: document.getElementById("detail-toggle"),
  mainlineMatrix: document.getElementById("mainline-matrix"),
  rebattleMatrix: document.getElementById("rebattle-matrix"),
  deathMatrix: document.getElementById("death-matrix"),
  detailPanel: document.getElementById("detail-panel"),
  detailContent: document.getElementById("detail-content"),
  errorPanel: document.getElementById("error-panel"),
  errorMessage: document.getElementById("error-message"),
  retryBtn: document.getElementById("retry-btn"),
};

let bundle = null;
let state = null;

function bindEvents() {
  refs.enemySelect.addEventListener("change", () => {
    state.selectedEnemyId = Number(refs.enemySelect.value);
    const enemy = findEnemy(bundle.enemies, state.selectedEnemyId);
    state.selectedTime = enemy?.default_time_seq ?? 0;
    state.selectedPhase = 1;
    renderAll();
  });

  refs.timeSelect.addEventListener("change", () => {
    state.selectedTime = Number(refs.timeSelect.value);
    renderAll();
  });

  refs.phaseSelect.addEventListener("change", () => {
    state.selectedPhase = Number(refs.phaseSelect.value);
    renderAll();
  });

  refs.detailToggle.addEventListener("change", () => {
    state.showDetail = refs.detailToggle.checked;
    renderAll();
  });

  refs.retryBtn.addEventListener("click", () => {
    void bootstrap();
  });
}

function renderAll() {
  const enemy = findEnemy(bundle.enemies, state.selectedEnemyId);
  if (!enemy) {
    showError(refs.errorPanel, refs.errorMessage, "未找到敌人数据。");
    return;
  }

  const maxPhase = Number(enemy.buff_active_phase_num || 1);
  if (state.selectedPhase > maxPhase) {
    state.selectedPhase = maxPhase;
  }

  renderEnemyOptions(refs.enemySelect, bundle.enemies, state.selectedEnemyId);
  renderTimeOptions(refs.timeSelect, state.selectedTime);
  renderPhaseOptions(refs.phaseSelect, state.selectedPhase, maxPhase);

  const phaseLabel = refs.phaseSelect.closest("label");
  if (phaseLabel) {
    phaseLabel.style.display = maxPhase > 1 ? "grid" : "none";
  }

  const result = calculateForEnemy(enemy, state, bundle.buffTables);
  renderMainlineMatrix(refs.mainlineMatrix, result);
  renderInnerMatrix(refs.rebattleMatrix, result.rebattle);
  renderInnerMatrix(refs.deathMatrix, result.death);
  renderDetail(refs.detailPanel, refs.detailContent, state, enemy, result, state.showDetail);
}

async function bootstrap() {
  hideError(refs.errorPanel);
  refs.metaInfo.textContent = "正在加载数据...";
  try {
    bundle = await loadDataBundle();
    bundle.enemies.sort((a, b) => Number(a.id) - Number(b.id));
    state = createState(bundle.enemies);
    setMetaInfo(refs.metaInfo, bundle.meta, bundle.manifest);
    renderAll();
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    showError(refs.errorPanel, refs.errorMessage, message);
    refs.metaInfo.textContent = "数据加载失败";
  }
}

bindEvents();
void bootstrap();
