import { DIFFICULTIES, MAINLINE_NG } from "./constants.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toNum(value, fallback = 1) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function floorStat(value) {
  return Math.floor(toNum(value, 0));
}

function getBuffRow(table, id, buffTables) {
  if (id == null) {
    return null;
  }
  const dataset = buffTables?.[table];
  if (!dataset) {
    return null;
  }
  return dataset[String(id)] ?? dataset[id] ?? null;
}

function getHpBonus(table, id, buffTables) {
  const row = getBuffRow(table, id, buffTables);
  return row ? toNum(row.hp_bonus, 1) : 1;
}

function pickTimeBuff(buffIds, timeIndex, isBell, tableName, buffTables) {
  if (!Array.isArray(buffIds) || buffIds.length === 0) {
    return { id: null, hpBonus: 1, source: `${tableName}:missing` };
  }
  const idx = clamp((isBell ? timeIndex + 1 : timeIndex), 0, 4);
  const id = buffIds[idx] ?? buffIds[buffIds.length - 1];
  return {
    id,
    hpBonus: getHpBonus(tableName, id, buffTables),
    source: `${tableName}[${idx}]`,
  };
}

function getNgBonus(ng, isCharm, buffTables) {
  const list = isCharm ? buffTables?.ng_buff?.charm : buffTables?.ng_buff?.normal;
  if (!Array.isArray(list) || list.length === 0) {
    return 1;
  }
  const idx = clamp(ng - 1, 0, list.length - 1);
  return toNum(list[idx], 1);
}

function resolveSpecialMultipliers(enemy, selectedPhase, buffTables) {
  let hp = 1;
  let stamina = 1;
  let recover = 1;
  const applied = [];

  const applySpeffect = (id, tag) => {
    if (!id) {
      return;
    }
    const row = getBuffRow("speffect_param", id, buffTables);
    if (!row) {
      applied.push({ tag, id, exists: false, hp: 1, stamina: 1, recover: 1 });
      return;
    }
    const hpMul = toNum(row.hp_bonus, 1);
    const staminaMul = toNum(row.stamina_bonus ?? row.hp_bonus, 1);
    const recoverMul = toNum(row.stamina_recover_speed_rate, 1);
    hp *= hpMul;
    stamina *= staminaMul;
    recover *= recoverMul;
    applied.push({
      tag,
      id,
      exists: true,
      name: row.name ?? "",
      hp: hpMul,
      stamina: staminaMul,
      recover: recoverMul,
    });
  };

  applySpeffect(enemy.special_buff_id, "special");

  const shouldApplyPhase =
    enemy.phase_change_buff_id &&
    toNum(selectedPhase, 1) >= toNum(enemy.buff_active_phase_num, 1);
  if (shouldApplyPhase) {
    applySpeffect(enemy.phase_change_buff_id, "phase");
  }

  return { hp, stamina, recover, applied };
}

function makeStatCell(base, baseMul, specialMul, breakdown) {
  return {
    hp: floorStat(base.hp * baseMul * specialMul.hp),
    stamina: floorStat(base.stamina * baseMul * specialMul.stamina),
    recover: floorStat(base.recover * baseMul * specialMul.recover),
    breakdown,
  };
}

function calcMainline(enemy, state, buffTables, specialMul) {
  const base = {
    hp: toNum(enemy.base_hp, 0),
    stamina: toNum(enemy.base_stamina, 0),
    recover: toNum(enemy.base_stamina_recover, 0),
  };
  const timeIndex = toNum(state.selectedTime, 0);
  const enemyTypeBonus = getHpBonus("enemy_type_buff", enemy.enemy_type_buff_id, buffTables);
  const out = {};

  for (const difficulty of DIFFICULTIES) {
    const rows = [];
    for (const ng of MAINLINE_NG) {
      const timeMain = pickTimeBuff(
        enemy.base_bonus_buff_ids,
        timeIndex,
        difficulty.isBell,
        "base_bonus_buff",
        buffTables,
      );
      const timeFirstCharm = pickTimeBuff(
        enemy.base_bonus_buff_for_first_ng_no_charm_ids,
        timeIndex,
        difficulty.isBell,
        "base_bonus_buff_for_first_ng_no",
        buffTables,
      );
      const timeMulti = pickTimeBuff(
        enemy.multi_ng_balance_buff_ids,
        timeIndex,
        difficulty.isBell,
        "multi_ng_balance_buff",
        buffTables,
      );
      const ngBonus = getNgBonus(ng, difficulty.isCharm, buffTables);

      let baseMul = 1;
      if (ng === 1) {
        baseMul = difficulty.isCharm
          ? timeFirstCharm.hpBonus * enemyTypeBonus
          : timeMain.hpBonus;
      } else {
        baseMul =
          timeMain.hpBonus *
          timeMulti.hpBonus *
          ngBonus *
          (difficulty.isCharm ? enemyTypeBonus : 1);
      }

      rows.push(
        makeStatCell(base, baseMul, specialMul, {
          mode: "mainline",
          difficulty: difficulty.key,
          ng,
          multipliers: {
            base_time: { id: timeMain.id, hp_bonus: timeMain.hpBonus, source: timeMain.source },
            first_ng_charm_time: {
              id: timeFirstCharm.id,
              hp_bonus: timeFirstCharm.hpBonus,
              source: timeFirstCharm.source,
            },
            multi_ng_time: { id: timeMulti.id, hp_bonus: timeMulti.hpBonus, source: timeMulti.source },
            ng_bonus: ngBonus,
            enemy_type: {
              id: enemy.enemy_type_buff_id,
              hp_bonus: difficulty.isCharm ? enemyTypeBonus : 1,
            },
          },
          special_phase: specialMul.applied,
        }),
      );
    }
    out[difficulty.key] = rows;
  }

  return out;
}

function calcInnerMode(enemy, buffTables, specialMul, mode) {
  const base = {
    hp: toNum(enemy.base_hp, 0),
    stamina: toNum(enemy.base_stamina, 0),
    recover: toNum(enemy.base_stamina_recover, 0),
  };
  const mindIds = enemy.mind_battlefield_buff_ids ?? [];
  const modeIds = mode === "rebattle" ? enemy.re_battle_buff_ids ?? [] : enemy.death_battle_buff_ids ?? [];
  const out = {};

  for (const difficulty of DIFFICULTIES) {
    const idx = difficulty.calcIndex;
    const mindId = mindIds[idx];
    const modeId = modeIds[idx];

    if (!mindId || !modeId) {
      out[difficulty.key] = null;
      continue;
    }

    const mindBonus = getHpBonus("inner_battle_buff", mindId, buffTables);
    const modeBonus = getHpBonus("inner_battle_buff", modeId, buffTables);
    const baseMul = mindBonus * modeBonus;

    out[difficulty.key] = makeStatCell(base, baseMul, specialMul, {
      mode,
      difficulty: difficulty.key,
      multipliers: {
        mind: { id: mindId, hp_bonus: mindBonus },
        mode_buff: { id: modeId, hp_bonus: modeBonus },
      },
      special_phase: specialMul.applied,
    });
  }

  return out;
}

export function calculateForEnemy(enemy, state, buffTables) {
  const specialMul = resolveSpecialMultipliers(enemy, state.selectedPhase, buffTables);

  return {
    mainline: calcMainline(enemy, state, buffTables, specialMul),
    rebattle: calcInnerMode(enemy, buffTables, specialMul, "rebattle"),
    death: calcInnerMode(enemy, buffTables, specialMul, "death"),
    meta: {
      selectedTime: state.selectedTime,
      selectedPhase: state.selectedPhase,
      specialPhaseApplied: specialMul.applied,
      innerProfile: enemy.inner_battle_profile ?? "none",
    },
  };
}
