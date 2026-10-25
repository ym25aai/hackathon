type Language = "English" | "简体中文" | "繁體中文";

const copies = {
  English: { settings: "Settings", title: "Explore your human engine.", subtitle: "Turn an abstract decision into a testable next move.", run: "Run simulation", result: "Decision result", titleLabel: "Scenario title", context: "Current context", action: "Choose a first move", question: "Ask your question", submit: "Start simulation", loading: "Analyzing...", validate: "Validate and continue", back: "Back", reset: "Start over", copy: "Copy report", export: "Export Report" },
  "简体中文": { settings: "设置", title: "探索你的人类引擎。", subtitle: "把抽象决定变成可验证的下一步。", run: "开始模拟", result: "模拟结果", titleLabel: "情境名称", context: "当前情况", action: "选择第一步", question: "提出你的问题", submit: "开始模拟", loading: "分析中...", validate: "检查并继续", back: "返回", reset: "重新开始", copy: "复制报告", export: "导出报告" },
  "繁體中文": { settings: "設定", title: "探索你的人類引擎。", subtitle: "把抽象決定變成可驗證的下一步。", run: "開始模擬", result: "模擬結果", titleLabel: "情境名稱", context: "目前情況", action: "選擇第一步", question: "提出你的問題", submit: "開始模擬", loading: "分析中...", validate: "檢查並繼續", back: "返回", reset: "重新開始", copy: "複製報告", export: "匯出報告" },
} as const;

export const cleanEngineCopy = (language: string) => copies[(language as Language)] || copies.English;
