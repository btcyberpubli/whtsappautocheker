# 📡 Documentación - API de Alertas de WhatsApp

## Resumen
Sistema automático que detecta cuando un mensaje de WhatsApp tiene **single check (✓)** - lo que significa que NO fue entregado - y envía una alerta al servidor para registro y monitoreo.

---

## 🎯 ¿Qué es un Single Check?

En WhatsApp Web los mensajes muestran diferentes estados:

| Ícono | Estado | Significado |
|-------|--------|------------|
| ✓ | Single Check | Mensaje enviado pero NO entregado |
| ✓✓ | Doble Check (gris) | Mensaje entregado pero NO leído |
| ✓✓ (azul) | Doble Check Azul | Mensaje LEÍDO |

**Este sistema detecta el Single Check (✓) y reporta automáticamente.**

---

## 📤 Endpoint POST - Crear Alerta

### URL
```
POST https://accountant-services.co.uk/api/whatsapp-alert
```

### Headers requeridos
```
Content-Type: application/json
```

### Body (JSON)
```json
{
  "type": "whatsapp-downline",
  "contactName": "Nombre del Cliente",
  "chatId": "5491234567890@c.us",
  "lastMessage": "Hola, ¿cómo estás?",
  "detectedAt": "2026-05-06T15:30:00Z",
  "severity": "high",
  "source": "whatsapp-extension"
}
```

### Descripción de campos

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|------------|------------|
| `type` | string | Sí | Siempre: `"whatsapp-downline"` |
| `contactName` | string | Sí | Nombre del contacto o chat |
| `chatId` | string | Sí | ID único del chat (formato: `5491234567890@c.us`) |
| `lastMessage` | string | Sí | Mensaje que no fue entregado |
| `detectedAt` | ISO 8601 | Sí | Fecha/hora de detección (formato: `"2026-05-06T15:30:00Z"`) |
| `severity` | string | Sí | Nivel: `"high"` o `"low"` |
| `source` | string | Sí | Siempre: `"whatsapp-extension"` |

### Respuesta exitosa (200 OK)
```json
{
  "success": true,
  "alertId": "alert-1715000400000-abc123",
  "isDuplicate": false,
  "message": "Alerta recibida y registrada"
}
```

### Respuesta con error
```json
{
  "success": false,
  "error": "Falta un campo obligatorio o formato incorrecto",
  "code": 400
}
```

---

## 📥 Endpoint GET - Obtener Alertas

### URL
```
GET https://accountant-services.co.uk/api/whatsapp-alerts
```

### Parámetros opcionales (Query String)

```
?status=active     // Solo alertas activas
?status=resolved   // Solo alertas resueltas
?limit=50          // Límite de resultados (default: 50)
?offset=0          // Offset para paginación
```

### Ejemplo de uso
```
GET https://accountant-services.co.uk/api/whatsapp-alerts?status=active&limit=10
```

### Respuesta
```json
{
  "success": true,
  "count": 2,
  "activeCount": 1,
  "alerts": [
    {
      "id": "alert-1715000400000-001",
      "type": "whatsapp-downline",
      "contactName": "Cliente A",
      "chatId": "5491234567890@c.us",
      "lastMessage": "Hola, ¿cómo estás?",
      "status": "active",
      "severity": "high",
      "createdAt": "2026-05-06T15:30:00.123Z",
      "source": "whatsapp-extension"
    },
    {
      "id": "alert-1715000400000-002",
      "type": "whatsapp-downline",
      "contactName": "Cliente B",
      "chatId": "5491234568901@c.us",
      "lastMessage": "¿Qué tal?",
      "status": "active",
      "severity": "low",
      "createdAt": "2026-05-06T15:35:00.456Z",
      "source": "whatsapp-extension"
    }
  ]
}
```

---

## ✏️ Endpoint PUT - Resolver Alerta

### URL
```
PUT https://accountant-services.co.uk/api/whatsapp-alert/{alertId}
```

### Headers requeridos
```
Content-Type: application/json
```

### Body
```json
{
  "status": "resolved"
}
```

### Respuesta
```json
{
  "success": true,
  "message": "Alerta actualizada correctamente",
  "alertId": "alert-1715000400000-001",
  "newStatus": "resolved"
}
```

---

## 🔄 Flujo de integración en la extensión

```javascript
// 1. Se detecta single check
const hasSingleCheck = checkSingleCheck(); // busca [data-icon="status-check"]

// 2. Se preparan los datos
const alertData = {
  type: "whatsapp-downline",
  contactName: "Cliente X",
  chatId: "5491234567890@c.us",
  lastMessage: "Prueba",
  detectedAt: new Date().toISOString(),
  severity: "high",
  source: "whatsapp-extension"
};

// 3. Se envía POST a la API
const response = await fetch(
  'https://accountant-services.co.uk/api/whatsapp-alert',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alertData)
  }
);

// 4. Se guarda el alertId en storage local
const data = await response.json();
alertData.alertId = data.alertId;
chrome.storage.local.set({ sentAlerts: [...alerts, alertData] });

// 5. Se actualiza el UI del popup
updateUI(); // Muestra la alerta en rojo
```

---

## 💾 Almacenamiento local

Las alertas se guardan en `chrome.storage.local`:

```javascript
// Estructura almacenada
{
  sentAlerts: [
    {
      type: "whatsapp-downline",
      contactName: "Cliente A",
      chatId: "5491234567890@c.us",
      lastMessage: "Hola",
      detectedAt: "2026-05-06T15:30:00Z",
      severity: "high",
      source: "whatsapp-extension",
      alertId: "alert-1715000400000-abc123",
      isDuplicate: false,
      recordedAt: "2026-05-06T15:30:05.123Z"
    }
  ]
}
```

---

## 🔍 Detección técnica del Single Check

### Selector CSS
```javascript
// Single Check (✓) - Enviado pero NO entregado
const singleCheckIcon = document.querySelector('[data-icon="status-check"]');

// Doble Check (✓✓) - Entregado
const dblCheckIcon = document.querySelector('[data-icon="status-dblcheck"]');
```

### Ubicación en el DOM
El ícono aparece en el mensaje más reciente dentro de `data-testid="conversation-container"`:

```html
<!-- Estructura aproximada de WhatsApp Web -->
<div data-testid="conversation-container">
  <!-- Otros mensajes -->
  <div class="last-message-row">
    <span>Texto del mensaje</span>
    <svg data-icon="status-check"></svg>  <!-- Single check -->
  </div>
</div>
```

---

## ⚠️ Errores y códigos de respuesta

| Código | Error | Solución |
|--------|-------|----------|
| 200 | OK | Alerta enviada exitosamente |
| 400 | Bad Request | Falta un campo obligatorio o formato incorrecto |
| 401 | Unauthorized | Falta autenticación o credenciales inválidas |
| 404 | Not Found | URL incorrecta o alerta no encontrada |
| 409 | Conflict | Alerta duplicada (mismo chat en menos de 5 minutos) |
| 500 | Server Error | Problema en el servidor (contactar admin) |
| 503 | Service Unavailable | Servidor en mantenimiento |

---

## 📊 Casos de uso

### 1. Monitoreo de líneas WhatsApp Business
Detectar automáticamente cuándo una línea está caída o sin servicio:
```javascript
// La extensión ejecuta cada 10 minutos
while (running) {
  scanAllChats();
  detectSingleChecks();
  reportFailures();
  sleep(10 * 60 * 1000);
}
```

### 2. Análisis de patrones
Con las alertas guardadas puedes identificar:
- Horarios de caídas más frecuentes
- Números problemáticos recurrentes
- Patrones de disponibilidad por zona

### 3. Escalonamiento automático
Cuando se envía una alerta:
```
Alert Received
↓
Check if duplicate or recurring
↓
If critical: Send SMS/Email to ops
↓
Log for reporting
```

---

## 🔐 Seguridad

### HTTPS
Todas las comunicaciones con la API usan **HTTPS** (conexión cifrada):
- ✅ Datos en tránsito protegidos
- ✅ Validación de certificado SSL
- ✅ Previene man-in-the-middle

### Validación en cliente
La extensión valida antes de enviar:
```javascript
// Validación de datos
if (!alertData.type || alertData.type !== "whatsapp-downline") return false;
if (!alertData.chatId || !alertData.chatId.includes("@c.us")) return false;
if (!isValidISO8601(alertData.detectedAt)) return false;
```

### Sin almacenamiento de tokens
La extensión **no almacena tokens de autenticación**:
- Sin credenciales guardadas localmente
- Sin riesgo de exposición de API keys
- Comunicación directa sin intermediarios

---

## 📝 Ejemplos por lenguaje

### JavaScript/Fetch
```javascript
const alertData = {
  type: "whatsapp-downline",
  contactName: "Cliente A",
  chatId: "5491234567890@c.us",
  lastMessage: "Hola, ¿cómo estás?",
  detectedAt: new Date().toISOString(),
  severity: "high",
  source: "whatsapp-extension"
};

fetch('https://accountant-services.co.uk/api/whatsapp-alert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(alertData)
})
.then(res => res.json())
.then(data => console.log('Alert ID:', data.alertId));
```

### Python
```python
import requests
from datetime import datetime

alert_data = {
  "type": "whatsapp-downline",
  "contactName": "Cliente A",
  "chatId": "5491234567890@c.us",
  "lastMessage": "Hola, ¿cómo estás?",
  "detectedAt": datetime.now().isoformat() + "Z",
  "severity": "high",
  "source": "whatsapp-extension"
}

response = requests.post(
  'https://accountant-services.co.uk/api/whatsapp-alert',
  json=alert_data,
  headers={'Content-Type': 'application/json'}
)

print(response.json())
```

### cURL
```bash
curl -X POST https://accountant-services.co.uk/api/whatsapp-alert \
  -H "Content-Type: application/json" \
  -d '{
    "type": "whatsapp-downline",
    "contactName": "Cliente A",
    "chatId": "5491234567890@c.us",
    "lastMessage": "Hola, ¿cómo estás?",
    "detectedAt": "2026-05-06T15:30:00Z",
    "severity": "high",
    "source": "whatsapp-extension"
  }'
```

---

## 🧪 Testing

### Test local sin servidor
```javascript
// Simular respuesta del servidor
const mockResponse = {
  success: true,
  alertId: "test-alert-123",
  isDuplicate: false,
  message: "Alerta recibida y registrada"
};

// Verificar que los datos se construyen correctamente
console.assert(alertData.type === "whatsapp-downline");
console.assert(alertData.chatId.includes("@c.us"));
console.assert(isValidISODate(alertData.detectedAt));
```

### Verificar detectores
```javascript
// Verificar que el selector funciona
const testCheck = document.querySelector('[data-icon="status-check"]');
console.log('Single check detected:', !!testCheck);

// Verificar que se captura el chat ID correctamente
const chatId = getChatId();
console.log('Chat ID:', chatId);
```

---

## 📞 Soporte

Si hay problemas con la API:
1. Verifica que la URL sea correcta: `https://accountant-services.co.uk/api/whatsapp-alert`
2. Revisa los headers: `Content-Type: application/json`
3. Valida el formato JSON de los datos
4. Verifica en la consola (F12) los logs de error
5. Contacta al administrador del servidor si recibe error 500

---

Última actualización: **2026-05-06**  
Versión: **2.0** - Sistema de alertas automáticas
