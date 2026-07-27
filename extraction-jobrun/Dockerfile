FROM public.ecr.aws/lambda/python:3.12

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /var/task

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Export requirements
RUN uv export --frozen --no-dev --no-hashes -o requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt

# Download CockroachDB certificate
RUN mkdir -p /var/task/certs && \
    curl -L \
      https://cockroachlabs.cloud/clusters/5969aec4-f6b8-4bd6-9180-dcad541c29ab/cert \
      -o /var/task/certs/root.crt && \
    test -f /var/task/certs/root.crt

# Download and save embedding model into the image
RUN mkdir -p /var/task/models && \
    python - <<'PY'
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
model.save("/var/task/models/all-MiniLM-L6-v2")
print("Model saved successfully.")
PY

# Verify model files exist
RUN find /var/task/models -type f

# Copy application code
COPY main.py .
COPY db_class.py .
COPY agent.py .
COPY extraction_prompt.txt .

# Offline mode
ENV HF_HOME=/var/task/.cache/huggingface
ENV TRANSFORMERS_CACHE=/var/task/.cache/huggingface
ENV HF_HUB_CACHE=/var/task/.cache/huggingface
ENV HF_HUB_OFFLINE=1
ENV TRANSFORMERS_OFFLINE=1

CMD ["main.handler"]