FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Kopier src-mappen til /app/src
COPY . .

EXPOSE 3000

# --- secrets & wrapper entrypoint -----------------
COPY ./docker-entrypoint.d/00-secrets.sh /docker-entrypoint.d/
COPY ./docker-entrypoint.d/wrapper.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.d/00-secrets.sh
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "start"]
