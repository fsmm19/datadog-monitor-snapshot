import { mkdir, writeFile } from "node:fs/promises";

import { renderMonitorEvent } from "../render/render-monitor-event.js";

const image = await renderMonitorEvent({
  timestamp: "2026-10-06T21:21:17Z",
  status: "Alert",
  group: "pod_name:wk-talma-pnr-dih-6cf78ccbc5-f4mj6",

  title:
    '[P2] [Triggered] Entrega del Servicio | Estado de Integración"wk-talma-pnr-dih" Se han dejado de registrar Logs (remediación automatica - reinicio pods)',

  message: `
%%%
## 🚨 Se detectó que la integración **wk-talma-pnr-dih** ha dejado de registrar logs en los ultimos 10 minutos

- **Ambiente:** aro-prd
- **Namespace:**
- **Servicio:**

**Remediación automatica y Escalamiento:**

Se ejecutará el workflow para recuperar el servicio mediante el reinicio del pod afectado.

@workflow-Re-start-POD-Integracion-Talma-DIH( name_pod="wk-talma-pnr-dih-6cf78ccbc5-f4mj6" )

**Notificaciones:**

Notificar al chat de Teams con el dominio: MONITOREO - ENTREGA DEL SERVICIO

@willmer.aguilera@avianca.com
@erick.gamboa@avianca.com
%%%
`,
});

await mkdir("output", { recursive: true });
await writeFile("output/monitor-event.png", image);

console.log("Generated output/monitor-event.png");