// ============================================
// WhatsApp Auto Checker - Content Script
// ============================================
console.log('🚀 WhatsApp Auto Checker cargado - Content Script');

// Test inmediato para verificar que se carga
window.__whatsappCheckerLoaded = true;
console.log('✅ Script cargado correctamente');

// Mensajes aleatorios para evitar spam
const randomMessages = [
  // Mensajes cortos (simular respuesta rápida)
  'Prueba',
  'ok',
  'hola',
  'test',
  'hey',
  'hi',
  '✓',
  'Vale',
  'Listo',
  'Sí',
  '👋',
  'Ey',
  'Ok ok',
  'Dale',
  'Perfecto',
  
  // Mensajes con emojis (más naturales)
  'Hola 👋',
  'Ok 👍',
  'Vale ✓',
  'Listo 💪',
  'Perfecto 🎯',
  'Genial 😊',
  'Ahi ando 👌',
  'Claro 👀',
  'Tranqui 😎',
  'Seguro 🔥',
  
  // Mensajes algo más largos
  'Qué onda?',
  'Como te va?',
  'Todo bien?',
  'Ahi andamos',
  'Conectado',
  'Listo acá',
  'Presente',
  'Activo',
  'En línea',
  'Por acá',
  
  // Mensajes tipo pregunta
  '¿Qué tal?',
  '¿Cómo estás?',
  '¿Vos?',
  '¿Y vos?',
  
  // Variaciones
  'Entendido',
  'Recibido',
  'Copiar',
  'A la orden',
  'Presente señor',
  'Listo jefe',
];

// Delays aleatorios para simular comportamiento humano
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const whatsappChecker = {
  running: false,
  checkInterval: null,
  failedChats: [],

  /**
   * Obtiene todos los chats de la lista
   */
  getChatsFromList() {
    // Buscamos los elementos de chat con data-testid="list-item-*"
    const chatRows = document.querySelectorAll('[role="row"][data-testid^="list-item-"]');
    console.log(`🔍 Encontrados ${chatRows.length} chats en total`);
    
    // Log detallado de cada chat encontrado
    chatRows.forEach((chat, i) => {
      const name = this.getChatName(chat);
      console.log(`  ${i + 1}. ${name}`);
    });
    
    return Array.from(chatRows);
  },

  /**
   * Obtiene el nombre del chat
   */
  getChatName(chatElement) {
    try {
      const titleElement = chatElement.querySelector('[data-testid="cell-frame-title"] span[dir="auto"]');
      const name = titleElement ? titleElement.textContent.trim() : 'Chat sin nombre';
      return name;
    } catch (error) {
      console.error('Error obteniendo nombre:', error);
      return 'Chat sin nombre';
    }
  },

  /**
   * Simula un clic real con eventos del mouse
   */
  simulateRealClick(element) {
    if (!element) return false;

    // Asegurar que el elemento es visible y accesible
    element.scrollIntoView({ block: 'center' });
    
    // Obtener las coordenadas del elemento
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    console.log(`📍 Coordenadas: X=${Math.round(centerX)}, Y=${Math.round(centerY)}`);
    
    // Secuencia REAL de eventos de mouse en el orden correcto
    const eventOptions = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: centerX,
      clientY: centerY,
      screenX: centerX,
      screenY: centerY,
      buttons: 0
    };
    
    // 1. pointerdown
    const pointerDownEvent = new PointerEvent('pointerdown', {
      ...eventOptions,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      buttons: 1
    });
    element.dispatchEvent(pointerDownEvent);
    console.log('👆 pointerdown');
    
    // 2. mousedown
    const mouseDownEvent = new MouseEvent('mousedown', {
      ...eventOptions,
      buttons: 1
    });
    element.dispatchEvent(mouseDownEvent);
    console.log('👆 mousedown');
    
    // 3. pointerup
    const pointerUpEvent = new PointerEvent('pointerup', {
      ...eventOptions,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true
    });
    element.dispatchEvent(pointerUpEvent);
    console.log('👆 pointerup');
    
    // 4. mouseup
    const mouseUpEvent = new MouseEvent('mouseup', eventOptions);
    element.dispatchEvent(mouseUpEvent);
    console.log('👆 mouseup');
    
    // 5. click
    const clickEvent = new MouseEvent('click', eventOptions);
    element.dispatchEvent(clickEvent);
    console.log('👆 click');
    
    return true;
  },

  /**
   * Abre un chat
   */
  async openChat(chatElement) {
    const chatName = this.getChatName(chatElement);
    console.log(`📞 Abriendo chat: ${chatName}`);
    
    try {
      // Hacer scroll para asegurar visibilidad
      chatElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.sleep(1000);
      
      // ESTRATEGIA 1: Intentar click en el elemento row con eventos realistas
      console.log(`🎯 Estrategia 1: Click en role="row" con eventos del mouse...`);
      let clickedSuccessfully = this.simulateRealClick(chatElement);
      
      if (clickedSuccessfully) {
        console.log('✅ Eventos de mouse disparados en role="row"');
        await this.sleep(3500);
      }
      
      // ESTRATEGIA 2: Si no abrió, intentar en elemento tabindex="0"
      let inputBox = document.querySelector('[data-testid="conversation-compose-box-input"]');
      if (!inputBox) {
        console.log(`🎯 Estrategia 2: Buscando elemento [tabindex="0"]...`);
        const tabbableElement = chatElement.querySelector('[tabindex="0"]');
        
        if (tabbableElement) {
          console.log('✅ Elemento [tabindex="0"] encontrado, clickeando...');
          tabbableElement.focus();
          await this.sleep(400);
          this.simulateRealClick(tabbableElement);
          await this.sleep(3500);
        }
      }
      
      // ESTRATEGIA 3: Si no abrió, intentar en div específico dentro del chat
      inputBox = document.querySelector('[data-testid="conversation-compose-box-input"]');
      if (!inputBox) {
        console.log(`🎯 Estrategia 3: Buscando divs clickeables en el chat...`);
        const divs = chatElement.querySelectorAll('div[role="gridcell"], div.x1n2onr6');
        
        for (let div of divs) {
          if (div.offsetParent !== null) { // Visible
            console.log('✅ Div clickeable encontrado');
            this.simulateRealClick(div);
            await this.sleep(3500);
            
            inputBox = document.querySelector('[data-testid="conversation-compose-box-input"]');
            if (inputBox) {
              console.log('✅ Chat se abrió!');
              break;
            }
          }
        }
      }
      
      // Verificar final
      inputBox = document.querySelector('[data-testid="conversation-compose-box-input"]');
      if (inputBox) {
        console.log(`✅ Chat abierto correctamente`);
        return true;
      } else {
        console.log(`⚠️ El chat no se abrió, pero continuando...`);
        return true;
      }
    } catch (error) {
      console.error(`❌ Error al abrir chat:`, error);
      return false;
    }
  },

  /**
   * Simula escritura humana - escribe carácter por carácter
   */
  async typeMessageHuman(inputBox, message) {
    console.log(`✍️ Escribiendo de forma humana: "${message}"`);
    
    inputBox.focus();
    await this.sleep(getRandomDelay(200, 500)); // Pausa antes de escribir
    
    let currentText = '';
    
    for (let i = 0; i < message.length; i++) {
      const char = message[i];
      
      // Simular velocidad de tipeo variable (50-150ms por carácter)
      const typeSpeed = getRandomDelay(40, 120);
      await this.sleep(typeSpeed);
      
      currentText += char;
      inputBox.textContent = currentText;
      
      // Disparar evento de input para que WhatsApp lo detecte
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        composed: true,
        data: char
      });
      inputBox.dispatchEvent(inputEvent);
      
      // Ocasionalmente simular una pausa (como si pensara)
      if (Math.random() < 0.15) { // 15% de chance
        await this.sleep(getRandomDelay(200, 600));
      }
    }
    
    console.log('✅ Mensaje escrito humanamente');
  },

  /**
   * Simula borrar y reescribir (comportamiento muy humano)
   */
  async simulateTypoAndFix(inputBox, message) {
    console.log(`✍️ Simulando error de tipeo y corrección...`);
    
    // 30% de chance de simular un error
    if (Math.random() < 0.30) {
      const typoIndex = Math.floor(Math.random() * message.length);
      const wrongChar = String.fromCharCode(Math.random() * 26 + 97);
      const messageWithTypo = message.substring(0, typoIndex) + wrongChar + message.substring(typoIndex);
      
      // Escribir con error
      await this.typeMessageHuman(inputBox, messageWithTypo);
      
      // Esperar un poquito (como si se diera cuenta)
      await this.sleep(getRandomDelay(400, 800));
      
      // Limpiar y reescribir correctamente
      inputBox.textContent = '';
      await this.sleep(getRandomDelay(100, 300));
    }
    
    // Escribir el mensaje correcto
    await this.typeMessageHuman(inputBox, message);
  },

  /**
   * Escribe el mensaje en el input
   */
  async writeMessage(message) {
    console.log(`✍️ Buscando input de mensaje...`);
    
    // Buscar el input con reintentos
    let inputBox = null;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!inputBox && attempts < maxAttempts) {
      inputBox = document.querySelector('[data-testid="conversation-compose-box-input"]');
      
      if (!inputBox) {
        attempts++;
        console.log(`⏳ Intento ${attempts}/${maxAttempts} - Input no encontrado aún...`);
        await this.sleep(500);
      }
    }
    
    if (!inputBox) {
      console.warn('❌ No se encontró el input después de 5 segundos');
      return false;
    }

    // Enfocar el input
    inputBox.focus();
    await this.sleep(getRandomDelay(300, 700));
    
    // Limpiar contenido previo
    inputBox.textContent = '';
    inputBox.innerText = '';
    
    // 70% de chance: escribir de forma humana
    // 30% de chance: simular error y corregir
    const useNaturalTyping = Math.random() < 0.70;
    
    if (useNaturalTyping) {
      await this.typeMessageHuman(inputBox, message);
    } else {
      await this.simulateTypoAndFix(inputBox, message);
    }

    console.log('✅ Mensaje escrito');
    
    // Pausa impredecible después de escribir
    await this.sleep(getRandomDelay(800, 1500));
    return true;
  },

  /**
   * 🔄 MEJORADO: Envía el mensaje (ahora usa sendMessageWithRetry internamente)
   * Mantiene compatibilidad con código existente
   */
  async sendMessage() {
    const result = await this.sendMessageWithRetry(3);
    return result.success;
  },

  /**
   * Cierra el chat actual presionando Escape
   */
  async closeChat() {
    console.log('🔙 Cerrando chat actual...');
    
    // Presionar Escape para cerrar el chat
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
    
    // Esperar a que se cierre
    await this.sleep(getRandomDelay(800, 1500));
    
    // Verificar que el input está realmente cerrado
    let inputBox = document.querySelector('[data-testid="conversation-compose-box-input"]');
    let attempts = 0;
    while (inputBox && attempts < 5) {
      console.log('⏳ Esperando a que el input se cierre...');
      await this.sleep(getRandomDelay(300, 600));
      inputBox = document.querySelector('[data-testid="conversation-compose-box-input"]');
      attempts++;
    }
    
    console.log('✅ Chat cerrado correctamente');
  },

  /**
   * Simula scroll aleatorio en la lista de chats
   */
  async simulateRandomScroll() {
    const chatList = document.querySelector('[role="region"][aria-label*="chat"]');
    if (chatList) {
      const scrollAmount = getRandomDelay(200, 600);
      chatList.scrollTop += (Math.random() > 0.5 ? scrollAmount : -scrollAmount);
      await this.sleep(getRandomDelay(200, 500));
    }
  },

  /**
   * Verifica si el mensaje fue leído (doble tilde)
   */
  checkIfRead() {
    // Buscamos el SVG con data-icon="status-dblcheck" (doble tilde = leído)
    const dblCheckIcon = document.querySelector('[data-icon="status-dblcheck"]');
    
    if (dblCheckIcon) {
      console.log('✅ Mensaje LEÍDO (doble tilde azul)');
      return true;
    } else {
      console.log('❌ Mensaje NO LEÍDO (sin doble tilde)');
      return false;
    }
  },

  /**
   * Verifica si el mensaje tiene un solo checkmark (enviado pero NO entregado)
   */
  checkSingleCheck() {
    // data-icon="status-check" = un solo checkmark (enviado pero no entregado)
    const singleCheckIcon = document.querySelector('[data-icon="status-check"]');
    
    if (singleCheckIcon) {
      console.log('⚠️ Mensaje con SINGLE CHECK (enviado, no entregado)');
      return true;
    }
    return false;
  },

  /**
   * 🆕 NUEVA FUNCIÓN: Verifica si el mensaje está en estado "Borrador"
   */
  checkIfDraft() {
    // MÉTODO 1: Revisar si el input field aún tiene contenido
    const inputBox = document.querySelector('[data-testid="conversation-compose-box-input"]');
    if (inputBox && (inputBox.textContent.trim() || inputBox.innerText.trim())) {
      console.log('🚨 ALERTA CRÍTICA: Mensaje en estado BORRADOR (input con contenido)');
      return true;
    }
    
    // MÉTODO 2: Si no hay input visible pero el texto de escritura dice algo
    const composerElement = document.querySelector('[data-testid="conversation-compose-box"]');
    if (composerElement) {
      const text = composerElement.textContent.trim();
      if (text && text.length > 0) {
        console.log('⚠️ ALERTA: Posible borrador detectado en composer');
        return true;
      }
    }
    
    return false;
  },

  /**
   * 🆕 NUEVA FUNCIÓN: Valida que el mensaje se envió correctamente
   * Retorna: { sent: boolean, reason: string, timestamp: ISO, attempts: number }
   */
  async validateMessageSent(timeoutMs = 8000) {
    console.log('🔍 Validando envío del mensaje...');
    
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = 15;
    
    while (Date.now() - startTime < timeoutMs && attempts < maxAttempts) {
      attempts++;
      
      // 1. Verificar que el input se limpió
      const inputBox = document.querySelector('[data-testid="conversation-compose-box-input"]');
      const inputCleaned = !inputBox || !inputBox.textContent.trim();
      
      if (!inputCleaned) {
        console.log(`⏳ Validación intento ${attempts}: Input aún contiene texto`);
        await this.sleep(500);
        continue;
      }
      
      // 2. Verificar que hay checkmarks
      const hasCheckmark = this.checkSingleCheck() || this.checkIfRead();
      
      if (!hasCheckmark) {
        console.log(`⏳ Validación intento ${attempts}: Sin checkmarks aún`);
        await this.sleep(500);
        continue;
      }
      
      // 3. Verificar que el mensaje aparece en la lista
      const messages = document.querySelectorAll('[data-testid="msg"]');
      if (messages.length === 0) {
        console.log(`⏳ Validación intento ${attempts}: Mensaje no aparece en lista`);
        await this.sleep(500);
        continue;
      }
      
      const elapsedMs = Date.now() - startTime;
      console.log(`✅ ENVÍO VALIDADO en ${attempts} intentos (${elapsedMs}ms)`);
      return { 
        sent: true, 
        reason: 'Validación exitosa',
        timestamp: new Date().toISOString(),
        attempts: attempts,
        elapsedMs: elapsedMs
      };
    }
    
    // Si llegamos acá, el envío falló
    console.error('❌ FALLÓ LA VALIDACIÓN: Mensaje no se envió correctamente');
    return { 
      sent: false, 
      reason: 'Timeout esperando confirmación de envío',
      timestamp: new Date().toISOString(),
      attempts: attempts,
      elapsedMs: Date.now() - startTime
    };
  },

  /**
   * 🆕 NUEVA FUNCIÓN: Envía el mensaje con reintentos inteligentes
   * Retorna: { success: boolean, attempts: number, validationDetails?: object, error?: string }
   */
  async sendMessageWithRetry(maxRetries = 3) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`📤 Intento de envío ${attempt}/${maxRetries}...`);
      
      try {
        // Buscar botón
        const sendButton = document.querySelector('button[aria-label="Enviar"]');
        if (!sendButton) {
          console.warn(`❌ Intento ${attempt}: Botón de envío no encontrado`);
          lastError = 'Botón de envío no encontrado';
          
          if (attempt < maxRetries) {
            console.log(`⏳ Reintentando en 1500ms...`);
            await this.sleep(1500);
            continue;
          }
          break;
        }
        
        // Hacer click
        console.log(`🔘 Clickeando botón de envío (intento ${attempt})...`);
        sendButton.click();
        
        // Esperar brevemente después del click
        await this.sleep(800);
        
        // Validar envío
        const validation = await this.validateMessageSent(6000);
        
        if (validation.sent) {
          console.log(`✅ MENSAJE ENVIADO EXITOSAMENTE EN INTENTO ${attempt}`);
          return {
            success: true,
            attempts: attempt,
            validationDetails: validation
          };
        } else {
          lastError = validation.reason;
          console.log(`⚠️ Validación falló (intento ${attempt}): ${validation.reason}`);
          
          // Reintento
          if (attempt < maxRetries) {
            console.log(`⏳ Esperando 2000ms antes de reintentar...`);
            await this.sleep(2000);
          }
        }
      } catch (error) {
        console.error(`❌ Error en intento ${attempt}:`, error);
        lastError = error.message;
        
        if (attempt < maxRetries) {
          await this.sleep(1500);
        }
      }
    }
    
    // Todos los intentos fallaron
    console.error(`❌ FALLÓ ENVÍO DESPUÉS DE ${maxRetries} INTENTOS`);
    
    // Verificar si es borrador
    const isDraft = this.checkIfDraft();
    
    return {
      success: false,
      attempts: maxRetries,
      error: lastError,
      isDraft: isDraft
    };
  },

  /**
   * 🆕 NUEVA FUNCIÓN: Detecta múltiples tipos de problemas con el envío
   */
  async detectDeliveryIssues(contactName, message, chatId) {
    const issues = {
      isDraft: false,
      isSingleCheck: false,
      isNotDelivered: false,
      isRead: false,
      timestamp: new Date().toISOString()
    };
    
    // 1. Detectar Borrador
    if (this.checkIfDraft()) {
      issues.isDraft = true;
      console.log('🚨 ALERTA CRÍTICA: MENSAJE EN BORRADOR');
    }
    
    // 2. Detectar Single Check
    if (this.checkSingleCheck()) {
      issues.isSingleCheck = true;
      issues.isNotDelivered = true;
      console.log('🚨 ALERTA: Single Check - No entregado');
    }
    
    // 3. Detectar Leído
    if (this.checkIfRead()) {
      issues.isRead = true;
      console.log('✅ Mensaje leído correctamente');
      return null; // Sin problema
    }
    
    // Si hay algún problema, reportar
    if (issues.isDraft || issues.isSingleCheck) {
      const alertData = {
        type: "whatsapp-delivery-issue",
        contactName: contactName,
        chatId: chatId,
        message: message,
        issues: issues,
        detectedAt: issues.timestamp,
        severity: issues.isDraft ? "critical" : "high",
        source: "whatsapp-extension"
      };
      
      return alertData;
    }
    
    return null;
  },

  /**
   * Obtiene el ID del chat (número de WhatsApp)
   */
  getChatId() {
    try {
      // MÉTODO 1: Buscar en el header del chat abierto
      const headerTitle = document.querySelector('[data-testid="chat-header-title"]');
      if (headerTitle) {
        const text = headerTitle.textContent.trim();
        console.log('📱 Texto del header:', text);
        
        // Si es un número directamente (formato: +54 9 2236 04-9325)
        if (/^\+?[\d\s\-()]+$/.test(text)) {
          const cleanNumber = text.replace(/\D/g, ''); // Elimina todo menos dígitos
          if (cleanNumber && cleanNumber.length > 5) {
            const chatId = cleanNumber + '@c.us';
            console.log('✅ Chat ID obtenido del header:', chatId);
            return chatId;
          }
        }
      }

      // MÉTODO 2: Buscar en el data-testid="conversation-container"
      const chatContainer = document.querySelector('[data-testid="conversation-container"]');
      if (chatContainer) {
        // Buscar el elemento de información del chat
        const chatInfo = chatContainer.getAttribute('data-chat');
        if (chatInfo) {
          console.log('✅ Chat ID del container:', chatInfo);
          return chatInfo;
        }
      }

      // MÉTODO 3: Buscar en el atributo aria-label del header
      const headerArea = document.querySelector('[data-testid="chat-header-container"]');
      if (headerArea) {
        const ariaLabel = headerArea.getAttribute('aria-label');
        if (ariaLabel) {
          const match = ariaLabel.match(/(\+?[\d\s\-()]+)/);
          if (match) {
            const cleanNumber = match[1].replace(/\D/g, '');
            if (cleanNumber && cleanNumber.length > 5) {
              const chatId = cleanNumber + '@c.us';
              console.log('✅ Chat ID obtenido del aria-label:', chatId);
              return chatId;
            }
          }
        }
      }

      // MÉTODO 4: Buscar en todos los elementos con números
      const allElements = document.querySelectorAll('[data-testid*="chat"]');
      for (let elem of allElements) {
        const text = elem.textContent;
        const match = text.match(/\+?[\d]{7,15}/);
        if (match) {
          const cleanNumber = match[0].replace(/\D/g, '');
          if (cleanNumber && cleanNumber.length > 5) {
            const chatId = cleanNumber + '@c.us';
            console.log('✅ Chat ID obtenido de elemento:', chatId);
            return chatId;
          }
        }
      }

      console.warn('⚠️ No se pudo obtener Chat ID, usando genérico');
      return 'unknown@c.us';
    } catch (error) {
      console.error('❌ Error obteniendo chat ID:', error);
      return 'unknown@c.us';
    }
  },

  /**
   * Envía alerta al servidor
   */
  async sendAlertToServer(alertData) {
    try {
      const endpoint = 'https://accountant-services.co.uk/api/whatsapp-alert';
      
      console.log('📤 ENVIANDO ALERTA AL SERVIDOR:');
      console.log('   Tipo:', alertData.type);
      console.log('   Contacto:', alertData.contactName);
      console.log('   Chat ID:', alertData.chatId);
      console.log('   Mensaje:', alertData.lastMessage);
      console.log('   Severidad:', alertData.severity);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(alertData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ Error del servidor:', data);
        return false;
      }

      console.log('✅ ALERTA ENVIADA EXITOSAMENTE AL SERVIDOR');
      console.log('   Alert ID:', data.alertId);
      console.log('   Es duplicada:', data.isDuplicate);
      console.log('   Mensaje:', data.message);
      
      return data;
    } catch (error) {
      console.error('❌ Error enviando alerta:', error);
      return false;
    }
  },

  /**
   * 🆕 NUEVA FUNCIÓN: Envía confirmación de ciclo completado exitosamente
   */
  async sendCycleConfirmation(chatsProcessed) {
    try {
      const endpoint = 'https://accountant-services.co.uk/api/whatsapp-alert';
      
      const confirmationData = {
        type: "whatsapp-cycle-ok",
        contactName: `Ciclo completado - ${chatsProcessed} chats`,
        chatId: "cycle-check@automation",
        detectedAt: new Date().toISOString(),
        severity: "low",
        source: "whatsapp-extension",
        status: "success"
      };

      console.log('📤 ENVIANDO CONFIRMACIÓN DE CICLO:');
      console.log('   Chats procesados:', chatsProcessed);
      console.log('   Timestamp:', confirmationData.detectedAt);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(confirmationData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.warn('⚠️ No se pudo enviar confirmación:', data);
        return false;
      }

      console.log('✅ CONFIRMACIÓN DE CICLO ENVIADA');
      console.log('   ID:', data.alertId);
      
      return data;
    } catch (error) {
      console.error('❌ Error enviando confirmación:', error);
      return false;
    }
  },

  /**
   * Detecta single check y reporta la caída
   */
  async detectAndReportSingleCheck(contactName, lastMessage, chatId) {
    const hasSingleCheck = this.checkSingleCheck();
    
    if (hasSingleCheck) {
      console.log('🚨 ALERTA DETECTADA: Mensaje con single check - No llega!');
      console.log(`📱 Detalles: Contacto="${contactName}", ChatId="${chatId}", Mensaje="${lastMessage}"`);
      
      // Obtener nuevamente el chatId para asegurar que es correcto
      const verifiedChatId = this.getChatId() || chatId;
      console.log(`✅ Chat ID verificado: ${verifiedChatId}`);
      
      // Preparar datos de la alerta
      const alertData = {
        type: "whatsapp-downline",
        contactName: contactName || "Desconocido",
        chatId: verifiedChatId || "unknown@c.us",
        lastMessage: lastMessage || "Mensaje de prueba",
        detectedAt: new Date().toISOString(),
        severity: "high",
        source: "whatsapp-extension"
      };

      console.log('📤 Datos de alerta preparados:', alertData);

      // Enviar alerta
      const serverResponse = await this.sendAlertToServer(alertData);
      
      if (serverResponse && serverResponse.success) {
        console.log('✅ Alerta registrada con ID:', serverResponse.alertId);
        
        // Guardar en storage local
        const alertInfo = {
          ...alertData,
          alertId: serverResponse.alertId,
          isDuplicate: serverResponse.isDuplicate,
          reportedAt: new Date().toISOString()
        };
        
        chrome.storage.local.get('sentAlerts', (result) => {
          const sentAlerts = result.sentAlerts || [];
          sentAlerts.push(alertInfo);
          chrome.storage.local.set({ sentAlerts });
          console.log('💾 Alerta guardada en storage. Total:', sentAlerts.length);
        });

        return true;
      }
      
      return false;
    }
    
    return null; // Sin single check
  },

  /**
   * Procesa un chat: abre, envía, verifica lectura
   */
  async processChat(chatElement, index, total) {
    const chatName = this.getChatName(chatElement);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`⚙️ PROCESANDO CHAT ${index}/${total}: ${chatName}`);
    console.log(`${'='.repeat(60)}`);

    try {
      // Pausa antes de abrir (variable)
      await this.sleep(getRandomDelay(500, 1500));

      // Abrir chat
      const opened = await this.openChat(chatElement);
      if (!opened) {
        console.error(`❌ No se pudo abrir ${chatName}`);
        return { name: chatName, success: false, reason: 'No se pudo abrir' };
      }

      // Esperar a que el chat cargue completamente (variable)
      await this.sleep(getRandomDelay(2000, 4000));

      // Obtener datos del chat DESPUÉS de abrirlo
      const chatId = this.getChatId();
      console.log(`📱 Chat abierto - ID: ${chatId}`);

      // Simular que lee el chat (scroll, espera)
      await this.sleep(getRandomDelay(300, 900));

      // Escribir mensaje aleatorio
      const message = randomMessages[Math.floor(Math.random() * randomMessages.length)];
      const written = await this.writeMessage(message);
      
      if (!written) {
        console.error(`❌ No se pudo escribir en ${chatName}`);
        return { name: chatName, success: false, reason: 'No se pudo escribir' };
      }

      // Pausa antes de enviar (como si revisara el mensaje)
      await this.sleep(getRandomDelay(300, 800));

      // 🆕 MEJORADO: Enviar con reintentos y validación
      console.log('📤 Iniciando proceso de envío con validación...');
      const sendResult = await this.sendMessageWithRetry(3);
      
      if (!sendResult.success) {
        console.error(`❌ Fallo en envío después de ${sendResult.attempts} intentos`);
        
        // 🆕 Detectar si es borrador y reportar
        const issues = await this.detectDeliveryIssues(chatName, message, this.getChatId());
        if (issues) {
          console.log('🚨 Problemas detectados, enviando alerta al servidor...');
          const alertResult = await this.sendAlertToServer(issues);
          if (alertResult) {
            console.log('✅ Alerta de envío fallido reportada');
          }
        }
        
        return { 
          name: chatName, 
          success: false, 
          reason: 'Fallo en envío después de reintentos',
          sendDetails: sendResult,
          chatId: this.getChatId()
        };
      }

      // 🆕 MEJORADO: El envío fue validado, pero esperar más para confirmar entrega
      console.log(`📤 Mensaje enviado exitosamente en intento ${sendResult.attempts}`);
      console.log('⏳ Esperando confirmación final de WhatsApp...');
      await this.sleep(getRandomDelay(2000, 3500));

      console.log(`📤 Mensaje enviado: "${message}" → ${chatName} (${chatId})`);

      // 🆕 MEJORADO: Verificar lectura con mejor sincronización
      console.log('⏳ Verificando lectura/entrega en tiempo real...');
      let isRead = false;
      let hasSingleCheck = false;
      let alertSent = false;
      const maxWaitTime = 25000; // 25 segundos (reducido porque ya validamos en sendWithRetry)
      const checkInterval = 1000; // Verificar cada 1 segundo
      let elapsedTime = 0;

      while (elapsedTime < maxWaitTime) {
        await this.sleep(checkInterval);
        isRead = this.checkIfRead();
        
        // Detectar single check (solo si no se ha enviado alerta aún)
        if (!alertSent && !hasSingleCheck) {
          hasSingleCheck = this.checkSingleCheck();
          if (hasSingleCheck) {
            console.log(`🚨 SINGLE CHECK DETECTADO en ${chatName} (${chatId})`);
            // Enviar alerta
            alertSent = await this.detectAndReportSingleCheck(
              chatName,
              message,
              chatId
            );
            if (alertSent) {
              console.log(`✅ Alerta enviada para ${chatName} (${chatId})`);
              return { 
                name: chatName, 
                success: true, 
                read: false, 
                alertSent: true,
                reason: 'Single check detectado - No llega',
                chatId: chatId
              };
            }
          }
        }

        elapsedTime += checkInterval;

        if (isRead) {
          console.log(`✅ ${chatName} - LÍNEA ACTIVA (leído en ${elapsedTime / 1000}s) - ${chatId}`);
          return { name: chatName, success: true, read: true, chatId: chatId };
        }
      }

      // Si no se leyó después de esperar, registrar pero continuar
      console.log(`⚠️ ${chatName} - MENSAJE NO VERIFICADO (tiempo agotado) - ${chatId} - Continuando...`);
      return { name: chatName, success: true, read: false, registered: true, chatId: chatId };

    } catch (error) {
      console.error(`❌ Error procesando ${chatName}:`, error);
      return { name: chatName, success: false, reason: error.message };
    }
  },

  /**
   * Ejecuta el ciclo completo
   */
  async runCycle() {
    console.log('\n\n' + '='.repeat(70));
    console.log('🌀 INICIANDO NUEVO CICLO DE VERIFICACIÓN');
    console.log(`⏰ Hora: ${new Date().toLocaleTimeString()}`);
    console.log('='.repeat(70));

    const chats = this.getChatsFromList();
    if (chats.length === 0) {
      console.warn('⚠️ No se encontraron chats. Abre WhatsApp y asegúrate de que cargue la lista.');
      return;
    }

    const results = [];
    let failedCount = 0;
    let alertsCount = 0;

    // Procesar cada chat
    for (let i = 0; i < chats.length; i++) {
      if (!this.running) {
        console.log('🛑 Ciclo detenido por el usuario');
        break;
      }

      const result = await this.processChat(chats[i], i + 1, chats.length);
      results.push(result);

      if (result.success && !result.read) {
        failedCount++;
        if (result.alertSent) {
          alertsCount++;
        }
        this.failedChats.push({
          name: result.name,
          lastCheck: new Date().toLocaleTimeString()
        });
      }

      // Cerrar el chat actual antes de continuar al siguiente
      if (i < chats.length - 1) {
        console.log(`\n⏳ Cerrando chat y esperando antes del siguiente...`);
        await this.closeChat();
        
        // Simular navegación: scroll aleatorio en lista
        if (Math.random() < 0.5) { // 50% de chance
          await this.simulateRandomScroll();
        }
        
        // Esperar variable entre chats (2-5 segundos para parecer más humano)
        const waitTime = getRandomDelay(2000, 5000);
        console.log(`⏳ Esperando ${waitTime}ms antes del siguiente chat...`);
        await this.sleep(waitTime);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMEN DEL CICLO:');
    console.log(`✅ Chats procesados: ${results.length}`);
    console.log(`⚠️ Líneas sin leer: ${failedCount}`);
    console.log(`🚨 Alertas enviadas: ${alertsCount}`);
    console.log(`📋 Próximo ciclo en 10 minutos`);
    console.log('='.repeat(70) + '\n');

    // 🆕 ENVIAR CONFIRMACIÓN DE CICLO COMPLETADO
    if (results.length > 0) {
      console.log('📤 Enviando confirmación de ciclo completado...');
      const confirmationSent = await this.sendCycleConfirmation(results.length);
      if (confirmationSent) {
        console.log('✅ Confirmación recibida por el servidor');
      } else {
        console.log('⚠️ No se pudo enviar la confirmación, continuando...');
      }
    }

    // Actualizar popup
    this.updatePopupStatus(results.length, failedCount);
  },

  /**
   * Actualiza el popup con información
   */
  updatePopupStatus(scanned, unread) {
    const nextRun = new Date(Date.now() + 10 * 60 * 1000).toLocaleTimeString();
    
    chrome.runtime.sendMessage({
      action: 'updateUI',
      scanned: scanned,
      unread: unread,
      failedChats: this.failedChats,
      nextRun: `En 10 min (${nextRun})`
    }).catch((error) => {
      console.error('⚠️ No se pudo enviar mensajes al popup:', error);
    });
  },

  /**
   * Utility: sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Inicia el checker automático
   */
  start() {
    if (this.running) return;
    
    this.running = true;
    this.failedChats = [];
    console.log('🟢 WhatsApp Auto Checker INICIADO');

    // Ejecutar inmediatamente
    this.runCycle();

    // Luego cada 10 minutos (como respaldo, el service worker maneja el main)
    this.checkInterval = setInterval(() => {
      if (this.running) {
        console.log('⏳ Ciclo local (respaldo)');
        this.runCycle();
      }
    }, 10 * 60 * 1000); // 10 minutos
  },

  /**
   * Detiene el checker
   */
  stop() {
    this.running = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    console.log('🔴 WhatsApp Auto Checker DETENIDO');
  }
};

// Escuchar mensajes del popup y service worker
console.log('✅ Content script listo para recibir comandos');

// Verificar que chrome.runtime esté disponible
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 [CONTENT] Mensaje recibido:', message.action);

    if (message.action === 'startWhatsAppChecker') {
      console.log('🚀 [CONTENT] Iniciando checker...');
      whatsappChecker.start();
      sendResponse({ status: 'iniciado' });
    } 
    else if (message.action === 'stopWhatsAppChecker') {
      console.log('🛑 [CONTENT] Deteniendo checker...');
      whatsappChecker.stop();
      sendResponse({ status: 'detenido' });
    }
    else if (message.action === 'runCycleFromAlarm') {
      console.log('⏰ [CONTENT] Ejecutando ciclo desde alarma del Service Worker');
      if (whatsappChecker.running) {
        whatsappChecker.runCycle();
        sendResponse({ status: 'ciclo_ejecutado' });
      } else {
        console.log('⚠️ Checker no está corriendo');
        sendResponse({ status: 'no_corriendo' });
      }
    }
  });
} else {
  console.warn('⚠️ chrome.runtime no disponible - Extension no cargada correctamente');
}
