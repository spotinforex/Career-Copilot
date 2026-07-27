FROM public.ecr.aws/lambda/python:3.12

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

COPY pyproject.toml uv.lock ./

# Use uv only to export the lockfile to plain requirements.txt —
# don't use uv to install, since uv sync insists on a .venv that
# Lambda's runtime (plain system python) never sees.
RUN uv export --frozen --no-dev --no-hashes -o requirements.txt

# Install with plain pip straight into system Python.
# --extra-index-url lets pip fall back here for torch's CPU build,
# which isn't on default PyPI under this exact version pin.
RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt

RUN python -c "from sentence_transformers import SentenceTransformer; \
    SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

COPY main.py db_class.py agent.py extraction_prompt.txt ./

ENV HF_HUB_OFFLINE=1
ENV TRANSFORMERS_OFFLINE=1

CMD ["main.handler"]