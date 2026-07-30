FROM public.ecr.aws/lambda/python:3.12

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR ${LAMBDA_TASK_ROOT}

COPY pyproject.toml uv.lock ./

RUN uv sync --frozen

COPY . .

RUN mkdir -p certs && \
    dnf install -y curl && \
    curl -L https://cockroachlabs.cloud/clusters/5969aec4-f6b8-4bd6-9180-dcad541c29ab/cert \
    -o certs/root.crt

CMD ["main.handler"]