# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

# ---- runtime ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/conteo-actas/browser /usr/share/nginx/html
COPY docker-entrypoint.sh /docker-entrypoint-conteo.sh
ENV API_URL=http://localhost:8080
EXPOSE 80
ENTRYPOINT ["sh", "/docker-entrypoint-conteo.sh"]
