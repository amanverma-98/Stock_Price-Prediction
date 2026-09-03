FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt runtime.txt ./
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

COPY main.py stock_dl_model.h5 ./
RUN mkdir -p charts

EXPOSE 8000

CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 1 --worker-class uvicorn.workers.UvicornWorker main:app"]
