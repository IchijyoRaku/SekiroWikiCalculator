#!/usr/bin/env python3
from __future__ import annotations

import html
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
CALCULATOR_DIR = ROOT / "calculator"
DATA_DIR = CALCULATOR_DIR / "data"
OVERRIDES_PATH = CALCULATOR_DIR / "config" / "enemy_overrides.json"


def resolve_db_path() -> Path:
    # "整合表.sqlite"
    base = "".join(chr(c) for c in (25972, 21512, 34920))
    return ROOT / "DB" / f"{base}.sqlite"


def to_int(value: Any) -> int | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def to_float(value: Any, default: float = 1.0) -> float:
    if value is None:
        return default
    text = str(value).strip()
    if not text:
        return default
    try:
        return float(text)
    except ValueError:
        return default


def parse_name(raw_name: str) -> tuple[str, str]:
    decoded = html.unescape(raw_name or "").strip()
    if " -- " in decoded:
        left, right = decoded.split(" -- ", 1)
        display = right.strip() or left.strip() or decoded
        return decoded, display
    return decoded, decoded


def load_overrides() -> dict[str, dict[str, Any]]:
    if not OVERRIDES_PATH.exists():
        return {}
    data = json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        return {}
    return {str(k): v for k, v in data.items() if isinstance(v, dict)}


def get_table_columns(conn: sqlite3.Connection, table: str) -> list[str]:
    return [row[1] for row in conn.execute(f'PRAGMA table_info("{table}")').fetchall()]


def load_buff_table(conn: sqlite3.Connection, table: str) -> dict[int, dict[str, Any]]:
    cols = get_table_columns(conn, table)
    id_col = cols[0]
    hp_col = "hp_bonus"
    atk_col = "atk_bonus"
    name_col = cols[1] if len(cols) > 1 else None

    out: dict[int, dict[str, Any]] = {}
    sql = f'SELECT "{id_col}", "{name_col}"' if name_col else f'SELECT "{id_col}"'
    sql += f', "{hp_col}", "{atk_col}" FROM "{table}"'

    for row in conn.execute(sql):
        buff_id = to_int(row[0])
        if buff_id is None:
            continue
        name = row[1] if name_col else ""
        hp = to_float(row[2] if name_col else row[1])
        atk = to_float(row[3] if name_col else row[2])
        out[buff_id] = {"name": name or "", "hp_bonus": hp, "atk_bonus": atk}
    return out


def load_enemy_type(conn: sqlite3.Connection) -> dict[int, dict[str, float]]:
    out: dict[int, dict[str, float]] = {}
    for buff_id, hp_bonus in conn.execute('SELECT "enemy_type", "hp_bonus" FROM "enemy_type_buff"'):
        parsed_id = to_int(buff_id)
        if parsed_id is None:
            continue
        out[parsed_id] = {"hp_bonus": to_float(hp_bonus)}
    return out


def load_inner_battle(conn: sqlite3.Connection) -> dict[int, dict[str, Any]]:
    out: dict[int, dict[str, Any]] = {}
    for buff_id, name, hp_bonus, atk_bonus in conn.execute(
        'SELECT "ID", "Name", "hp_bonus", "atk_bonus" FROM "inner_battle_buff"'
    ):
        parsed_id = to_int(buff_id)
        if parsed_id is None:
            continue
        out[parsed_id] = {
            "name": name or "",
            "hp_bonus": to_float(hp_bonus),
            "atk_bonus": to_float(atk_bonus),
        }
    return out


def load_speffect(conn: sqlite3.Connection) -> dict[int, dict[str, Any]]:
    out: dict[int, dict[str, Any]] = {}
    for row in conn.execute(
        'SELECT "ID", "Name", "conditionHp", "hp_bonus", "stamina_bonus", "atk_bonus", '
        '"staminaRecoverSpeedRate" FROM "speffect_param"'
    ):
        buff_id = to_int(row[0])
        if buff_id is None:
            continue
        out[buff_id] = {
            "name": row[1] or "",
            "condition_hp": to_float(row[2], default=0.0),
            "hp_bonus": to_float(row[3]),
            "stamina_bonus": to_float(row[4]),
            "atk_bonus": to_float(row[5]),
            "stamina_recover_speed_rate": to_float(row[6]),
        }
    return out


def load_ng_buff(conn: sqlite3.Connection) -> dict[str, list[float]]:
    rows = [to_float(row[0]) for row in conn.execute('SELECT "hp_bonus" FROM "NG_buff" ORDER BY rowid')]
    normal = [1.0] + rows[:7]
    charm = [1.0] + rows[7:14]
    if len(normal) < 8:
        normal.extend([normal[-1]] * (8 - len(normal)))
    if len(charm) < 8:
        charm.extend([charm[-1]] * (8 - len(charm)))
    return {"normal": normal[:8], "charm": charm[:8]}


def expand_time_ids(root_id: int | None, buff_table: dict[int, dict[str, Any]]) -> list[int]:
    if root_id is None:
        return []
    keys = buff_table.keys()
    if all((root_id + idx) in keys for idx in range(5)):
        return [root_id + idx for idx in range(5)]
    if root_id in keys and (root_id + 4) in keys:
        return [root_id, root_id, root_id, root_id + 4, root_id + 4]
    if root_id in keys:
        return [root_id] * 5
    return []


def default_inner_profile(enemy_type_buff_id: int | None, full_name: str) -> str:
    if enemy_type_buff_id != 7903:
        return "none"

    lowered = full_name.lower()
    if "夜叉猿" in full_name or "yasha ape" in lowered:
        return "lion_ape"
    if "仏師（鬼）" in full_name or "demon of hatred" in lowered:
        return "demon_hatred"
    if "ライバル（裏）" in full_name or "rival (back)" in lowered:
        return "inner_genichiro"
    return "generic"


PROFILE_BUFFS = {
    "none": {"mind": [], "re": [], "death": []},
    "generic": {"mind": [7950, 7951, 7952, 7953], "re": [7954, 7955, 7956, 7957], "death": [7958, 7959, 7960, 7961]},
    "lion_ape": {"mind": [7930, 7931, 7932, 7933], "re": [7934, 7935, 7936, 7937], "death": [7938, 7939, 7940, 7941]},
    "inner_genichiro": {"mind": [7962, 7963, 7964, 7965], "re": [7966, 7967, 7968, 7969], "death": [7970, 7971, 7972, 7973]},
    "demon_hatred": {"mind": [7974, 7975, 7976, 7977], "re": [7978, 7979, 7980, 7981], "death": [7982, 7983, 7984, 7985]},
    "isshin_set": {"mind": [7986, 7987, 7988, 7989], "re": [7954, 7955, 7956, 7957], "death": [7958, 7959, 7960, 7961]},
}


def apply_profile(profile: str) -> dict[str, list[int]]:
    return PROFILE_BUFFS.get(profile, PROFILE_BUFFS["none"])


def build_enemy(
    row: sqlite3.Row,
    overrides: dict[str, dict[str, Any]],
    base_bonus_buff: dict[int, dict[str, Any]],
    base_bonus_buff_first: dict[int, dict[str, Any]],
    multi_ng_buff: dict[int, dict[str, Any]],
    enemy_type_buff: dict[int, dict[str, Any]],
) -> dict[str, Any] | None:
    npc_id = to_int(row["ID"])
    if npc_id is None or npc_id < 10_000_000:
        return None

    base_root = to_int(row["base_bonus_buff"])
    multi_root = to_int(row["multi_NG_balance_buff"])
    enemy_type_id = to_int(row["base_bonus_buff_for_first_NG_no_charm"])

    if base_root is None or base_root < 0 or multi_root is None or multi_root < 0:
        return None

    if enemy_type_id not in enemy_type_buff:
        enemy_type_id = None

    full_name, display_name = parse_name(str(row["Name"] or ""))
    override = overrides.get(str(npc_id), {})

    one_ng_root = multi_root + 200
    if one_ng_root not in base_bonus_buff_first and (base_root + 700) in base_bonus_buff_first:
        one_ng_root = base_root + 700

    base_bonus_ids = expand_time_ids(base_root, base_bonus_buff)
    one_ng_ids = expand_time_ids(one_ng_root, base_bonus_buff_first)
    multi_ng_ids = expand_time_ids(multi_root, multi_ng_buff)

    if not one_ng_ids and base_bonus_ids:
        shifted = [item + 700 for item in base_bonus_ids]
        if all(item in base_bonus_buff_first for item in shifted):
            one_ng_ids = shifted

    profile = str(override.get("inner_battle_profile") or default_inner_profile(enemy_type_id, full_name))
    profile_ids = apply_profile(profile)

    if "mind_battlefield_buff_ids" in override:
        profile_ids["mind"] = [to_int(x) for x in override["mind_battlefield_buff_ids"] if to_int(x) is not None]
    if "re_battle_buff_ids" in override:
        profile_ids["re"] = [to_int(x) for x in override["re_battle_buff_ids"] if to_int(x) is not None]
    if "death_battle_buff_ids" in override:
        profile_ids["death"] = [to_int(x) for x in override["death_battle_buff_ids"] if to_int(x) is not None]

    phase_change = to_int(override.get("phase_change_buff_id"))
    special_buff = to_int(override.get("special_buff_id"))
    buff_phase_num = to_int(override.get("buff_active_phase_num")) or 1
    time_seq = to_int(override.get("time_seq")) or 0

    return {
        "id": npc_id,
        "name": full_name,
        "display_name": display_name,
        "base_hp": to_int(row["base_hp"]) or 0,
        "base_stamina": to_int(row["base_stamina"]) or 0,
        "base_stamina_recover": to_int(row["base_stamina_recover"]) or 0,
        "time_seq": [0, 1, 2, 3, 4],
        "default_time_seq": max(0, min(4, time_seq)),
        "base_bonus_buff_ids": base_bonus_ids,
        "base_bonus_buff_for_first_ng_no_charm_ids": one_ng_ids,
        "multi_ng_balance_buff_ids": multi_ng_ids,
        "enemy_type_buff_id": enemy_type_id,
        "special_buff_id": special_buff,
        "phase_change_buff_id": phase_change,
        "buff_active_phase_num": max(1, min(3, buff_phase_num)),
        "mind_battlefield_buff_ids": profile_ids["mind"],
        "re_battle_buff_ids": profile_ids["re"],
        "death_battle_buff_ids": profile_ids["death"],
        "inner_battle_profile": profile,
        "source": {
            "base_bonus_buff_root_id": base_root,
            "multi_ng_balance_buff_root_id": multi_root,
            "derived_one_ng_root_id": one_ng_root,
        },
    }


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    db_path = resolve_db_path()
    if not db_path.exists():
        raise FileNotFoundError(f"Database not found: {db_path}")

    overrides = load_overrides()

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        base_bonus_buff = load_buff_table(conn, "base_bonus_buff")
        base_bonus_buff_first = load_buff_table(conn, "base_bonus_buff_for_first_NG_no")
        multi_ng_balance_buff = load_buff_table(conn, "multi_NG_balance_buff")
        enemy_type_buff = load_enemy_type(conn)
        inner_battle_buff = load_inner_battle(conn)
        speffect_param = load_speffect(conn)
        ng_buff = load_ng_buff(conn)

        npc_rows = conn.execute(
            'SELECT "ID", "Name", "base_hp", "base_stamina", "base_bonus_buff", '
            '"base_bonus_buff_for_first_NG_no_charm", "multi_NG_balance_buff", "base_stamina_recover" '
            'FROM "npc_param" ORDER BY "ID"'
        ).fetchall()

        enemies: list[dict[str, Any]] = []
        for row in npc_rows:
            built = build_enemy(
                row,
                overrides,
                base_bonus_buff=base_bonus_buff,
                base_bonus_buff_first=base_bonus_buff_first,
                multi_ng_buff=multi_ng_balance_buff,
                enemy_type_buff=enemy_type_buff,
            )
            if built:
                enemies.append(built)

        buff_tables = {
            "base_bonus_buff": base_bonus_buff,
            "base_bonus_buff_for_first_ng_no": base_bonus_buff_first,
            "multi_ng_balance_buff": multi_ng_balance_buff,
            "ng_buff": ng_buff,
            "enemy_type_buff": enemy_type_buff,
            "inner_battle_buff": inner_battle_buff,
            "speffect_param": speffect_param,
        }

        now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
        version = now.replace(":", "").replace("-", "").replace("+00:00", "Z")
        meta = {
            "version": version,
            "generated_at": now,
            "source_db": str(db_path.relative_to(ROOT)),
            "counts": {
                "enemies": len(enemies),
                "base_bonus_buff": len(base_bonus_buff),
                "base_bonus_buff_for_first_ng_no": len(base_bonus_buff_first),
                "multi_ng_balance_buff": len(multi_ng_balance_buff),
                "enemy_type_buff": len(enemy_type_buff),
                "inner_battle_buff": len(inner_battle_buff),
                "speffect_param": len(speffect_param),
            },
        }

        manifest = {
            "version": version,
            "generated_at": now,
            "files": {
                "enemies": "./enemies.json",
                "buff_tables": "./buff_tables.json",
                "meta": "./meta.json",
            },
        }

        write_json(DATA_DIR / "enemies.json", enemies)
        write_json(DATA_DIR / "buff_tables.json", buff_tables)
        write_json(DATA_DIR / "meta.json", meta)
        write_json(DATA_DIR / "manifest.json", manifest)

        print(f"Generated data in: {DATA_DIR}")
        print(f"Enemies: {len(enemies)}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
