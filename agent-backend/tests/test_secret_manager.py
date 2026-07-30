import importlib

import pytest


class FakeSecretsManagerClient:
    def get_secret_value(self, **kwargs):
        raise RuntimeError("simulated aws failure")


class FakeSession:
    def client(self, **kwargs):
        return FakeSecretsManagerClient()


def test_secret_manager_falls_back_to_environment(monkeypatch):
    import utils.secret_manager as secret_manager

    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "env-gemini-key")
    monkeypatch.setattr(secret_manager.boto3.session, "Session", lambda: FakeSession())

    reloaded = importlib.reload(secret_manager)

    assert reloaded.secrets["GEMINI_API_KEY"] == "env-gemini-key"
