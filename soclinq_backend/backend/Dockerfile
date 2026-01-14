FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    netcat-openbsd \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

    RUN apt-get update && apt-get install -y \
    gcc \
    netcat-openbsd \
    postgresql-client \
    binutils \
    libproj-dev \
    gdal-bin \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

CMD ["gunicorn", "soclinq_backend.wsgi:application", "--bind", "0.0.0.0:8000"]
