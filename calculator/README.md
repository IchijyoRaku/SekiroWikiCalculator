# calculator

基于 `DB/整合表.sqlite` 的前端计算器实现。

## 功能

- 敌人、天色、阶段输入
- 主线 `8x4` 结果矩阵（普通/钟鬼/交符/双难）
- 再战/死斗结果矩阵（4 难度）
- 乘区明细调试视图

## 目录

- `scripts/export_data.py`：从 SQLite 导出前端 JSON
- `config/enemy_overrides.json`：补充 `special_buff` / `phase_change` / 特殊连战映射
- `data/*.json`：前端运行数据
- `src/*.js`：数据加载、计算核心、UI
- `tests/sample.test.js`：鬼形部样例断言

## 使用

1. 生成数据：

```bash
npm run build:data
```

2. 运行测试：

```bash
npm test
```

3. 启动本地静态服务：

```bash
npm run start
```

然后访问 `http://localhost:4173`。

## 说明

- 当前 `整合表.sqlite` 中：
  - `enemy_type_buff_id` 使用 `npc_param.base_bonus_buff_for_first_NG_no_charm`
  - 一周目交符天色 buff 使用 `multi_NG_balance_buff + 200` 推导
- `special_buff`、`phase_change_buff`、特殊再战映射通过 `config/enemy_overrides.json` 补齐，可持续维护。
