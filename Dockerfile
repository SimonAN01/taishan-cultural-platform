FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    DATA_DIR=/app/taishan/runtime IMMERSIVE_FRONTEND_DIR=/app/dist
WORKDIR /app
RUN sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources \
    && apt-get -o Acquire::https::Timeout=30 -o Acquire::Retries=1 update \
    && apt-get -o Acquire::https::Timeout=30 -o Acquire::Retries=1 install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*
COPY taishan/requirements.lock.txt /app/taishan/requirements.lock.txt
RUN pip install --no-cache-dir -r taishan/requirements.lock.txt && pip check
COPY --from=frontend /build/dist ./dist
COPY taishan/backend ./taishan/backend
COPY taishan/data ./taishan/data
COPY taishan/frontend ./taishan/frontend
RUN useradd --system --uid 10001 --home-dir /app taishan \
    && mkdir -p /app/taishan/runtime && chown taishan:taishan /app/taishan/runtime
USER taishan
WORKDIR /app/taishan
EXPOSE 18605
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=6 \
    CMD python -c "import json,urllib.request; h=json.load(urllib.request.urlopen('http://127.0.0.1:18605/api/health',timeout=3)); assert h['status']=='ok' and h['immersive_available']"
CMD ["python", "-m", "uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "18605"]
