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

// Obtener timeout adaptativo según la hora (16-18hs es pico)
function getAdaptiveTimeout() {
  const hour = new Date().getHours();
  // Entre 16-18hs aumentar timeouts un 50%
  if (hour >= 16 && hour < 18) {
    console.log('⚠️ Hora pico detectada (16-18hs) - aumentando timeouts');
    return { standard: 7000, send: 5000, close: 2500 };
  }
  return { standard: 5250, send: 3500, close: 1500 };
}

const whatsappChecker = {
  running: false,
  checkInterval: null,
  failedChats: [],
  maxRetries: 3,  // Reintentos máximos
  retryCount: {},  // Contador de reintentos por chat
  lastMessageTime: {}, // Control de throttling por chat
  messageThrottleMs: 45000, // 45 segundos de espera entre mensajes al mismo chat
  processingChats: new Set(), // Chats en proceso para evitar race conditions
  alertCooldown: new Map(), // Cooldown de 5 min entre alertas del mismo chat
  lastCycleTime: 0, // Controlar que no se ejecuten ciclos muy seguidos
  minCycleIntervalMs: 300000, // Mínimo 5 minutos entre ciclos
  isProcessing: false // Flag para evitar ciclos concurrentes

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
   * Verifica que el mensaje se envió correctamente (input limpio)
   */
  async verifyMessageSent() {
    const inputBox = document.querySelector('[data-testid="conversation-compose-box-input"]');
    
    if (!inputBox || !inputBox.textContent || inputBox.textContent.trim() === '') {
      console.log('✅ Mensaje enviado verificado (input limpio)');
      return true;
    } else {
      console.warn('⚠️ El input aún tiene texto - envío posiblemente falló');
      return false;
    }
  },

  /**
   * Detecta si hay un mensaje en borrador
   */
  hasDraft() {
    const inputBox = document.querySelector('[data-testid="conversation-compose-box-input"]');
    return inputBox && inputBox.textContent && inputBox.textContent.trim().length > 0;
  },

  /**
   * Limpia un borrador antes de enviar
   */
  async clearDraft() {
    const inputBox = document.querySelector('[data-testid="conversation-compose-box-input"]');
    if (inputBox && this.hasDraft()) {
      console.log('🗑️ Limpiando borrador anterior...');
      inputBox.textContent = '';
      inputBox.innerText = '';
      
      // Disparar evento para que WhatsApp lo registre
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        composed: true
      });
      inputBox.dispatchEvent(inputEvent);
      
      await this.sleep(getRandomDelay(300, 600));
      return true;
    }
    return false;
  },

  /**
   * Envía el mensaje con reintentos
   */
  async sendMessage(chatName = 'Chat') {
    let attempts = 0;
    const maxAttempts = 3;
    const timeouts = getAdaptiveTimeout();
    
    while (attempts < maxAttempts) {
      try {
        const sendButton = document.querySelector('button[aria-label="Enviar"]');
        
        if (!sendButton) {
          console.warn('❌ No se encontró botón de envío - Intento ' + (attempts + 1));
          attempts++;
          if (attempts < maxAttempts) {
            await this.sleep(getRandomDelay(500, 1000));
          }
          continue;
        }

        console.log(`📤 Enviando mensaje (intento ${attempts + 1}/${maxAttempts})...`);
        sendButton.click();
        
        // Esperar dinámico según hora
        await this.sleep(timeouts.send);
        
        // Verificar que se envió
        const wasSent = await this.verifyMessageSent();
        
        if (wasSent) {
          console.log(`✅ Mensaje enviado exitosamente en intento ${attempts + 1}`);
          return true;
        }
        
        // Si no se envió, reintentar
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`⏳ Reintentando envío (${attempts}/${maxAttempts})...`);
          await this.clearDraft();
          await this.sleep(getRandomDelay(800, 1500));
        }
        
      } catch (error) {
        console.error(`❌ Error en intento ${attempts + 1}:`, error);
        attempts++;
        if (attempts < maxAttempts) {
          await this.sleep(getRandomDelay(1000, 2000));
        }
      }
    }
    
    console.error(`❌ Falló envío después de ${maxAttempts} intentos en ${chatName}`);
    return false;
  },

  /**
   * Cierra el chat actual presionando Escape
   */
  async closeChat() {
    console.log('🔙 Cerrando chat actual...');
    const timeouts = getAdaptiveTimeout();
    
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
    await this.sleep(getRandomDelay(1000, 2000));
    
    // Verificar que el input está realmente cerrado
    let inputBox = document.querySelector('[data-testid="conversation-compose-box-input"]');
    let attempts = 0;
    while (inputBox && attempts < 5) {
      console.log('⏳ Esperando a que el input se cierre...');
      await this.sleep(getRandomDelay(400, 800));
      inputBox = document.querySelector('[data-testid="conversation-compose-box-input"]');
      attempts++;
    }
    
    // Si sigue abierto, forzar Escape adicional
    if (inputBox) {
      console.log('⚠️ Input aún visible, enviando Escape adicional...');
      document.dispatchEvent(event);
      await this.sleep(getRandomDelay(800, 1500));
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
   * Envía alerta al servidor CON REINTENTOS
   */
  async sendAlertToServer(alertData, retryNum = 1) {
    try {
      const endpoint = 'https://accountant-services.co.uk/api/whatsapp-alert';
      const maxRetries = 3;
      
      console.log(`📤 ENVIANDO ALERTA AL SERVIDOR (intento ${retryNum}/${maxRetries}):`);
      console.log('   Tipo:', alertData.type);
      console.log('   Contacto:', alertData.contactName);
      console.log('   Chat ID:', alertData.chatId);
      console.log('   Mensaje:', alertData.lastMessage);
      console.log('   Severidad:', alertData.severity);

      // Timeout adaptativo para el fetch
      const controller = new AbortController();
      const timeoutMs = retryNum === 1 ? 10000 : 15000; // 15s en reintentos
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(alertData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      
      if (!response.ok) {
        console.error(`❌ Error del servidor (${response.status}):`, data);
        
        // Reintentar si no es error de cliente
        if (response.status >= 500 && retryNum < maxRetries) {
          console.log(`⏳ Reintentando alerta (${retryNum}/${maxRetries})...`);
          await this.sleep(getRandomDelay(2000, 4000));
          return this.sendAlertToServer(alertData, retryNum + 1);
        }
        return false;
      }

      console.log('✅ ALERTA ENVIADA EXITOSAMENTE AL SERVIDOR');
      console.log('   Alert ID:', data.alertId);
      console.log('   Es duplicada:', data.isDuplicate);
      console.log('   Mensaje:', data.message);
      
      return data;
    } catch (error) {
      console.error(`❌ Error enviando alerta (intento ${retryNum}):`, error);
      
      // Reintentar en caso de timeout o error de conexión
      if (retryNum < 3) {
        console.log(`⏳ Reintentando alerta (${retryNum}/3) después de fallo...`);
        await this.sleep(getRandomDelay(2000, 5000));
        return this.sendAlertToServer(alertData, retryNum + 1);
      }
      
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
   * Procesa un chat: abre, envía, verifica lectura CON REINTENTOS
   */
  async processChat(chatElement, index, total) {
    const chatName = this.getChatName(chatElement);
    
    // 🛡️ VALIDACIÓN: Verificar throttling por chat
    if (this.lastMessageTime[chatName]) {
      const timeSinceLastMessage = Date.now() - this.lastMessageTime[chatName];
      if (timeSinceLastMessage < this.messageThrottleMs) {
        console.warn(`⏳ ${chatName}: Esperando throttle (${Math.round((this.messageThrottleMs - timeSinceLastMessage) / 1000)}s)`);
        return { 
          name: chatName, 
          success: false, 
          reason: 'Throttle activo - enviado muy recientemente'
        };
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`⚙️ PROCESANDO CHAT ${index}/${total}: ${chatName}`);
    console.log(`${'='.repeat(60)}`);

    try {
      const timeouts = getAdaptiveTimeout();
      
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

      // Detectar y limpiar borradores
      if (this.hasDraft()) {
        console.log('⚠️ Borrador anterior detectado - limpiando...');
        await this.clearDraft();
      }

      // Simular que lee el chat (scroll, espera)
      await this.sleep(getRandomDelay(300, 900));

      // Escribir mensaje aleatorio
      const message = randomMessages[Math.floor(Math.random() * randomMessages.length)];
      const written = await this.writeMessage(message);
      
      if (!written) {
        console.error(`❌ No se pudo escribir en ${chatName}`);
        await this.closeChat();
        return { name: chatName, success: false, reason: 'No se pudo escribir' };
      }

      // Pausa antes de enviar (como si revisara el mensaje)
      await this.sleep(getRandomDelay(300, 800));

      // Enviar CON REINTENTOS
      const sent = await this.sendMessage(chatName);
      if (!sent) {
        console.error(`❌ No se pudo enviar en ${chatName} - guardando como fallo`);
        await this.closeChat();
        
        // Guardar intento fallido
        const failKey = `${chatId}_${new Date().toISOString()}`;
        this.retryCount[failKey] = (this.retryCount[failKey] || 0) + 1;
        
        return { 
          name: chatName, 
          success: false, 
          reason: 'No se pudo enviar después de reintentos',
          chatId: chatId
        };
      }
      
      // 📝 REGISTRAR TIEMPO DE ENVÍO para throttling
      this.lastMessageTime[chatName] = Date.now();
      console.log(`🕐 Tiempo de envío registrado para throttling (45s de espera)`);

      // Esperar bien a que se registre el envío en WhatsApp
      console.log('⏳ Esperando confirmación del envío...');
      await this.sleep(timeouts.standard);

      console.log(`📤 Mensaje enviado: "${message}" → ${chatName} (${chatId})`);

      // Esperar a verificar lectura (máximo 30 segundos, pero se para si se lee antes)
      console.log('⏳ Verificando lectura/entrega en tiempo real...');
      let isRead = false;
      let hasSingleCheck = false;
      let alertSent = false;
      const maxWaitTime = 30000; // 30 segundos máximo
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
              await this.closeChat();
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
          await this.closeChat();
          return { name: chatName, success: true, read: true, chatId: chatId };
        }
      }

      // Si no se leyó después de esperar, registrar pero continuar
      console.log(`⚠️ ${chatName} - MENSAJE NO VERIFICADO (tiempo agotado) - ${chatId} - Continuando...`);
      await this.closeChat();
      return { name: chatName, success: true, read: false, registered: true, chatId: chatId };

    } catch (error) {
      console.error(`❌ Error procesando ${chatName}:`, error);
      await this.closeChat().catch(e => console.error('Error cerrando:', e));
      return { name: chatName, success: false, reason: error.message };
    }
  },

  /**
   * Ejecuta el ciclo completo CON MANEJO ROBUSTO DE ERRORES
   */
  async runCycle() {
    // 🛡️ PROTECCIÓN 1: Evitar ciclos concurrentes
    if (this.isProcessing) {
      console.warn('⚠️ Ciclo anterior aún en proceso - ignorando duplicado');
      return;
    }
    
    // 🛡️ PROTECCIÓN 2: Validar intervalo mínimo entre ciclos
    const now = Date.now();
    const timeSinceLastCycle = now - this.lastCycleTime;
    if (this.lastCycleTime > 0 && timeSinceLastCycle < this.minCycleIntervalMs) {
      console.warn(`⚠️ Ciclo demasiado pronto (${timeSinceLastCycle / 1000}s). Esperando hasta 5 minutos.`);
      return;
    }
    
    this.isProcessing = true;
    this.lastCycleTime = now;

    console.log('\n\n' + '='.repeat(70));
    console.log('🌀 INICIANDO NUEVO CICLO DE VERIFICACIÓN');
    console.log(`⏰ Hora: ${new Date().toLocaleTimeString()}`);
    const timeouts = getAdaptiveTimeout();
    console.log(`⏱️ Timeouts adaptativos: standard=${timeouts.standard}ms, send=${timeouts.send}ms`);
    console.log('='.repeat(70));

    const chats = this.getChatsFromList();
    if (chats.length === 0) {
      console.warn('⚠️ No se encontraron chats. Abre WhatsApp y asegúrate de que cargue la lista.');
      this.isProcessing = false;
      return;
    }

    const results = [];
    let successCount = 0;
    let failedCount = 0;
    let alertsCount = 0;
    let retryCount = 0;

    // Procesar cada chat
    for (let i = 0; i < chats.length; i++) {
      if (!this.running) {
        console.log('🛑 Ciclo detenido por el usuario');
        break;
      }

      const result = await this.processChat(chats[i], i + 1, chats.length);
      results.push(result);

      if (result.success) {
        successCount++;
        if (!result.read) {
          failedCount++;
          if (result.alertSent) {
            alertsCount++;
          }
          this.failedChats.push({
            name: result.name,
            lastCheck: new Date().toLocaleTimeString(),
            chatId: result.chatId
          });
        }
      } else {
        retryCount++;
      }

      // Cerrar el chat actual antes de continuar al siguiente
      if (i < chats.length - 1) {
        console.log(`\n⏳ Espera entre chats...`);
        
        // Simular navegación: scroll aleatorio en lista
        if (Math.random() < 0.5) { // 50% de chance
          await this.simulateRandomScroll();
        }
        
        // Esperar variable entre chats (con timeouts adaptativos)
        const waitTime = getRandomDelay(2500, 5500);
        console.log(`⏳ Esperando ${waitTime}ms antes del siguiente chat...`);
        await this.sleep(waitTime);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMEN DEL CICLO:');
    console.log(`✅ Chats exitosos: ${successCount}/${chats.length}`);
    console.log(`⚠️ Líneas sin respuesta: ${failedCount}`);
    console.log(`🚨 Alertas enviadas al servidor: ${alertsCount}`);
    console.log(`❌ Chats con errores (reintentos necesarios): ${retryCount}`);
    
    // Mostrar detalles de chats que necesitan atención
    if (this.failedChats.length > 0) {
      console.log(`\n📋 Chats sin leer (requieren validación manual):`);
      this.failedChats.slice(-5).forEach(chat => {
        console.log(`   - ${chat.name} (${chat.chatId}) - Último check: ${chat.lastCheck}`);
      });
    }
    
    // 🧹 LIMPIEZA: Limpiar datos antiguos para evitar memory leak
    this.cleanupOldData();
    
    console.log(`📋 Próximo ciclo en 10 minutos`);
    console.log('='.repeat(70) + '\n');

    // Actualizar popup
    this.updatePopupStatus(successCount, failedCount, alertsCount);
    
    // 🛡️ FIN: Marcar como completado
    this.isProcessing = false;
  },

  /**
   * Actualiza el popup con información detallada
   */
  updatePopupStatus(scanned, unread, alerts = 0) {
    const nextRun = new Date(Date.now() + 10 * 60 * 1000).toLocaleTimeString();
    
    chrome.runtime.sendMessage({
      action: 'updateUI',
      scanned: scanned,
      unread: unread,
      alerts: alerts,
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
   * Limpiar datos antiguos cada ciclo para evitar memory leak
   */
  cleanupOldData() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    
    // Limpiar lastMessageTime de entradas muy antiguas
    for (const [key, time] of Object.entries(this.lastMessageTime)) {
      if (now - time > maxAge) {
        delete this.lastMessageTime[key];
      }
    }
    
    // Limpiar retryCount de entradas muy antiguas
    for (const [key, count] of Object.entries(this.retryCount)) {
      if (now - parseInt(key.split('_')[1]) > maxAge) {
        delete this.retryCount[key];
      }
    }
    
    // Mantener solo los últimos 10 chats fallidos
    if (this.failedChats.length > 10) {
      this.failedChats = this.failedChats.slice(-10);
    }
    
    console.log('🧹 Datos antiguos limpiados del memory');
  },

  /**
   * Inicia el checker automático
   */
  start() {
    if (this.running) return;
    
    this.running = true;
    this.failedChats = [];
    this.lastCycleTime = 0; // Resetear tiempo del último ciclo
    this.isProcessing = false; // Resetear flag de procesamiento
    console.log('🟢 WhatsApp Auto Checker INICIADO');

    // ❌ NO EJECUTAR CICLO AQUÍ - El service worker maneja todo
    // Solo nos subscribimos a sus mensajes
    console.log('⏳ Esperando comando del Service Worker para ejecutar ciclo...');
  },

  /**
   * Detiene el checker
   */
  stop() {
    this.running = false;
    this.isProcessing = false; // Cancelar procesamiento actual si hay
    
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
