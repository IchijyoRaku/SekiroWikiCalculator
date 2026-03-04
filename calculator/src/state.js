export function createState(enemies) {
  const first = enemies[0];
  return {
    selectedEnemyId: first?.id ?? null,
    selectedTime: first?.default_time_seq ?? 0,
    selectedPhase: 1,
    showDetail: false,
  };
}

export function findEnemy(enemies, enemyId) {
  return enemies.find((enemy) => Number(enemy.id) === Number(enemyId)) || null;
}
