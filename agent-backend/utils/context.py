
def hydrate_context(db: "CareerCopilotDB", session: Session, session_manager: SessionManager):
    if session.cached_context:  # already hydrated, either now or in a previous request
        return
    goal = db.fetch_one("career_goals", where={"user_id": session.user_id, "is_active": True})
    pinned = db.get_pinned_memories(session.user_id)
    session.cached_context = {"goal": goal, "pinned": pinned}
    session_manager.save(session)  