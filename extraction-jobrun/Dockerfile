FROM public.ecr.aws/lambda/python:3.12

# Install uv itself
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Copy dependency files first for better layer caching
COPY pyproject.toml uv.lock ./

# Install deps into the Lambda task root using uv, from your lockfile
# --system installs into the base Python env (no venv), which is what
# Lambda's runtime expects to import from
RUN uv sync --frozen --no-dev --no-install-project

# Make sure the installed packages are on the path Lambda imports from
ENV PYTHONPATH="/var/lang/lib/python3.12/site-packages:${LAMBDA_TASK_ROOT}"

# Bake the embedding model into the image at BUILD time
RUN python -c "from sentence_transformers import SentenceTransformer; \
    SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

COPY main.py db_class.py agent.py extraction_prompt.txt

ENV HF_HUB_OFFLINE=1
ENV TRANSFORMERS_OFFLINE=1

CMD ["main.handler"]