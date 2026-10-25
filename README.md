# SWITCH 2.0

个人条件、现有资源与真实执行反馈驱动的 AI 目标决策助手。

## 当前状态

已建立 MVP 基础骨架：FastAPI、SQLite、Profile API、React/TypeScript 前端占位。

## 启动后端

```powershell
cd backend
python -m uvicorn switch2.main:app --reload
```

健康检查：`GET http://127.0.0.1:8000/health`

## 边界

当前只实现本地 SQLite 与 Profile MVP；尚未接入 Gemini、认证、计划生成、资产、阶段和 AI 评估模块。
