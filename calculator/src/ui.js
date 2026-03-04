import { DIFFICULTIES, MAINLINE_NG, TIME_OPTIONS } from "./constants.js";

function makeOption(value, label, selected) {
  const opt = document.createElement("option");
  opt.value = String(value);
  opt.textContent = label;
  if (selected) {
    opt.selected = true;
  }
  return opt;
}

export function setMetaInfo(metaInfoEl, meta, manifest) {
  const version = meta?.version || manifest?.version || "unknown";
  const generatedAt = meta?.generated_at || manifest?.generated_at || "unknown";
  metaInfoEl.textContent = `数据版本: ${version} | 生成时间: ${generatedAt}`;
}

export function renderEnemyOptions(selectEl, enemies, selectedId) {
  selectEl.innerHTML = "";
  for (const enemy of enemies) {
    const text = `${enemy.display_name || enemy.name} (${enemy.id})`;
    selectEl.appendChild(makeOption(enemy.id, text, Number(selectedId) === Number(enemy.id)));
  }
}

export function renderTimeOptions(selectEl, selectedTime) {
  selectEl.innerHTML = "";
  for (const item of TIME_OPTIONS) {
    selectEl.appendChild(makeOption(item.value, item.label, Number(selectedTime) === item.value));
  }
}

export function renderPhaseOptions(selectEl, selectedPhase, maxPhase) {
  const capped = Math.max(1, Math.min(3, Number(maxPhase || 1)));
  selectEl.innerHTML = "";
  for (let phase = 1; phase <= capped; phase += 1) {
    selectEl.appendChild(makeOption(phase, `${phase} 阶段`, Number(selectedPhase) === phase));
  }
}

function tripletCell(cell) {
  if (!cell) {
    return '<td class="na">N/A</td>';
  }
  return `<td><div class="triplet"><span>HP ${cell.hp}</span><span>躯干 ${cell.stamina}</span><span>恢复 ${cell.recover}</span></div></td>`;
}

export function renderMainlineMatrix(container, result) {
  const headers = MAINLINE_NG.map((ng) => `<th>NG${ng}</th>`).join("");
  const rows = DIFFICULTIES.map((diff) => {
    const cells = (result.mainline?.[diff.key] || []).map((cell) => tripletCell(cell)).join("");
    return `<tr><th>${diff.label}</th>${cells}</tr>`;
  }).join("");

  container.innerHTML = `
    <div class="matrix-wrap">
      <table class="matrix">
        <thead>
          <tr><th>难度</th>${headers}</tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

export function renderInnerMatrix(container, modeResult) {
  const rows = DIFFICULTIES.map((diff) => {
    const cell = modeResult?.[diff.key] ?? null;
    return `<tr><th>${diff.label}</th>${tripletCell(cell)}</tr>`;
  }).join("");

  container.innerHTML = `
    <div class="matrix-wrap">
      <table class="matrix">
        <thead>
          <tr><th>难度</th><th>结果</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

export function renderDetail(detailPanel, detailContent, state, enemy, result, showDetail) {
  if (!showDetail) {
    detailPanel.classList.add("hidden");
    return;
  }
  detailPanel.classList.remove("hidden");
  detailContent.textContent = JSON.stringify(
    {
      state,
      enemy: {
        id: enemy.id,
        name: enemy.display_name || enemy.name,
        enemy_type_buff_id: enemy.enemy_type_buff_id,
        special_buff_id: enemy.special_buff_id,
        phase_change_buff_id: enemy.phase_change_buff_id,
        inner_battle_profile: enemy.inner_battle_profile,
      },
      result,
    },
    null,
    2,
  );
}

export function showError(errorPanel, errorMessageEl, message) {
  errorMessageEl.textContent = message;
  errorPanel.classList.remove("hidden");
}

export function hideError(errorPanel) {
  errorPanel.classList.add("hidden");
}
