from fastapi import APIRouter
from .schemas import AIPolishRequest, AIPolishResponse, AIConfigRead, AIConfigWrite, AIQuestionsRequest, AIQuestionsResponse, AIReportRequest, AIReportResponse, InteractionChatResponse, InteractionInvite, InteractionInviteCreate, InteractionInviteDecision, InteractionInviteResponse, InteractionMessage, InteractionMessageCreate, InteractionSession, InteractionSessionCreate, PinPayload, PreferenceState, PreferenceStateWrite, Profile, ProfileCreate, SandboxAnalysisRequest, SandboxAnalysisResponse, UnlockResponse
from .service import create_interaction_invite, create_interaction_session, create_profile, delete_profile, generate_ai_questions, generate_ai_report, generate_interaction_chat, generate_sandbox_analysis, get_ai_config, get_preferences, list_interaction_invites, list_interaction_messages, list_interaction_sessions, list_profiles, list_sent_interaction_invites, polish_answer, respond_interaction_invite, save_ai_config, save_preferences, set_profile_pin, unlock_profile

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


@router.get("", response_model=list[Profile])
def get_profiles() -> list[Profile]:
    return list_profiles()


@router.post("", response_model=Profile, status_code=201)
def post_profile(payload: ProfileCreate) -> Profile:
    return create_profile(payload)


@router.post("/{profile_id}/unlock", response_model=UnlockResponse)
def post_unlock(profile_id: int, payload: PinPayload) -> UnlockResponse:
    return UnlockResponse(unlocked=unlock_profile(profile_id, payload))


@router.put("/{profile_id}/pin", response_model=Profile)
def put_pin(profile_id: int, payload: PinPayload) -> Profile:
    return set_profile_pin(profile_id, payload)


@router.delete("/{profile_id}", status_code=204)
def remove_profile(profile_id: int) -> None:
    delete_profile(profile_id)


@router.get("/{profile_id}/ai-config", response_model=AIConfigRead)
def get_profile_ai_config(profile_id: int) -> AIConfigRead:
    return get_ai_config(profile_id)


@router.put("/{profile_id}/ai-config", response_model=AIConfigRead)
def put_profile_ai_config(profile_id: int, payload: AIConfigWrite) -> AIConfigRead:
    return save_ai_config(profile_id, payload)


@router.post("/{profile_id}/ai-questions", response_model=AIQuestionsResponse)
def post_profile_ai_questions(profile_id: int, payload: AIQuestionsRequest) -> AIQuestionsResponse:
    return generate_ai_questions(profile_id, payload)


@router.post("/{profile_id}/ai-report", response_model=AIReportResponse)
def post_profile_ai_report(profile_id: int, payload: AIReportRequest) -> AIReportResponse:
    return generate_ai_report(profile_id, payload)


@router.post("/{profile_id}/sandbox-analysis", response_model=SandboxAnalysisResponse)
def post_sandbox_analysis(profile_id: int, payload: SandboxAnalysisRequest) -> SandboxAnalysisResponse:
    return generate_sandbox_analysis(profile_id, payload)


@router.post("/{profile_id}/interaction-invites", response_model=InteractionInvite, status_code=201)
def post_interaction_invite(profile_id: int, payload: InteractionInviteCreate) -> InteractionInvite:
    return create_interaction_invite(profile_id, payload)


@router.get("/{profile_id}/interaction-invites", response_model=list[InteractionInvite])
def get_interaction_invites(profile_id: int) -> list[InteractionInvite]:
    return list_interaction_invites(profile_id)


@router.get("/{profile_id}/interaction-invites/sent", response_model=list[InteractionInvite])
def get_sent_interaction_invites(profile_id: int) -> list[InteractionInvite]:
    return list_sent_interaction_invites(profile_id)


@router.post("/{profile_id}/interaction-invites/{invite_id}/respond", response_model=InteractionInviteResponse)
def post_interaction_invite_response(profile_id: int, invite_id: int, payload: InteractionInviteDecision) -> InteractionInviteResponse:
    return respond_interaction_invite(profile_id, invite_id, payload.accepted)


@router.post("/{profile_id}/interaction-sessions", response_model=InteractionSession)
def post_interaction_session(profile_id: int, payload: InteractionSessionCreate) -> InteractionSession:
    return create_interaction_session(profile_id, payload)


@router.get("/{profile_id}/interaction-sessions", response_model=list[InteractionSession])
def get_interaction_sessions(profile_id: int) -> list[InteractionSession]:
    return list_interaction_sessions(profile_id)


@router.get("/{profile_id}/interaction-sessions/{session_id}/messages", response_model=list[InteractionMessage])
def get_interaction_messages(profile_id: int, session_id: str) -> list[InteractionMessage]:
    return list_interaction_messages(profile_id, session_id)


@router.post("/{profile_id}/interaction-sessions/{session_id}/messages", response_model=InteractionChatResponse)
def post_interaction_message(profile_id: int, session_id: str, payload: InteractionMessageCreate) -> InteractionChatResponse:
    return generate_interaction_chat(profile_id, session_id, payload)


@router.post("/{profile_id}/ai-polish", response_model=AIPolishResponse)
def post_profile_ai_polish(profile_id: int, payload: AIPolishRequest) -> AIPolishResponse:
    return polish_answer(profile_id, payload)


@router.get("/{profile_id}/preferences", response_model=PreferenceState)
def get_profile_preferences(profile_id: int) -> PreferenceState:
    return PreferenceState(**get_preferences(profile_id))


@router.put("/{profile_id}/preferences", response_model=PreferenceState)
def put_profile_preferences(profile_id: int, payload: PreferenceStateWrite) -> PreferenceState:
    return PreferenceState(**save_preferences(profile_id, payload.answers, payload.ai_questions, payload.mbti_ai_questions))
