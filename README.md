# datadog-monitor-snapshot

Azure Function que genera una imagen PNG del evento de un monitor de Datadog (timeline + detalles del evento) a partir de datos obtenidos de la API de eventos de Datadog, reproduciendo la vista de Datadog con [sharp](https://sharp.pixelplumbing.com/).

## Requisitos

- Node.js y dependencias instaladas: `npm install`
- Azure Functions Core Tools v4 (comando `func`) para ejecutar localmente.

Las fuentes (Noto Sans y Noto Color Emoji, licencia OFL) están en `assets/fonts` y se cargan en tiempo de ejecución, así que no se necesitan fuentes instaladas en el sistema. Esa carpeta debe incluirse en el despliegue.

## Scripts

| Comando          | Descripción                                                                         |
| ---------------- | ----------------------------------------------------------------------------------- |
| `npm run build`  | Compila TypeScript a `dist/`.                                                       |
| `npm start`      | Compila (`prestart`) e inicia el host local de Azure Functions con `func start`.    |
| `npm run render` | Genera `output/monitor-event.png` con un evento de ejemplo, sin levantar la función. |

## Endpoint

### `POST /api/capture`

Recibe los datos del evento y devuelve la imagen. El `message` es el texto del evento tal como lo entrega la API de Datadog (markdown, con o sin los delimitadores `%%%`).

| Campo       | Tipo               | Descripción                                                        |
| ----------- | ------------------ | ------------------------------------------------------------------ |
| `timestamp` | `string \| number` | Fecha ISO o epoch en milisegundos.                                 |
| `status`    | `string`           | Estado del monitor. Se recomienda `monitor-alert-event.dest_state` (`Alert`, `Warn`, `OK`, `No Data`); también acepta la severidad de `status`/`alert_type` (`error`, `warning`, `success`). Otros valores se muestran como `UNKNOWN`. |
| `group`     | `string \| null`   | Opcional. Grupo del monitor, por ejemplo `pod_name:...`.           |
| `title`     | `string`           | Título del evento.                                                 |
| `message`   | `string`           | Mensaje del evento en markdown.                                    |

```bash
curl -X POST http://localhost:7071/api/capture \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2026-10-06T21:21:17Z",
    "status": "Alert",
    "group": "pod_name:wk-talma-pnr-dih-6cf78ccbc5-f4mj6",
    "title": "[P2] [Triggered] ...",
    "message": "%%%\n## Se detectó ...\n%%%"
  }' \
  -o capture.png
```

La función usa `authLevel: "function"`. En local no se exige clave; en Azure hay que enviar la clave de la función en el header `x-functions-key` o en el query string `?code=<clave>`.

| Estado | Respuesta                                                                          |
| ------ | ---------------------------------------------------------------------------------- |
| `200`  | `image/png` con la imagen.                                                         |
| `400`  | `{"error": "INVALID_JSON"}` si el cuerpo no es JSON válido.                        |
| `400`  | `{"error": "INVALID_REQUEST"}` si falta un campo o tiene un tipo inválido.         |
| `500`  | `{"error": "RENDER_FAILED"}` si la imagen falla (el detalle se registra en los logs). |

## Variables de entorno

En local se definen en `Values` de `local.settings.json`; en Azure, como App Settings.

| Variable            | Por defecto      | Uso                                           |
| ------------------- | ---------------- | --------------------------------------------- |
| `DISPLAY_TIME_ZONE` | `America/Bogota` | Zona horaria con la que se muestra la fecha.  |
| `FONTS_DIR`         | `assets/fonts`   | Carpeta de las fuentes (relativa al directorio de trabajo). |
