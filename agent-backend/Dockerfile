FROM public.ecr.aws/lambda/python:3.12

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR ${LAMBDA_TASK_ROOT}

COPY pyproject.toml uv.lock ./

RUN uv sync --frozen

COPY . .

# Ensure the cert is copied to /var/task/certs/root.crt
COPY cert/root.crt /var/task/cert/root.crt

CMD ["main.handler"]