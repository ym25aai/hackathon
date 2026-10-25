from .schemas import DomainPack

DOMAIN_PACKS = {
    "self": DomainPack(id="self", title="SELF", description="Personal development and self-management.", state_variables=["motivation", "routine_stability"], actions=["reflect", "plan", "experiment"], evaluation_criteria=["consistency", "self_awareness"]),
    "education": DomainPack(id="education", title="EDUCATION", description="Learning and academic decisions.", state_variables=["confidence", "time_available"], actions=["study", "ask_for_help", "change_strategy"], evaluation_criteria=["learning", "sustainability"]),
    "career": DomainPack(id="career", title="CAREER", description="Professional decisions and teamwork.", state_variables=["team_trust", "deadline_pressure"], actions=["ask_for_status", "take_over_work", "escalate_issue"], constraints=["limited_time", "team_dependency"], evaluation_criteria=["delivery", "trust", "transparency"]),
    "relationships": DomainPack(id="relationships", title="RELATIONSHIPS", description="Communication and trust.", state_variables=["trust", "emotional_load"], actions=["listen", "set_boundary", "repair"], evaluation_criteria=["clarity", "care", "agency"]),
    "finance": DomainPack(id="finance", title="FINANCE", description="Budgeting and financial decisions.", state_variables=["cash_buffer", "risk_tolerance"], actions=["save", "delay", "spend", "compare"], constraints=["budget_limit"], evaluation_criteria=["resilience", "tradeoffs"]),
    "ethics": DomainPack(id="ethics", title="ETHICS", description="Responsibility and moral dilemmas.", state_variables=["stakeholder_impact", "transparency"], actions=["disclose", "repair", "escalate"], evaluation_criteria=["fairness", "honesty", "responsibility"]),
    "health": DomainPack(id="health", title="HEALTH", description="Lifestyle and stress management.", state_variables=["energy", "recovery"], actions=["rest", "adjust_routine", "seek_support"], evaluation_criteria=["safety", "consistency"]),
    "crisis": DomainPack(id="crisis", title="CRISIS", description="Urgent decisions under uncertainty.", state_variables=["urgency", "available_support"], actions=["stabilize", "prioritize", "contact_support"], constraints=["incomplete_information"], evaluation_criteria=["safety", "speed", "clarity"]),
}
