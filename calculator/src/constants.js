export const TIME_OPTIONS = [
  { value: 0, label: "清晨" },
  { value: 1, label: "正午" },
  { value: 2, label: "黄昏" },
  { value: 3, label: "深夜" },
  { value: 4, label: "深夜+钟鬼" },
];

export const DIFFICULTIES = [
  { key: "normal", label: "普通", calcIndex: 0, isBell: false, isCharm: false },
  { key: "bell", label: "钟鬼", calcIndex: 3, isBell: true, isCharm: false },
  { key: "charm", label: "交符", calcIndex: 2, isBell: false, isCharm: true },
  { key: "hard", label: "双难", calcIndex: 1, isBell: true, isCharm: true },
];

export const MAINLINE_NG = [1, 2, 3, 4, 5, 6, 7, 8];
