# Conteo de Actas — Frontend (Angular)

Tablero público de resultados y panel de digitación para la elección de Alcalde de Pueblo Nuevo (4 de octubre de 2026).
Angular 19 · paleta rojo #C8102E / blanco. Es un proyecto independiente: consume la API del repositorio `conteo-actas-backend`.

## Desarrollo

Con el backend corriendo en `localhost:8080`:

```bash
npm install
npm start          # http://localhost:4200
```

`proxy.conf.json` redirige `/api` y `/ws` a `localhost:8080`, así que en desarrollo no hace falta configurar nada.

Para apuntar a otro backend sin proxy, edita `public/config.js`:

```js
window.__CONFIG__ = { apiUrl: 'https://api.conteo.tudominio.pe' };
```

## URL del backend en producción

La URL se lee **en tiempo de ejecución** desde `config.js`, no se compila dentro del bundle. El mismo build sirve para ensayo y para producción.

- **Docker:** pasa la variable `API_URL`; el contenedor genera `config.js` al arrancar.
  ```bash
  cp .env.example .env          # API_URL=https://api.conteo.tudominio.pe
  docker compose up -d --build  # http://localhost:8081
  ```
- **Hosting estático** (Netlify, Vercel, S3, cPanel): `npm run build`, sube `dist/conteo-actas/browser/` y edita ahí `config.js`.

El dominio del frontend debe estar en `CORS_ORIGINS` del backend.

## Estructura

```
src/app/
├── core/            servicios: API (data), auth + interceptor JWT, tiempo real (STOMP), exportación Excel/PDF
├── pages/public/    tablero público (sin login)
├── pages/login/
├── pages/admin/     panel: digitar acta, listado, locales, auditoría, usuarios, reportes
└── shared/          iconos, avisos
public/
├── config.js        URL del backend
├── logos/           logos de partidos
└── candidatos/      fotos de candidatos
```

## Tiempo real

El tablero se suscribe por WebSocket a `/topic/consolidado`. Si la conexión se cae, consulta `GET /api/public/consolidado` cada 4 s y muestra "Reconectando" hasta que vuelva.
