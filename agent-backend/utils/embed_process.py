from sentence_transformers import SentenceTransformer

_model = None

def get_model():
    global _model

    if _model is None:
        _model = SentenceTransformer(
            "sentence-transformers/all-MiniLM-L6-v2"
        )

    return _model

def encode_text(text: str) -> list[float]:
    """
    Encode the given text into a vector embedding using the SentenceTransformer model.
    """
    return get_model().encode(text).tolist()