# datadog-monitor-snapshot

Azure Function que genera una captura PNG del evento de un monitor de Datadog (timeline + detalles del evento) usando Playwright con una sesión autenticada.

## Requisitos

- Node.js y dependencias instaladas: `npm install`
- Azure Functions Core Tools v4 (comando `func`) para ejecutar localmente.
- Navegador de Playwright (ver [Instalación de navegadores](#instalación-de-navegadores)).
- Dependencias del sistema para Chromium: `npx playwright install-deps chromium` o `npx playwright install --with-deps chromium`.
- Estado de autenticación en `playwright/.auth/datadog.json` (ver `npm run auth`).

## Instalación de navegadores

La captura se ejecuta en modo headless, así que para la función basta con el shell headless de Chromium, más liviano que el navegador completo:

```bash
# Elimina los navegadores descargados por Playwright (todas las instalaciones)
npx playwright uninstall --all

# Instala solo chromium-headless-shell
npx playwright install --only-shell chromium
```

`npm run auth` abre un navegador visible (`headless: false`) y **no funciona solo con el shell**. En la máquina donde se genera la sesión instalar el Chromium completo:

```bash
npx playwright install chromium
```

## Scripts

| Comando         | Descripción                                                                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run auth`  | Abre un navegador visible en Datadog para completar el SSO manualmente. Al presionar Enter en la terminal guarda la sesión en `playwright/.auth/datadog.json`. |
| `npm run build` | Compila TypeScript a `dist/`.                                                                                                                                  |
| `npm start`     | Compila (`prestart`) e inicia el host local de Azure Functions con `func start`.                                                                               |

## Endpoint

### `POST /api/capture`

Recibe la URL de una alerta de Datadog (absoluta o relativa a `DATADOG_URL`) y devuelve la captura como imagen. La URL debe pertenecer al mismo origen que `DATADOG_URL` y apuntar a `/monitors/<id>`.

```bash
curl -X POST http://localhost:7071/api/capture \
  -H "Content-Type: application/json" \
  -d '{"alertUrl": "/monitors/<id>?event_id=<event_id>&..."}' \
  -o capture.png
```

La función usa `authLevel: "function"`. En local no se exige clave; en Azure hay que enviar la clave de la función en el header `x-functions-key` o en el query string `?code=<clave>`.

| Estado | Respuesta                                                                                   |
| ------ | ------------------------------------------------------------------------------------------- |
| `200`  | `image/png` con la captura.                                                                 |
| `400`  | `{"error": "INVALID_JSON"}` si el cuerpo no es JSON válido.                                 |
| `400`  | `{"error": "INVALID_REQUEST"}` si falta `alertUrl` o está vacío.                            |
| `400`  | `{"error": "INVALID_ALERT_URL"}` si la URL no es de `DATADOG_URL` o no es `/monitors/<id>`. |
| `500`  | `{"error": "CAPTURE_FAILED"}` si la captura falla (el detalle se registra en los logs).     |

## Variables de entorno

En local se definen en `Values` de `local.settings.json`; en Azure, como App Settings.

| Variable      | Por defecto                 | Uso                                                      |
| ------------- | --------------------------- | -------------------------------------------------------- |
| `DATADOG_URL` | `https://app.datadoghq.com` | Instancia de Datadog; base para resolver y validar URLs. |
