import json
import uuid

from main import handler

event = {
    "Records": [
        {
            "body": json.dumps(
                {
                    "user_id": "550e8400-e29b-41d4-a716-446655440000",
                    "conversation_id": str(uuid.uuid4()),
                    "user_msg": "I have 3 years of Python experience and I'm looking for backend roles.",
                    "assistant_msg": "Great! I'll remember that.",
                }
            )
        }
    ]
}

handler(event, None)