FROM nginx:alpine

RUN apk add --no-cache openssl

RUN rm /etc/nginx/conf.d/default.conf

COPY ./templates/nginx.conf.template /etc/nginx/templates/default.conf.template

COPY ./docker-entrypoint.d/20-gen-ssl.sh /docker-entrypoint.d/
RUN chmod +x /docker-entrypoint.d/20-gen-ssl.sh



EXPOSE 80 443