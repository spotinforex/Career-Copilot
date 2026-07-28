from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_chat_endpoint_returns_response():
    response = client.post(
        "/chat",
        json={"user_id": "test-user", "message": "Hello"},
    )
    assert response.status_code == 200
    assert "response" in response.json()
