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

# Copy application code
COPY main.py .
COPY db_class.py .
COPY agent.py .
COPY extraction_prompt.txt .

# Download CockroachDB certificate
RUN mkdir -p /var/task/certs && \
    curl -L \
      https://cockroachlabs.cloud/clusters/5969aec4-f6b8-4bd6-9180-dcad541c29ab/cert \
      -o /var/task/certs/root.crt && \
    test -f /var/task/certs/root.crt

CMD ["main.handler"]