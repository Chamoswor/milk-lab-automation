# For more information, please refer to https://aka.ms/vscode-docker-python
FROM python:3-slim

# Keeps Python from generating .pyc files in the container
ENV PYTHONDONTWRITEBYTECODE=1

# Turns off buffering for easier container logging
ENV PYTHONUNBUFFERED=1

# Install pip requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


WORKDIR /app
COPY . /app

# --- secrets & wrapper entrypoint -----------------
COPY ./docker-entrypoint.d/00-secrets.sh /docker-entrypoint.d/
COPY ./docker-entrypoint.d/wrapper.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.d/00-secrets.sh
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["python", "main.py"]
