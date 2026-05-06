# 💬 WhatsApp Auto Checker

Una extensión de Chrome que **verifica automáticamente que las líneas de WhatsApp Web estén vivas** enviando mensajes aleatorios cada 10 minutos, detectando si llegan a ser leídos (doble tilde azul) y **enviando alertas automáticas al servidor cuando detecta caídas**.

## ✨ Características

✅ **Itera sobre todos los chats** - Automáticamente recorre la lista de chats  
✅ **44 mensajes variados** - Con emojis, preguntas, diferentes longitudes  
✅ **Escritura humana** - Escribe carácter por carácter para parecer real  
✅ **Errores simulados** - 30% chance de escribir mal y corregir (muy realista)  
✅ **Delays aleatorios** - Tiempos impredecibles entre cada acción  
✅ **Scroll aleatorio** - Navega naturalmente por la lista de chats  
✅ **Pauses variable** - Simula "pensar" mientras escribe  
✅ **Detección de caídas** - Identifica cuando un mensaje tiene single check (✓) - no entregado  
✅ **Alertas automáticas** - POST al servidor cuando detecta falla de entrega  
✅ **Verificación de lectura** - Espera 30 segundos y revisa si llegó doble tilde azul  
✅ **Alertas en tiempo real** - Muestra popup con líneas sin respuesta y alertas enviadas  
✅ **Funciona minimizado** - Service Worker ejecuta cada 10 minutos aunque la ventana esté minimizada  
✅ **Ciclo automático cada 10 minutos** - Se repite indefinidamente (incluso si minimizas)  
✅ **Interfaz visual** - Panel de control con estadísticas y alertas  

## 📊 Cómo funciona

### Flujo principal:
1. **Obtiene la lista** de chats de WhatsApp Web
2. **Abre cada chat** uno por uno
3. **Escribe un mensaje** aleatorio (ej: "Prueba", "ok", "hola", etc.)
4. **Envía el mensaje** presionando el botón Enviar
5. **Verifica estado** en tiempo real (cada 1 segundo)
   - Si detecta **single check (✓)** → Envía ALERTA al servidor 🚨
   - Si detecta **doble tilde azul (✓✓)** → Línea ACTIVA ✅
   - Si pasa 30 segundos → Mensaje NO verificado ⚠️
6. **Registra resultados** en el panel de control
7. **Repite el ciclo** cada 10 minutos

### Funcionamiento con ventana minimizada:
- El **Service Worker** de Chrome ejecuta cada 10 minutos
- Incluso si minimizas la ventana, **sigue funcionando**
- Usa `chrome.alarms` para ejecutar independientemente de la visibilidad
- WhatsApp Web debe estar abierto en una pestaña (en background es suficiente)

## 🚨 Sistema de Alertas (NUEVO)

### ¿Qué es una alerta?
Cuando el sistema detecta que un mensaje tiene un **single check (✓)** esto significa que:
- ❌ El mensaje NO fue ENTREGADO al destinatario
- 📱 Puede ser porque el número está offline, bloqueado o inactivo
- ⚠️ La línea puede estar caída o sin servicio

### Datos enviados al servidor:
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

### Endpoint de la API:
- **URL**: `POST https://accountant-services.co.uk/api/whatsapp-alert`
- **Headers**: `Content-Type: application/json`
- **Respuesta**: `{ "success": true, "alertId": "..." }`

### En el panel de control:
- **Sección Roja** 🚨 = Alertas enviadas al servidor (CAÍDAS DETECTADAS)
- **Sección Amarilla** ⚠️ = Líneas sin leer (sin alerta automatizada)

## 🚀 Instalación

### En Chrome:

1. Abre `chrome://extensions/`
2. Activa **"Modo de desarrollador"** (arriba a la derecha)
3. Clickea **"Cargar extensión sin empaquetar"**
4. Selecciona la carpeta actual (donde está este archivo)
5. ¡Listo! La extensión aparecerá en tu barra de herramientas

## 📋 Cómo usar

1. Abre **[WhatsApp Web](https://web.whatsapp.com)** en Chrome
2. Carga la lista de chats (espera a que aparezcan)
3. Clickea el ícono de la extensión 💬
4. Presiona **"▶ INICIAR"**
5. La extensión comenzará a verificar chats automáticamente
6. Verás el **panel de control** con:
   - **Estado**: Ejecutando / Detenido
   - **Chats escaneados**: Cantidad total
   - **Líneas sin leer**: Chats que no tuvieron doble tilde
   - **Próximo ciclo**: Cuándo se ejecutará el próximo
   - **Alertas Enviadas** (Rojo): Caídas detectadas - Enviadas al servidor
   - **Líneas Sin Leer** (Amarillo): Sin alerta automatizada

## 📝 Mensajes enviados

La extensión envía **44 mensajes diferentes** para evitar patrones:

### Mensajes cortos (respuesta rápida)
```
Prueba, ok, hola, test, hey, hi, ✓, Vale, Listo, Sí, 👋, Ey, Ok ok, Dale, Perfecto
```

### Mensajes con emojis (naturales)
```
Hola 👋, Ok 👍, Vale ✓, Listo 💪, Perfecto 🎯, Genial 😊, Ahi ando 👌, Claro 👀, Tranqui 😎, Seguro 🔥
```

### Mensajes más largos
```
Qué onda?, Como te va?, Todo bien?, Ahi andamos, Conectado, Listo acá, Presente, Activo, En línea, Por acá
```

### Preguntas
```
¿Qué tal?, ¿Cómo estás?, ¿Vos?, ¿Y vos?
```

### Variaciones
```
Entendido, Recibido, Copiar, A la orden, Presente señor, Listo jefe
```

---

## 🤖 Técnicas Anti-Detección

Para evitar que WhatsApp bloquee la extensión, usa las siguientes técnicas:

### 1. **Escritura Humana**
- Escribe **carácter por carácter** (40-120ms cada uno)
- No escribe el mensaje instantáneamente
- Simula velocidad real de tipeo

### 2. **Errores Simulados** (30% de chance)
- **Escribe mal intencionalmente**
- Espera 400-800ms (como si se diera cuenta)
- Borra y reescribe correctamente
- ✅ **Muy realista** - Los bots no cometen errores

### 3. **Pauses Impredecibles**
- Antes de escribir: 200-500ms
- Entre caracteres: 40-120ms
- Pauses aleatorios mientras escribe: 200-600ms
- Antes de enviar: 300-800ms
- Entre chats: 2-5 segundos

### 4. **Navegación Natural**
- Scroll aleatorio en lista de chats (50% chance)
- Simula que "lee" los chats antes de abrir
- Comportamiento menos mecánico

### 5. **Timing Variable**
- Abrir chat: 2000-4000ms (no siempre igual)
- Escribir: 800-1500ms (variable por mensaje)
- Enviar: 3500ms ± variación
- Verificar lectura: 30 segundos máximo

### 6. **Variedad Completa**
- 44 mensajes distintos (no repite patrones)
- Con y sin emojis
- Diferentes longitudes
- Preguntas y afirmaciones

---

## ⚠️ Por qué esto es importante

WhatsApp bloquea bots que:
- ❌ Escriben mensajes **instantáneamente**
- ❌ Envían **siempre el mismo mensaje**
- ❌ Actúan con **tiempos fijos predecibles**
- ❌ **Nunca cometen errores**
- ❌ Navegan de forma **mecánica**

Con estas técnicas:
- ✅ Parece un **usuario real**
- ✅ Comportamiento **impredecible**
- ✅ **Errores ocasionales**
- ✅ **Variación natural**
- ✅ Menos probabilidad de bloqueo

## ⚙️ Configuración técnica

| Parámetro | Valor | Propósito |
|-----------|-------|----------|
| **Sistema de alarmas** | Chrome Alarms API | Funciona minimizado |
| **Intervalo de ciclo** | 10 minutos | Ejecutado por Service Worker |
| **Mensajes variados** | 44 diferentes | Evitar patrones repetitivos |
| **Escritura por carácter** | 40-120ms | Simular escritura humana |
| **Errors simulados** | 30% chance | Parecer más real |
| **Pauses mientras escribe** | 200-600ms | Simular "pensar" |
| **Antes de escribir** | 200-500ms | Variación natural |
| **Antes de enviar** | 300-800ms | Revisar mensaje |
| **Entre chats** | 2000-5000ms | No mecánico |
| **Scroll aleatorio** | 50% chance | Navegación natural |
| **Abrir chat** | 2000-4000ms | Variable |
| **Tiempo de verificación** | 30 segundos | Esperar respuesta |
| **Chequeo de estado** | Cada 1 segundo | Detectar cambios |
| **API Endpoint** | `https://accountant-services.co.uk/api/whatsapp-alert` | Reportar caídas |
| **Ejecución** | ✅ Funciona incluso minimizado | Service Worker independiente |

## 🎯 Selectores CSS usados

```javascript
// Lista de chats
document.querySelectorAll('[role="row"][data-testid^="list-item-"]')

// Input de mensaje
document.querySelector('[data-testid="conversation-compose-box-input"]')

// Botón Enviar
document.querySelector('button[aria-label="Enviar"]')

// Doble tilde (leído) - ✓✓
document.querySelector('[data-icon="status-dblcheck"]')

// Tilde simple (enviado, no entregado) - ✓
document.querySelector('[data-icon="status-check"]')

// Header del chat (para obtener nombre/número)
document.querySelector('[data-testid="chat-header-title"]')

// Contenedor del chat
document.querySelector('[data-testid="conversation-container"]')
```

## 🐛 Troubleshooting

**P: ¿Escribe muy lentamente?**  
R: Eso es correcto, es para parecer humano. Los tiempos son 40-120ms por carácter. Si quieres que sea más rápido, edita `getRandomDelay()` en content.js (línea 17).

**P: ¿Por qué a veces comete errores?**  
R: Es intencional (30% de probabilidad). Los bots no cometen errores y WhatsApp lo detecta. Un usuario real a veces escribe mal y corrige.

**P: ¿Por qué los tiempos son diferentes cada vez?**  
R: Excelente, ese es el punto. Los delays aleatorios (2000-4000ms entre chats, 800-1500ms escribiendo, etc.) evitan patrones predecibles que WhatsApp detecta.

**P: ¿Riesgo de bloqueo?**  
R: Muy bajo con estas técnicas. Pero recuerda:
- Usa solo para lineas propias
- No spam a usuarios sin consentimiento
- Los envíos cada 10 minutos son razonables

**P: No detecta los chats**  
R: Asegúrate de estar en https://web.whatsapp.com (no en la versión normal). Espera a que cargue la lista completa.

**P: No envía mensajes**  
R: Verifica que WhatsApp no tenga ningún popup o modal abierto. Recarga la página.

**P: Los chats no se abren**  
R: La conexión podría ser lenta. Aumenta el tiempo de espera en `content.js` en la función `openChat()`.

**P: ¿Puedo personalizar los mensajes?**  
R: Sí, edita el array `randomMessages` en `content.js` (línea 20-55).

**P: ¿Por qué no detecta el single check?**  
R: El icono aparece en el selector `[data-icon="status-check"]`. Si WhatsApp cambió la estructura HTML, inspecciona el elemento (F12) y actualiza el selector en `checkSingleCheck()`.

**P: ¿Cómo sé si una alerta fue enviada al servidor?**  
R: En la consola (F12) verás logs como `✅ ALERTA ENVIADA EXITOSAMENTE AL SERVIDOR` y aparecerá en la sección roja del popup.

**P: ¿Qué pasa si el servidor está caído?**  
R: Se registrará un error en la consola pero la extensión seguirá funcionando y reintentará en el próximo ciclo.

**P: ¿Funciona si minimizo la ventana?**  
R: ✅ **SÍ** - Usa Chrome Alarms API. El Service Worker ejecuta cada 10 minutos aunque esté minimizado.

**P: ¿Puedo cerrar la pestaña de WhatsApp?**  
R: No, necesitas que esté abierta (aunque sea en background). El ciclo automático requiere que la tab exista.

**P: ¿Qué hacer si el ciclo no ejecuta después de un tiempo largo?**  
R: Los Service Workers se desactivan después de cierto tiempo. Abre el popup de la extensión nuevamente para reactivarlo.

**P: ¿Escribe siempre lo mismo?**  
R: No, tienes 44 mensajes variados y la escritura es carácter por carácter con delays aleatorios, entonces es prácticamente imposible que repita el mismo patrón.

## 📚 Estructura de archivos

```
whatsapp/
├── manifest.json          # Configuración de la extensión
├── popup.html            # Interfaz de control
├── popup.js              # Lógica del popup
├── content.js            # Script principal (automación + alertas)
├── background.js         # Service Worker
└── README.md            # Este archivo
```

## 🔒 Permisos

- `scripting` - Para inyectar el script en WhatsApp Web
- `storage` - Para guardar estado de ejecución y alertas
- `tabs` - Para comunicarse con la pestaña activa
- `alarms` - Para ejecutar ciclos cada 10 minutos (funciona minimizado)
- Host: `*://web.whatsapp.com/*` - Acceso a WhatsApp Web
- Host: `*://accountant-services.co.uk/*` - Acceso a la API de alertas

## 📈 Casos de uso

1. **Monitoreo de líneas de WhatsApp Business** - Verificar que estén activas
2. **Detección de números bloqueados o caídos** - Saber cuál no recibe mensajes
3. **Alertas automáticas** - Reportar caídas en tiempo real al servidor
4. **Pruebas de conectividad** - Comprobar que los chats funcionen
5. **Automatización de seguimiento** - Contactar automáticamente clientes

## 📊 Flujo de datos

```
Chrome Service Worker (cada 10 minutos)
         ↓
chrome.alarms → Ejecuta incluso si ventana minimizada
         ↓
Envía mensaje al Content Script
         ↓
Content Script abre WhatsApp Web → Envía mensaje
         ↓
Verifica cada 1 segundo durante 30s
         ↓
¿Single Check (✓)? → Sí → Extrae datos → POST a API → Guarda alertaId
         ↓
    No o Doble Tilde (✓✓)
         ↓
Registra resultado en Storage Local
         ↓
Popup actualiza UI en tiempo real
```

## ⚖️ Consideraciones legales

⚠️ **Úsalo responsablemente:**
- No envíes spam a usuarios sin su consentimiento
- Respeta los términos de servicio de WhatsApp
- No uses con fines maliciosos
- Los mensajes deben ser breves y no invasivos
- Usa solo para monitoreo de líneas propias

## 🔐 Seguridad

- ✅ Todos los datos se almacenan localmente (chrome.storage.local)
- ✅ Las alertas se envían por HTTPS (conexión segura)
- ✅ No se almacenan contraseñas ni tokens sensibles
- ✅ La extensión solo funciona en web.whatsapp.com

## 📝 Versión

**v2.2** - Anti-detección mejorado (escritura humana + errores simulados)

## 🤝 Soporte

Si encuentras problemas:
1. Abre la consola (F12) en WhatsApp Web
2. Revisa los logs con los prefijos 🚀 🔍 ✅ 🚨
3. Verifica que los selectores CSS sean correctos (WhatsApp actualiza su UI frecuentemente)
4. Intenta recargar la página y reiniciar la extensión
3. Copia el error y comparte en los reportes

## 📝 Versión

**v1.0** - Lanzamiento inicial

---

¡Disfruta automatizando tu verificación de WhatsApp! 💬✨
