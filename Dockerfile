# Site estático (calculadora de crafting) servido por nginx na porta 3000.
FROM nginx:alpine
COPY public/ /usr/share/nginx/html/
RUN printf '%s\n' \
  'server {' \
  '    listen 3000;' \
  '    root /usr/share/nginx/html;' \
  '    index index.html;' \
  '    location / {' \
  '        try_files $uri $uri/ =404;' \
  '    }' \
  '}' > /etc/nginx/conf.d/default.conf
EXPOSE 3000
