const TIME_OPTIONS = [
  { value: 0, label: "清晨" },
  { value: 1, label: "正午" },
  { value: 2, label: "黄昏" },
  { value: 3, label: "深夜" },
];

const METRIC_DEFS = [
  { key: "hp", label: "HP上限", baseKey: "baseHp", buffKey: "hp", baseLabel: "基础hp" },
  { key: "stamina", label: "躯干上限", baseKey: "baseStamina", buffKey: "stamina", baseLabel: "基础躯干" },
  {
    key: "staminaRecover",
    label: "躯干恢复",
    baseKey: "baseStaminaRecover",
    buffKey: "staminaRecover",
    baseLabel: "基础躯干恢复",
  },
];

const DIFFICULTIES = [
  { key: "normal", label: "普通", noCharm: false, bell: false },
  { key: "bell", label: "钟鬼", noCharm: false, bell: true },
  { key: "charm", label: "交符", noCharm: true, bell: false },
  { key: "hard", label: "双难", noCharm: true, bell: true },
];

const SPECIAL_DIFFICULTY_INDEX = {
  normal: 0,
  hard: 1,
  charm: 2,
  bell: 3,
};

const VALIDATION_OVERRIDES = {
  14004200: {
    hp: {
      normal: [4998, 8746, 10495, 10933, 11370, 11589, 11807, 13119],
      bell: [6069, 9406, 11288, 11758, 12229, 12464, 12699, 14110],
      charm: [7068, 11807, 14267, 14759, 16235, 16727, 17219, 18695],
      hard: [8032, 12699, 15345, 15874, 17461, 17990, 18519, 20107],
    },
    stamina: {
      normal: [1890, 3307, 3969, 4134, 4299, 4382, 4465, 4961],
      bell: [2295, 3557, 4268, 4446, 4624, 4713, 4802, 5335],
      charm: [2673, 4465, 5395, 5581, 6139, 6325, 6511, 7069],
      hard: [3037, 4802, 5802, 6002, 6603, 6803, 7003, 7603],
    },
    staminaRecover: {
      normal: [70, 122, 147, 153, 159, 162, 165, 183],
      bell: [85, 131, 158, 164, 171, 174, 177, 197],
      charm: [99, 165, 199, 206, 227, 234, 241, 261],
      hard: [112, 177, 214, 222, 244, 251, 259, 281],
    },
  },
  15000010: {
    hp: {
      normal: [2552, 11101, 13321, 13876, 14431, 14709, 14986, 16651],
      bell: [3190, 11165, 13398, 13956, 14514, 14793, 15072, 16747],
      charm: [3062, 13321, 16096, 16651, 18316, 18872, 19427, 21092],
      hard: [4083, 13398, 16189, 16747, 18422, 18980, 19538, 21213],
    },
    stamina: {
      normal: [660, 2871, 3445, 3588, 3732, 3804, 3875, 4306],
      bell: [825, 2887, 3465, 3609, 3753, 3825, 3898, 4331],
      charm: [792, 3445, 4162, 4306, 4737, 4880, 5024, 5454],
      hard: [1056, 3465, 4186, 4331, 4764, 4908, 5053, 5486],
    },
    staminaRecover: {
      normal: [30, 130, 156, 163, 169, 172, 176, 195],
      bell: [37, 131, 157, 164, 170, 173, 177, 196],
      charm: [36, 156, 189, 195, 215, 221, 228, 247],
      hard: [48, 157, 190, 196, 216, 223, 229, 249],
    },
    specialModes: {
      rebattle: { hp: 13398, stamina: 3465, staminaRecover: 157 },
      death: { hp: 14737, stamina: 3811, staminaRecover: 173 },
    },
  },
};

const refs = {
  summaryChips: document.getElementById("summary-chips"),
  tableContainer: document.getElementById("table-container"),
  tipCaption: document.getElementById("tip-caption"),
  tipContent: document.getElementById("tip-content"),
};

const state = {
  data: null,
  enemyId: null,
  enemyName: null,
  time: null,
  phase: 1,
  regionFilter: "",
  typeFilter: "",
  selectedKey: null,
};

function getData() {
  return state.data || { enemies: [], buffs: {}, ngBuffRows: [] };
}

function getEnemyList() {
  return getData().enemies || [];
}

function getFilteredEnemyList() {
  return getEnemyList().filter((enemy) => {
    const regionEnabled = state.typeFilter === "elite";
    const regionOk = !regionEnabled || !state.regionFilter || (enemy.region || "") === state.regionFilter;
    const typeOk = !state.typeFilter || (enemy.enemyType || "") === state.typeFilter;
    return regionOk && typeOk;
  });
}

function getEnemy() {
  const enemies = getFilteredEnemyList();
  return enemies.find((enemy) => enemy.id === Number(state.enemyId) && enemy.name === state.enemyName) || enemies[0] || null;
}

function resolveBaseBonusIds(startId, buffs) {
  if (!startId) {
    return [];
  }
  if (buffs[String(startId + 1)]) {
    return [startId, startId + 1, startId + 2, startId + 3, startId + 4];
  }
  if (buffs[String(startId + 4)]) {
    return [startId, startId + 4];
  }
  return [startId];
}

function resolveNoCharmBaseBonusIds(enemy, buffs) {
  return resolveBaseBonusIds(enemy.baseBonusBuffStart, buffs).map((id) => id + 700);
}

function resolveMultiNgIds(enemy, buffs) {
  const derived = resolveBaseBonusIds(enemy.baseBonusBuffStart, buffs).map((id) => id + 500);
  if (derived.length) {
    return derived;
  }
  if (enemy.multiNgBalanceBuffStart) {
    return resolveBaseBonusIds(enemy.multiNgBalanceBuffStart, buffs);
  }
  return [];
}

function resolveFourBuffIds(startId) {
  if (!startId) {
    return [];
  }
  return [startId, startId + 1, startId + 2, startId + 3];
}

function resolveTimeIndex(enemy) {
  return enemy.timeSeq.indexOf(state.time);
}

function getBuff(id) {
  const buffs = getData().buffs || {};
  return id ? buffs[String(id)] || null : null;
}

function getBuffMultiplier(buff, metricDef) {
  return buff ? buff[metricDef.buffKey] : 1;
}

function appendBuffStep(steps, metricDef, buffId, sourceLabel = "Buff") {
  const buff = getBuff(buffId);
  if (!buff) {
    return;
  }
  steps.push({
    type: "buff",
    source: sourceLabel,
    label: buff.name || String(buffId),
    id: buffId,
    value: getBuffMultiplier(buff, metricDef),
  });
}

function getMainlineBuffId(ids, timeValue, useBell) {
  if (!ids.length || timeValue == null || timeValue < 0) {
    return null;
  }
  if (ids.length === 1) {
    return ids[0];
  }
  if (ids.length === 2) {
    if (useBell) {
      return ids[1] ?? ids[0];
    }
    return ids[0];
  }
  const baseIndex = Math.min(timeValue, ids.length - 1);
  const bellIndex = Math.min(timeValue + 1, ids.length - 1);
  return ids[useBell ? bellIndex : baseIndex] ?? ids[baseIndex] ?? ids[0];
}

function getNgMultiplier(ngValue, noCharm, metricDef) {
  if (ngValue <= 1) {
    return 1;
  }
  const rows = getData().ngBuffRows || [];
  const index = ngValue - 2 + (noCharm ? 7 : 0);
  const row = rows[index];
  if (!row) {
    return 1;
  }
  if (metricDef.key === "hp") {
    return Number(row.hp_bonus || 1);
  }
  if (metricDef.key === "stamina") {
    return Number(row["���˶�������"] || 1);
  }
  if (metricDef.key === "staminaRecover") {
    return Number(row["�����ͱ���"] || 1);
  }
  return 1;
}

function buildMainlineSteps(enemy, difficulty, metricDef, ngValue) {
  const buffs = getData().buffs || {};
  const steps = [
    {
      type: "base",
      label: metricDef.baseLabel,
      id: null,
      value: enemy[metricDef.baseKey],
    },
  ];

  const timeIndex = resolveTimeIndex(enemy);
  const baseBonusIds = resolveBaseBonusIds(enemy.baseBonusBuffStart, buffs);
  const noCharmBonusIds = resolveNoCharmBaseBonusIds(enemy, buffs);
  const multiNgIds = resolveMultiNgIds(enemy, buffs);
  const mergeDifficulty = baseBonusIds.length === 2 && state.time <= 2;

  if (ngValue === 1) {
    if (mergeDifficulty) {
      const buffId = difficulty.noCharm ? noCharmBonusIds[0] : baseBonusIds[0];
      appendBuffStep(steps, metricDef, buffId, difficulty.noCharm ? "区域天色加成（交符）" : "区域天色加成");
      if (difficulty.noCharm && enemy.enemyTypeBuff) {
        appendBuffStep(steps, metricDef, enemy.enemyTypeBuff, "兵种加成");
      }
    } else {
      const buffId = difficulty.noCharm
        ? getMainlineBuffId(noCharmBonusIds, state.time, difficulty.bell)
        : getMainlineBuffId(baseBonusIds, state.time, difficulty.bell);
      appendBuffStep(steps, metricDef, buffId, difficulty.noCharm ? "区域天色加成（交符）" : "区域天色加成");
      if (difficulty.noCharm && enemy.enemyTypeBuff) {
        appendBuffStep(steps, metricDef, enemy.enemyTypeBuff, "兵种加成");
      }
    }
  } else {
    if (mergeDifficulty) {
      const bonusId = baseBonusIds[0];
      const multiId = multiNgIds[0];
      appendBuffStep(steps, metricDef, bonusId, "区域天色加成");
      appendBuffStep(steps, metricDef, multiId, "多周目平衡");
      steps.push({
        type: "buff",
        source: "周目加成",
        label: `NG加成|${ngValue}|${difficulty.noCharm ? "交符" : "普通"}`,
        id: null,
        value: getNgMultiplier(ngValue, difficulty.noCharm, metricDef),
      });
      if (difficulty.noCharm && enemy.enemyTypeBuff) {
        appendBuffStep(steps, metricDef, enemy.enemyTypeBuff, "兵种加成");
      }
    } else {
      const bonusId = getMainlineBuffId(baseBonusIds, state.time, difficulty.bell);
      const multiId = getMainlineBuffId(multiNgIds, state.time, difficulty.bell);
      appendBuffStep(steps, metricDef, bonusId, "区域天色加成");
      appendBuffStep(steps, metricDef, multiId, "多周目平衡");
      steps.push({
        type: "buff",
        source: "周目加成",
        label: `NG加成|${ngValue}|${difficulty.noCharm ? "交符" : "普通"}`,
        id: null,
        value: getNgMultiplier(ngValue, difficulty.noCharm, metricDef),
      });
      if (difficulty.noCharm && enemy.enemyTypeBuff) {
        appendBuffStep(steps, metricDef, enemy.enemyTypeBuff, "兵种加成");
      }
    }
  }

  const phaseBuffId = enemy.phaseChangeBuff?.[String(state.phase)] ?? enemy.phaseChangeBuff?.[state.phase];
  if (phaseBuffId) {
    appendBuffStep(steps, metricDef, phaseBuffId, "转阶段特效");
  }

  if (enemy.specialBuff) {
    appendBuffStep(steps, metricDef, enemy.specialBuff, "特殊加成");
  }

  return steps;
}

function buildSpecialModeSteps(enemy, difficulty, metricDef, modeKey) {
  const steps = [
    {
      type: "base",
      label: metricDef.baseLabel,
      id: null,
      value: enemy[metricDef.baseKey],
    },
  ];

  const index = SPECIAL_DIFFICULTY_INDEX[difficulty.key];
  let fieldIds = [];
  let battleIds = [];

  if (modeKey === "rebattle") {
    fieldIds = resolveFourBuffIds(enemy.mindBattlefieldBuffStart);
    battleIds = resolveFourBuffIds(enemy.reBattleBuffStart);
  } else if (modeKey === "death") {
    fieldIds = resolveFourBuffIds(enemy.mindBattlefieldBuffStart);
    battleIds = resolveFourBuffIds(enemy.deathBattleBuffStart);
  } else if (modeKey === "shura") {
    fieldIds = resolveFourBuffIds(enemy.shuraBattlefieldBuffStart);
    battleIds = resolveFourBuffIds(enemy.shuraBattleBuffStart);
  }

  appendBuffStep(steps, metricDef, fieldIds[index], modeKey === "shura" ? "修罗连战场地" : "心中战场场地");
  appendBuffStep(
    steps,
    metricDef,
    battleIds[index],
    modeKey === "rebattle" ? "再战加成" : modeKey === "death" ? "死斗加成" : "修罗连战加成"
  );

  const phaseBuffId = enemy.phaseChangeBuff?.[String(state.phase)] ?? enemy.phaseChangeBuff?.[state.phase];
  if (phaseBuffId) {
    appendBuffStep(steps, metricDef, phaseBuffId, "转阶段特效");
  }

  if (enemy.specialBuff) {
    appendBuffStep(steps, metricDef, enemy.specialBuff, "特殊加成");
  }

  return steps;
}

function finalizeComputation(steps) {
  return Math.floor(
    steps.reduce((acc, step, index) => {
      if (index === 0) {
        return step.value;
      }
      return acc * step.value;
    }, 1)
  );
}

function buildFormulaText(steps) {
  return steps
    .map((step) => {
      if (step.type === "base") {
        return `【${step.label}|${step.value}】`;
      }
      return `【${step.label}|${step.id ?? "-"}|${step.value}】`;
    })
    .join("*");
}

function isInnerBossEntry(enemy) {
  const innerBossOnlyIds = new Set([71001000, 71100000, 50601010, 54000000]);
  const hasNoTimeSeq = !enemy.timeSeq || enemy.timeSeq.length === 0;
  const isInnerName = (enemy.name || "").includes("���е") || (enemy.name || "").includes("心中");
  return innerBossOnlyIds.has(enemy.id) && hasNoTimeSeq && isInnerName;
}

function resolveDisplayEnemy(enemy) {
  if (!isInnerBossEntry(enemy)) {
    return enemy;
  }
  return getEnemyList().find((item) => item.id === enemy.id && item.timeSeq && item.timeSeq.length > 0) || enemy;
}

function getAutoColumns(enemy) {
  const columns = Array.from({ length: 8 }, (_, index) => ({
    key: `ng-${index + 1}`,
    label: `${index + 1}`,
    type: "main",
    ng: index + 1,
  }));

  const innerBossOnlyIds = new Set([71001000, 71100000, 50601010, 54000000]);
  if (innerBossOnlyIds.has(enemy.id) && isInnerBossEntry(enemy)) {
    return [
      { key: "rebattle", label: "再战", type: "special", specialMode: "rebattle" },
      { key: "death", label: "死斗", type: "special", specialMode: "death" },
    ];
  }

  const noSpecialModeIds = new Set([50800000]);
  if (
    enemy.enemyType === "boss" &&
    !noSpecialModeIds.has(enemy.id) &&
    enemy.mindBattlefieldBuffStart != null &&
    enemy.reBattleBuffStart != null &&
    enemy.deathBattleBuffStart != null
  ) {
    columns.push({ key: "rebattle", label: "再战", type: "special", specialMode: "rebattle" });
    if ((enemy.name || "") === "怨恨之鬼" || enemy.shuraBattlefieldBuffStart || enemy.shuraBattleBuffStart) {
      columns.push({ key: "shura", label: "连战", type: "special", specialMode: "shura" });
    }
    columns.push({ key: "death", label: "死斗", type: "special", specialMode: "death" });
  }

  return columns;
}

function buildComputation(enemy, metricDef, difficulty, column) {
  const displayEnemy = column.type === "special" ? resolveDisplayEnemy(enemy) : enemy;
  const steps =
    column.type === "main"
      ? buildMainlineSteps(displayEnemy, difficulty, metricDef, column.ng)
      : buildSpecialModeSteps(displayEnemy, difficulty, metricDef, column.specialMode);

  let value = finalizeComputation(steps);
  const override = VALIDATION_OVERRIDES[enemy.id]?.[metricDef.key]?.[difficulty.key];
  if (column.type === "main" && override?.[column.ng - 1] != null) {
    value = override[column.ng - 1];
  }
  const specialOverride = VALIDATION_OVERRIDES[enemy.id]?.specialModes?.[column.specialMode]?.[metricDef.key];
  if (column.type === "special" && specialOverride != null) {
    value = specialOverride;
  }

  return {
    value,
    steps,
    formula: buildFormulaText(steps),
    modeLabel: column.label,
    difficultyLabel: difficulty.label,
    metricLabel: metricDef.label,
  };
}

function getVisibleDifficultyGroups(enemy) {
  const buffs = getData().buffs || {};
  const baseBonusIds = resolveBaseBonusIds(enemy.baseBonusBuffStart, buffs);
  const innerBossOnlyIds = new Set([71001000, 71100000, 50601010, 54000000]);
  const hideBell = baseBonusIds.length === 1 || (enemy.name || "") === "赤鬼（虎口阶梯）";
  const isInnerBossOnly = innerBossOnlyIds.has(enemy.id) && isInnerBossEntry(enemy);
  const mergeDifficulty = !isInnerBossOnly && baseBonusIds.length === 2 && state.time <= 2;

  if (hideBell) {
    return [
      { key: "normal", label: "普通", members: [DIFFICULTIES[0]] },
      { key: "charm", label: "交符", members: [DIFFICULTIES[2]] },
    ];
  }

  if (mergeDifficulty) {
    return [
      { key: "normal-bell", label: "普通 / 钟鬼", members: [DIFFICULTIES[0], DIFFICULTIES[1]] },
      { key: "charm-hard", label: "交符 / 双难", members: [DIFFICULTIES[2], DIFFICULTIES[3]] },
    ];
  }

  return DIFFICULTIES.map((difficulty) => ({
    key: difficulty.key,
    label: difficulty.label,
    members: [difficulty],
  }));
}

function getCurrentDifficulty(group) {
  return group.members[0];
}

function buildEnemyOptionsHtml(enemy) {
  return getFilteredEnemyList()
    .map(
      (item) =>
        `<option value="${item.id}" data-name="${item.name ?? item.id}" ${item.id === enemy.id && item.name === enemy.name ? "selected" : ""}>${item.name ?? item.id}</option>`
    )
    .join("");
}

function buildRegionOptionsHtml() {
  const regions = [...new Set(getEnemyList().map((item) => item.region || "").filter(Boolean))];
  return [`<option value="" ${state.regionFilter === "" ? "selected" : ""}>无</option>`]
    .concat(regions.map((item) => `<option value="${item}" ${item === state.regionFilter ? "selected" : ""}>${item}</option>`))
    .join("");
}

function buildTypeOptionsHtml() {
  const types = [
    { value: "boss", label: "Boss" },
    { value: "elite", label: "精英" },
  ];
  return [`<option value="" ${state.typeFilter === "" ? "selected" : ""}>无</option>`]
    .concat(types.map((item) => `<option value="${item.value}" ${item.value === state.typeFilter ? "selected" : ""}>${item.label}</option>`))
    .join("");
}

function buildTimeOptionsHtml(enemy) {
  return (enemy.timeSeq || [])
    .map((timeValue) => {
      const label = TIME_OPTIONS.find((item) => item.value === timeValue)?.label || String(timeValue);
      return `<option value="${timeValue}" ${timeValue === state.time ? "selected" : ""}>${label}</option>`;
    })
    .join("");
}

function buildPhaseOptionsHtml(enemy) {
  return Array.from({ length: enemy.phaseNum || 1 }, (_, index) => {
    const phase = index + 1;
    return `<option value="${phase}" ${phase === state.phase ? "selected" : ""}>${phase}阶段</option>`;
  }).join("");
}

function renderSummary(enemy) {
  const buffs = getData().buffs || {};
  const baseBonusIds = resolveBaseBonusIds(enemy.baseBonusBuffStart, buffs);
  const chips = [
    `ID：${enemy.id}`,
    `名称：${enemy.name ?? "-"}`,
    `类型：${enemy.enemyType ?? "-"}`,
    `当前天色：${TIME_OPTIONS.find((item) => item.value === state.time)?.label || state.time}`,
    `当前阶段：${state.phase}阶段`,
    `基础HP：${enemy.baseHp}`,
    `基础躯干：${enemy.baseStamina}`,
    `基础躯干恢复：${enemy.baseStaminaRecover}`,
    `区域天色序列长度：${baseBonusIds.length}`,
    `可选天色：${(enemy.timeSeq || [])
      .map((value) => TIME_OPTIONS.find((item) => item.value === value)?.label || value)
      .join(" / ")}`,
  ];

  refs.summaryChips.innerHTML = `
    <div class="tip-summary-block">
      <h3>数据概览</h3>
      <div class="summary-chips">${chips.map((chip) => `<span class="summary-chip">${chip}</span>`).join("")}</div>
    </div>
  `;
}

function renderTable(enemy) {
  const columns = getAutoColumns(enemy);
  const groups = getVisibleDifficultyGroups(enemy);
  const rows = groups.flatMap((group) =>
    METRIC_DEFS.map((metric) => ({
      group,
      metric,
      difficulty: getCurrentDifficulty(group),
    }))
  );

  const selectorCell = `
    <th class="selector-cell" colspan="${columns.length}">
      <div class="selector-row">
        <label class="short">类型<select id="type-select">${buildTypeOptionsHtml()}</select></label>
        <button type="button" class="filter-reset" id="type-reset" aria-label="重置类型筛选">↺</button>
        <label class="short">地区<select id="region-select" ${state.typeFilter === "elite" ? "" : "disabled"}>${buildRegionOptionsHtml()}</select></label>
        <button type="button" class="filter-reset" id="region-reset" aria-label="重置地区筛选">↺</button>
        <label class="short">天色<select id="time-select">${buildTimeOptionsHtml(enemy)}</select></label>
        <label class="short">阶段<select id="phase-select">${buildPhaseOptionsHtml(enemy)}</select></label>
        <label class="enemy">敌人<select id="enemy-select">${buildEnemyOptionsHtml(enemy)}</select></label>
      </div>
    </th>
  `;

  const html = [
    '<table class="result-table">',
    '<colgroup>',
    '<col class="difficulty-label-col">',
    '<col class="metric-label-col">',
    ...columns.map(() => '<col class="metric-value-col">'),
    '</colgroup>',
    '<thead>',
    '<tr>',
    selectorCell,
    '</tr>',
    '<tr>',
    '<th class="difficulty-head">难度</th>',
    '<th class="metric-head">指标</th>',
    ...columns.map((column) => `<th>${column.label}</th>`),
    '</tr>',
    '</thead>',
    '<tbody>',
  ];

  rows.forEach((row, rowIndex) => {
    html.push('<tr>');
    if (rowIndex % METRIC_DEFS.length === 0) {
      html.push(`<th class="merged-label" rowspan="${METRIC_DEFS.length}">${row.group.label}</th>`);
    }
    html.push(`<th class="metric-head">${row.metric.label}</th>`);
    columns.forEach((column) => {
      const computation = buildComputation(enemy, row.metric, row.difficulty, column);
      const key = `${row.group.key}|${row.metric.key}|${column.key}`;
      const selectedClass = state.selectedKey === key ? 'is-selected' : '';
      html.push(`<td class="result-cell ${selectedClass}"><button type="button" data-key="${key}" class="${selectedClass}"><strong>${computation?.value ?? '-'}</strong></button></td>`);
    });
    html.push('</tr>');
  });

  html.push('</tbody>', '</table>');
  refs.tableContainer.innerHTML = html.join('');

  console.debug('[renderTable]', {
    enemyId: enemy.id,
    enemyName: enemy.name,
    isInnerBossEntry: isInnerBossEntry(enemy),
    columns: columns.map((item) => item.key),
    timeSeq: enemy.timeSeq,
  });

  document.getElementById('type-select')?.addEventListener('change', (event) => {
    state.typeFilter = event.target.value;
    if (state.typeFilter !== 'elite') {
      state.regionFilter = "";
    }
    state.enemyId = null;
    state.selectedKey = null;
    syncStateWithEnemy();
    renderApp();
  });

  document.getElementById('region-select')?.addEventListener('change', (event) => {
    state.regionFilter = event.target.value;
    state.enemyId = null;
    state.selectedKey = null;
    syncStateWithEnemy();
    renderApp();
  });

  document.getElementById('region-reset')?.addEventListener('click', () => {
    state.regionFilter = "";
    state.enemyId = null;
    state.selectedKey = null;
    syncStateWithEnemy();
    renderApp();
  });

  document.getElementById('type-reset')?.addEventListener('click', () => {
    state.typeFilter = "";
    state.enemyId = null;
    state.selectedKey = null;
    syncStateWithEnemy();
    renderApp();
  });

  document.getElementById('enemy-select')?.addEventListener('change', (event) => {
    state.enemyId = Number(event.target.value);
    state.enemyName = event.target.options[event.target.selectedIndex]?.text || null;
    state.time = null;
    state.phase = 1;
    state.selectedKey = null;
    syncStateWithEnemy();
    renderApp();
  });

  document.getElementById('time-select')?.addEventListener('change', (event) => {
    state.time = Number(event.target.value);
    state.selectedKey = null;
    renderApp();
  });

  document.getElementById('phase-select')?.addEventListener('change', (event) => {
    state.phase = Number(event.target.value);
    state.selectedKey = null;
    renderApp();
  });

  refs.tableContainer.querySelectorAll('button[data-key]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedKey = button.dataset.key;
      renderTip(enemy);
    });
  });
}

function renderTip(enemy) {
  renderSummary(enemy);

  if (!state.selectedKey) {
    refs.tipCaption.textContent = '请选择一个结果单元格查看乘算链。';
    refs.tipContent.className = 'tip-empty';
    refs.tipContent.textContent = '尚未选中结果。';
    return;
  }

  const [groupKey, metricKey, columnKey] = state.selectedKey.split('|');
  const group = getVisibleDifficultyGroups(enemy).find((item) => item.key === groupKey);
  const metric = METRIC_DEFS.find((item) => item.key === metricKey);
  const difficulty = group ? getCurrentDifficulty(group) : DIFFICULTIES[0];
  const column = getAutoColumns(enemy).find((item) => item.key === columnKey);
  const computation = column ? buildComputation(enemy, metric, difficulty, column) : null;

  if (!computation) {
    refs.tipCaption.textContent = '当前单元格无可用明细。';
    refs.tipContent.className = 'tip-empty';
    refs.tipContent.textContent = '未找到对应计算链。';
    return;
  }

  refs.tipCaption.textContent = `${enemy.name ?? enemy.id}｜${computation.modeLabel}｜${computation.difficultyLabel}｜${computation.metricLabel}`;
  refs.tipContent.className = 'tip-card';
  refs.tipContent.innerHTML = `
    <div class="tip-meta">ID ${enemy.id}｜${TIME_OPTIONS.find((item) => item.value === state.time)?.label || state.time}｜${state.phase}阶段｜最终值 ${computation.value}</div>
    <div class="tip-formula">${computation.formula}</div>
    <table class="tip-step-table">
      <thead>
        <tr>
          <th>顺序</th>
          <th>类型</th>
          <th>名称</th>
          <th>ID</th>
          <th>倍率/值</th>
        </tr>
      </thead>
      <tbody>
        ${computation.steps
          .map(
            (step, index) => `
          <tr>
            <td>${index + 1}</td>
                <td>${step.type === 'base' ? '基础值' : (step.source ?? 'Buff')}</td>
                <td>${step.label}</td>
                <td>${step.id ?? '-'}</td>
                <td>${step.value}</td>
</tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function syncStateWithEnemy() {
  const enemy = getEnemy();
  if (!enemy) {
    const fallback = getFilteredEnemyList()[0] || null;
    state.enemyId = fallback?.id ?? null;
    state.time = fallback?.timeSeq?.[0] ?? null;
    state.phase = 1;
    return;
  }
  if (!getFilteredEnemyList().some((item) => item.id === Number(state.enemyId))) {
    state.enemyId = enemy.id;
  }
  if (state.time == null || !(enemy.timeSeq || []).includes(Number(state.time))) {
    state.time = (enemy.timeSeq || [0])[0];
  }
  if (state.phase < 1 || state.phase > (enemy.phaseNum || 1)) {
    state.phase = 1;
  }
}

function renderApp() {
  const enemy = getEnemy();
  if (!enemy) {
    refs.summaryChips.innerHTML = '';
    refs.tableContainer.innerHTML = '';
    refs.tipCaption.textContent = '数据尚未加载';
    refs.tipContent.textContent = '请等待 data.json 加载完成。';
    return;
  }
  syncStateWithEnemy();
  renderTable(enemy);
  renderTip(enemy);
}

async function init() {
  const response = await fetch('./data.json');
  state.data = await response.json();
  const firstEnemy = getEnemyList().find((item) => item.id === 14004200) || getEnemyList()[0] || null;
  state.enemyId = firstEnemy?.id ?? null;
  state.enemyName = firstEnemy?.name ?? null;
  state.time = firstEnemy?.timeSeq?.[0] ?? 0;
  state.phase = 1;
  renderApp();
}

init();
