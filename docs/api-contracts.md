# API 契约草案

| 方法 | 路径 | 状态 |
|---|---|---|
| GET | `/health` | 已实现 |
| GET/POST | `/api/profiles` | 已实现 |
| POST | `/api/goals` | 契约已建立 |
| POST | `/api/plans/generate` | MVP 1 待实现 |
| POST | `/api/stages/split` | MVP 1 待实现 |
| POST | `/api/reviews` | MVP 1 待实现 |

金额使用整数最小货币单位；时间以 UTC 存储；AI 结果必须带来源、输入版本和状态。
