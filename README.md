# datadog-monitor-snapshot

Genera una captura PNG del evento de un monitor de Datadog (timeline + detalles del evento) usando Playwright con una sesión autenticada.

## Requisitos

- Node.js y dependencias instaladas: `npm install`
- Navegador de Playwright: `npx playwright install chromium`
- Dependencias del sistema para Chromium: `npx playwright install-deps chromium` o `npx playwright install --with-deps chromium`.
- Estado de autenticación en `playwright/.auth/datadog.json` (ver `npm run auth`)

## Scripts

| Comando                            | Descripción                                                                                                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run auth`                     | Abre un navegador visible en Datadog para completar el SSO manualmente. Al presionar Enter en la terminal guarda la sesión en `playwright/.auth/datadog.json`. |
| `npm run capture`                  | Ejecuta una captura local con la URL de alerta definida en `src/scripts/capture-local.ts`.                                                                     |
| `npm run dev`                      | Inicia el servidor HTTP en modo watch (recarga al cambiar el código).                                                                                          |
| `npm start`                        | Inicia el servidor HTTP.                                                                                                                                       |
| `npx tsx src/scripts/test-auth.ts` | Abre Datadog con la sesión guardada durante 30 s para comprobar que sigue siendo válida.                                                                       |

## Endpoint

### `POST /capture`

Recibe la URL de una alerta de Datadog (absoluta o relativa a `DATADOG_URL`) y devuelve la captura como imagen. La URL debe pertenecer al mismo origen que `DATADOG_URL` y apuntar a `/monitors/<id>`.

```bash
curl -X POST http://localhost:3000/capture \
  -H "Content-Type: application/json" \
  -d '{"alertUrl": "/monitors/<id>?event_id=<event_id>&..."}' \
  -o capture.png
```

| Estado | Respuesta                                                                                   |
| ------ | ------------------------------------------------------------------------------------------- |
| `200`  | `image/png` con la captura.                                                                 |
| `400`  | `{"error": "INVALID_JSON"}` si el cuerpo no es JSON válido.                                 |
| `400`  | `{"error": "INVALID_REQUEST"}` si falta `alertUrl` o está vacío.                            |
| `400`  | `{"error": "INVALID_ALERT_URL"}` si la URL no es de `DATADOG_URL` o no es `/monitors/<id>`. |
| `404`  | `{"error": "NOT_FOUND"}` para cualquier otra ruta o método.                                 |
| `500`  | `{"error": "CAPTURE_FAILED"}` si la captura falla (el detalle se registra en consola).      |

## Variables de entorno

| Variable      | Por defecto                 | Uso                                |
| ------------- | --------------------------- | ---------------------------------- |
| `PORT`        | `3000`                      | Puerto del servidor.               |
| `DATADOG_URL` | `https://app.datadoghq.com` | Base para resolver URLs relativas. |
