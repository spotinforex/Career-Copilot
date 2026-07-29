
def hydrate_context(db, session, session_manager):
    if session.cached_context:
        return
    goal = db.fetch_one("career_goals", where={"user_id": session.user_id, "is_active": True})
    pinned = db.get_pinned_memories(session.user_id)
    bio = db.get_bio_data(session.user_id)  
    session.cached_context = {"goal": goal, "pinned": pinned, "bio": bio}
    session_manager.save(session)