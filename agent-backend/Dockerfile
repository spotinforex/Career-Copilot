FROM public.ecr.aws/lambda/python:3.12

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR ${LAMBDA_TASK_ROOT}

COPY pyproject.toml uv.lock ./

RUN uv export --frozen --no-dev --no-hashes -o requirements.txt

RUN pip install \
    --no-cache-dir \
    --target ${LAMBDA_TASK_ROOT} \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt

COPY . .

# Ensure the cert is copied to /var/task/certs/root.crt
COPY cert/root.crt /var/task/cert/root.crt
ENV HF_HOME=/tmp/huggingface
ENV HF_HUB_CACHE=/tmp/huggingface/hub
ENV TRANSFORMERS_CACHE=/tmp/huggingface/transformers
ENV SENTENCE_TRANSFORMERS_HOME=/tmp/sentence_transformers

CMD ["main.handler"]