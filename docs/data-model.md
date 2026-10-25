# 数据模型与迁移顺序

核心实体：`profiles`、`preferences`、`goals`、`plans`、`plan_versions`、`stages`、`assets`、`activities`、`reviews`、`evidence`、`ai_calls`、`reminder_rules`、`jobs`。

所有业务实体带 `profile_id`、状态、版本和时间戳。实际迁移执行前必须备份、在副本验证、检查兼容性并准备回滚。
