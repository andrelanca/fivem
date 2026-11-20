# Site estático (calculadora de crafting) servido por nginx na porta 3000.
FROM nginx:alpine
COPY public/ /usr/share/nginx/html/
# Cada deploy põe ?v=<hora do build> nos ../craft.js, ../market.js, ../craft.css… das páginas: assim o browser
# e a Cloudflare nunca servem um .js velho depois de um deploy (craft.js/market.js passam o ?v= ao que carregam).
RUN V=$(date +%s) && find /usr/share/nginx/html -name '*.html' -exec \
    sed -i -E "s#(\"\.\./[a-z-]+\.(js|css))\"#\1?v=$V\"#g" {} +
RUN printf '%s\n' \
  'server {' \
  '    listen 3000;' \
  '    root /usr/share/nginx/html;' \
  '    index index.html;' \
  '    add_header Cache-Control "no-cache" always;' \
  '    location / {' \
  '        try_files $uri $uri/ =404;' \
  '    }' \
  '}' > /etc/nginx/conf.d/default.conf
EXPOSE 3000
