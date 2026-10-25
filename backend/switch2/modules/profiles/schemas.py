from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


class ProfileCreate(BaseModel):
    nickname: str = Field(min_length=1, max_length=80)
    pin: str = Field(min_length=4, max_length=6, pattern=r"^\d{4,6}$")
    timezone: str = "UTC"
    budget_cents: int | None = Field(default=None, ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)


class Profile(ProfileCreate):
    id: int
    pin: str | None = None
    pin_configured: bool = False
    created_at: datetime
    updated_at: datetime


class PinPayload(BaseModel):
    pin: str = Field(min_length=4, max_length=6, pattern=r"^\d{4,6}$")


class UnlockResponse(BaseModel):
    unlocked: bool


class AIConfigWrite(BaseModel):
    provider: str = Field(default="deepseek", min_length=1, max_length=40)
    model: str = Field(min_length=1, max_length=120)
    token: str = Field(min_length=1, max_length=500)


class AIConfigRead(BaseModel):
    provider: str
    model: str
    configured: bool


class AIQuestionsRequest(BaseModel):
    answers: dict[str, str] = Field(default_factory=dict)
    count: int = Field(default=1, ge=1, le=10)
    purpose: str = Field(default="follow_up", max_length=40)
    language: str = Field(default="English", max_length=40)


class AIQuestionsResponse(BaseModel):
    questions: list[str]
    model: str


class AIReportRequest(BaseModel):
    answers: dict[str, str] = Field(default_factory=dict)
    ai_questions: list[str] = Field(default_factory=list)
    language: str = Field(default="English", max_length=40)
    format: str = Field(default="markdown", pattern="^(markdown|human)$")


class AIReportResponse(BaseModel):
    content: str
    model: str


class SandboxAnalysisRequest(BaseModel):
    mode: str = Field(default="sandbox", min_length=1, max_length=40)
    category: str = Field(min_length=1, max_length=40)
    question: str = Field(min_length=3, max_length=5000)
    language: str = Field(default="English", max_length=40)


class SandboxDecision(BaseModel):
    id: str
    title: str
    description: str
    tradeoffs: list[str] = Field(default_factory=list)
    first_step: str
    risk: str
    fit_score: int = Field(ge=0, le=100)


class SandboxAnalysisResponse(BaseModel):
    cache_hit: bool = False
    generated_at: str
    expires_at: str
    model: str
    report_markdown: str
    decisions: list[SandboxDecision]


class PreferenceState(BaseModel):
    answers: dict[str, str] = Field(default_factory=dict)
    ai_questions: list[str] = Field(default_factory=list)
    mbti_ai_questions: list[dict[str, Any]] = Field(default_factory=list)


class PreferenceStateWrite(PreferenceState):
    pass


class AIPolishRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    answer: str = Field(min_length=1, max_length=5000)
    context: dict[str, str] = Field(default_factory=dict)


class AIPolishResponse(BaseModel):
    text: str
    model: str
