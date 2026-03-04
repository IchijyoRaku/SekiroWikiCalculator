import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculateForEnemy } from "../src/calculatorCore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "..", "data");

const enemies = JSON.parse(fs.readFileSync(path.join(dataDir, "enemies.json"), "utf-8"));
const buffTables = JSON.parse(fs.readFileSync(path.join(dataDir, "buff_tables.json"), "utf-8"));

const gyoubu = enemies.find((enemy) => Number(enemy.id) === 50800000);
assert.ok(gyoubu, "未找到鬼形部样例数据");

const result = calculateForEnemy(
  gyoubu,
  {
    selectedTime: 0,
    selectedPhase: 1,
    showDetail: false,
  },
  buffTables,
);

const expectedHp = {
  normal: [2552, 11101, 13321, 13876, 14431, 14709, 14986, 16651],
  bell: [3190, 11165, 13398, 13956, 14514, 14793, 15072, 16747],
  charm: [3062, 13321, 16096, 16651, 18316, 18872, 19427, 21092],
  hard: [4083, 13398, 16189, 16747, 18422, 18980, 19538, 21213],
};

for (const [key, values] of Object.entries(expectedHp)) {
  const actual = result.mainline[key].map((item) => item.hp);
  assert.deepEqual(actual, values, `主线 HP 不匹配: ${key}`);
}

assert.equal(result.rebattle.normal.hp, 13398);
assert.equal(result.rebattle.bell.hp, 15790);
assert.equal(result.rebattle.charm.hp, 16843);
assert.equal(result.rebattle.hard.hp, 21054);

assert.equal(result.death.normal.hp, 14737);
assert.equal(result.death.bell.hp, 16747);
assert.equal(result.death.charm.hp, 18527);
assert.equal(result.death.hard.hp, 22330);

console.log("sample.test.js passed");
