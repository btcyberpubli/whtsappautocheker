/**
 * 📱 Extensión Detector de Caídas WhatsApp
 * 
 * Detecta cuando un WhatsApp deja de recibir mensajes (un solo tilde = no leído)
 * Envía alertas al servidor mediante el proxy inverso
 * 
 * Funcionalidad:
 * - Monitorea conversaciones
 * - Detecta estado "un tilde" (entregado, no leído)
 * - Envía alerta al servidor
 * - Recibe actualización del dashboard en tiempo real
 */

class WhatsAppDetector {
  constructor(config = {}) {
    // Configuración
    this.baseUrl = config.baseUrl || 'https://accountant-services.co.uk';
    this.localBaseUrl = config.localBaseUrl || 'http://localhost:3010';
    this.checkInterval = config.checkInterval || 300000; // 5 minutos (300000ms)
    this.monitoredChats = new Map(); // Guardar estado de chats
    this.alertLog = []; // Log de alertas
    this.maxAlertLog = 100; // Limitar tamaño del log
    
    console.log('[WhatsApp Detector] ✅ Inicializado');
  }

  /**
   * Iniciar monitoreo de conversaciones
   */
  startMonitoring() {
    console.log('[WhatsApp Detector] 🔍 Iniciando monitoreo...');
    
    // Monitorear cada 30 segundos
    setInterval(() => this.checkWhatsAppStatus(), this.checkInterval);
    
    // Primera ejecución inmediata
    this.checkWhatsAppStatus();
  }

  /**
   * Verificar estado actual de WhatsApp (simula búsqueda en DOM)
   * En producción, esto sería más sofisticado con injection en WhatsApp Web
   */
  async checkWhatsAppStatus() {
    try {
      // Buscar todos los chats con estado visual de "un tilde"
      const failedChats = this.detectSingleCheckMark();
      
      if (failedChats.length > 0) {
        console.log(`[WhatsApp Detector] ⚠️  Detectadas ${failedChats.length} línea(s) sin respuesta`);
        
        for (const chat of failedChats) {
          await this.reportDownline(chat);
        }
      }

      // ✅ NUEVO: Al finalizar el ciclo, enviar confirmaciones de líneas bien controladas
      const controlledChats = this.detectWellControlledChats();
      if (controlledChats.length > 0) {
        console.log(`[WhatsApp Detector] ✅ Confirmando ${controlledChats.length} línea(s) bien controlada(s)`);
        
        for (const chat of controlledChats) {
          await this.sendConfirmation(chat);
        }
      }

    } catch (error) {
      console.error('[WhatsApp Detector] ❌ Error durante chequeo:', error);
    }
  }

  /**
   * Detectar mensajes con un solo tilde (marca de lectura simple)
   * Busca en DOM los elementos que indican entrega pero no lectura
   */
  detectSingleCheckMark() {
    const failedChats = [];

    // Simular búsqueda en WhatsApp Web (en realidad sería más complejo)
    // Buscar elementos con clase de "single tick"
    try {
      const chatItems = document.querySelectorAll('[data-testid*="chat"]');
      
      chatItems.forEach(chat => {
        const checkmarks = chat.querySelectorAll('[data-testid*="status-icon"]');
        const messageStatus = this.getMessageStatus(chat);
        
        // Un tilde = "single-tick" = entregado pero no leído
        if (messageStatus === 'single-tick' && !this.isAlreadyReported(chat.id)) {
          const chatInfo = this.extractChatInfo(chat);
          if (chatInfo) {
            failedChats.push(chatInfo);
            this.monitoredChats.set(chat.id, {
              ...chatInfo,
              lastSeen: new Date(),
              status: 'single-tick'
            });
          }
        }
      });
    } catch (error) {
      console.warn('[WhatsApp Detector] ⚠️  No se pudo acceder a DOM de WhatsApp:', error.message);
    }

    return failedChats;
  }

  /**
   * Obtener estado visual del mensaje (single-tick o double-tick)
   */
  getMessageStatus(chatElement) {
    try {
      // Buscar elemento de estado en el chat
      const statusElement = chatElement.querySelector('[data-testid*="status"]');
      if (!statusElement) return null;

      const classes = statusElement.className;
      
      // Determinar si es un tilde o dos tildes
      if (classes.includes('single-tick') || classes.includes('one-tick')) {
        return 'single-tick';
      }
      if (classes.includes('double-tick') || classes.includes('two-tick')) {
        return 'double-tick';
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extraer información del chat para reporte
   */
  extractChatInfo(chatElement) {
    try {
      const nameElement = chatElement.querySelector('[title]');
      const timeElement = chatElement.querySelector('[data-testid*="time"]');
      
      return {
        chatId: chatElement.id || this.generateId(),
        contactName: nameElement?.title || 'Desconocido',
        lastMessage: this.getLastMessage(chatElement),
        detectedAt: new Date(),
        status: 'single-tick'
      };
    } catch (error) {
      console.warn('[WhatsApp Detector] ⚠️  Error extrayendo info del chat:', error);
      return null;
    }
  }

  /**
   * Obtener último mensaje del chat
   */
  getLastMessage(chatElement) {
    try {
      const messageElement = chatElement.querySelector('[data-testid*="preview"]');
      return messageElement?.textContent || 'Sin mensaje';
    } catch {
      return 'Sin mensaje';
    }
  }

  /**
   * Verificar si esta alerta ya fue reportada recientemente
   */
  isAlreadyReported(chatId) {
    const chat = this.monitoredChats.get(chatId);
    if (!chat) return false;
    
    // Si fue reportado hace menos de 5 minutos, no reportar de nuevo
    const timeSinceLastReport = Date.now() - chat.lastSeen.getTime();
    return timeSinceLastReport < 300000; // 5 minutos
  }

  /**
   * Reportar línea caída al servidor
   */
  async reportDownline(chatInfo) {
    try {
      const payload = {
        type: 'whatsapp-downline',
        contactName: chatInfo.contactName,
        chatId: chatInfo.chatId,
        lastMessage: chatInfo.lastMessage,
        detectedAt: chatInfo.detectedAt,
        severity: 'high',
        source: 'whatsapp-extension'
      };

      // Intentar mediante proxy inverso primero (evita CORS)
      try {
        await this.sendAlert(payload, this.baseUrl);
        console.log(`[WhatsApp Detector] ✅ Alerta enviada: ${chatInfo.contactName}`);
      } catch (proxyError) {
        // Fallback a localhost si proxy falla
        console.warn('[WhatsApp Detector] ⚠️  Proxy inverso falló, intentando localhost...');
        await this.sendAlert(payload, this.localBaseUrl);
      }

      // Guardar en log local
      this.alertLog.unshift(payload);
      if (this.alertLog.length > this.maxAlertLog) {
        this.alertLog.pop();
      }

    } catch (error) {
      console.error(`[WhatsApp Detector] ❌ Error reportando: ${error.message}`);
    }
  }

  /**
   * Enviar alerta al servidor
   */
  async sendAlert(payload, baseUrl) {
    const endpoint = `${baseUrl}/api/whatsapp-alert`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * ✅ NUEVO: Detectar chats que están siendo monitoreados correctamente
   * (que NO están en estado de caída)
   */
  detectWellControlledChats() {
    const controlledChats = [];
    
    try {
      const chatItems = document.querySelectorAll('[data-testid*="chat"]');
      
      chatItems.forEach(chat => {
        const messageStatus = this.getMessageStatus(chat);
        const chatId = chat.id || this.generateId();
        
        // Incluir chats con double-tick (respondieron) o que no tienen estado de caída
        if (messageStatus === 'double-tick' || (messageStatus !== 'single-tick' && messageStatus !== null)) {
          const chatInfo = this.extractChatInfo(chat);
          if (chatInfo) {
            controlledChats.push({
              ...chatInfo,
              status: 'bien-controlada',
              message: 'Línea controlada correctamente'
            });
          }
        }
      });
    } catch (error) {
      console.warn('[WhatsApp Detector] ⚠️  Error detectando líneas bien controladas:', error.message);
    }

    return controlledChats;
  }

  /**
   * ✅ NUEVO: Enviar confirmación de línea bien controlada al servidor
   */
  async sendConfirmation(chatInfo) {
    try {
      const payload = {
        type: 'line-confirmation',
        contactName: chatInfo.contactName,
        chatId: chatInfo.chatId,
        status: 'controlada',
        message: chatInfo.message || 'Línea controlada correctamente',
        confirmedAt: new Date().toISOString(),
        source: 'whatsapp-extension'
      };

      // Intentar mediante proxy inverso primero
      try {
        await this.sendConfirmationToServer(payload, this.baseUrl);
        console.log(`[WhatsApp Detector] ✅ Confirmación enviada: ${chatInfo.contactName}`);
      } catch (proxyError) {
        // Fallback a localhost
        console.warn('[WhatsApp Detector] ⚠️  Proxy inverso falló, intentando localhost...');
        await this.sendConfirmationToServer(payload, this.localBaseUrl);
      }

    } catch (error) {
      console.error(`[WhatsApp Detector] ❌ Error enviando confirmación: ${error.message}`);
    }
  }

  /**
   * Enviar confirmación al servidor
   */
  async sendConfirmationToServer(payload, baseUrl) {
    const endpoint = `${baseUrl}/api/whatsapp-confirmation`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Generar ID único
   */
  generateId() {
    return `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtener log de alertas
   */
  getAlertLog() {
    return this.alertLog;
  }

  /**
   * Obtener estado actual de monitoreo
   */
  getStatus() {
    return {
      isRunning: true,
      monitoredChats: this.monitoredChats.size,
      alertCount: this.alertLog.length,
      lastCheck: new Date(),
      config: {
        checkInterval: this.checkInterval,
        baseUrl: this.baseUrl
      }
    };
  }

  /**
   * Limpiar alerta específica
   */
  clearAlert(chatId) {
    this.monitoredChats.delete(chatId);
    console.log(`[WhatsApp Detector] 🗑️  Alerta limpiada: ${chatId}`);
  }

  /**
   * Detener monitoreo
   */
  stopMonitoring() {
    console.log('[WhatsApp Detector] ⏹️  Monitoreo detenido');
    // En producción, aquí se limpiarían los intervalos
  }
}

// ============================================================================
// INSTALACIÓN AUTOMÁTICA
// ============================================================================

// Cuando se carga, inicializar automáticamente
if (typeof window !== 'undefined') {
  window.whatsappDetector = new WhatsAppDetector({
    baseUrl: 'https://accountant-services.co.uk',
    localBaseUrl: 'http://localhost:3010',
    checkInterval: 300000  // 5 minutos
  });

  // Iniciar monitoreo cuando DOM está listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.whatsappDetector.startMonitoring();
    });
  } else {
    window.whatsappDetector.startMonitoring();
  }

  // Exponer en consola para debugging
  console.log('[WhatsApp Detector] 🔧 Acceso en: window.whatsappDetector');
}

export default WhatsAppDetector;
