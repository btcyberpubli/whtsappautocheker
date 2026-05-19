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
  keepAliveInterval: null, // 💪 Intervalo de keep-alive continuo
  failedChats: [],
  maxRetries: 3,  // Reintentos máximos
  retryCount: {},  // Contador de reintentos por chat
  lastMessageTime: {}, // Control de throttling por chat
  messageThrottleMs: 45000, // 45 segundos de espera entre mensajes al mismo chat
  processingChats: new Set(), // Chats en proceso para evitar race conditions
  alertCooldown: new Map(), // Cooldown de 5 min entre alertas del mismo chat
  lastCycleTime: 0, // Controlar que no se ejecuten ciclos muy seguidos
  minCycleIntervalMs: 300000, // Mínimo 5 minutos entre ciclos
  isProcessing: false, // Flag para evitar ciclos concurrentes
  windowHasFocus: true, // Detectar si la ventana está en focus
  heartbeatCount: 0, // Contador de heartbeats recibidos
  lastHeartbeatTime: 0, // Timestamp del último heartbeat

  /**
   * Espera a que la ventana vuelva a estar en focus
   */
  async waitForWindowFocus() {
    if (document.hasFocus()) {
      return; // Ventana ya está en focus
    }

    console.log('⚠️ VENTANA EN BACKGROUND - Esperando que vuelva a focus...');
    
    return new Promise((resolve) => {
      const focusHandler = () => {
        console.log('✅ ¡Ventana activa nuevamente! Reanudando operaciones...');
        window.removeEventListener('focus', focusHandler);
        this.windowHasFocus = true;
        resolve();
      };

      window.addEventListener('focus', focusHandler);
      this.windowHasFocus = false;

      // Timeout de 30 segundos para no esperar eternamente
      setTimeout(() => {
        console.log('⏱️ Timeout esperando focus (30s) - continuando de todas formas');
        window.removeEventListener('focus', focusHandler);
        resolve();
      }, 30000);
    });
  },

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
      
      // Intentos múltiples para abrir el chat (importante en background)
      const maxAttempts = 4;
      let attempt = 0;
      let inputBox = null;
      
      while (!inputBox && attempt < maxAttempts) {
        // ESTRATEGIA 1: Click con eventos realistas
        if (attempt === 0) {
          console.log(`🎯 Estrategia 1: Click en role="row" con eventos del mouse...`);
          this.simulateRealClick(chatElement);
          await this.sleep(4000); // Más tiempo en background
        }
        
        // ESTRATEGIA 2: Click en tabindex="0"
        if (attempt === 1) {
          const tabbableElement = chatElement.querySelector('[tabindex="0"]');
          if (tabbableElement) {
            console.log(`🎯 Estrategia 2: Click en [tabindex="0"]...`);
            tabbableElement.focus();
            await this.sleep(500);
            this.simulateRealClick(tabbableElement);
            await this.sleep(4000);
          }
        }
        
        // ESTRATEGIA 3: Double-click
        if (attempt === 2) {
          console.log(`🎯 Estrategia 3: Double-click en chatElement...`);
          const dblClickEvent = new MouseEvent('dblclick', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          chatElement.dispatchEvent(dblClickEvent);
          await this.sleep(4000);
        }
        
        // ESTRATEGIA 4: Keyboard navigation (Enter key)
        if (attempt === 3) {
          console.log(`🎯 Estrategia 4: Keyboard navigation (Enter)...`);
          chatElement.focus();
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          });
          chatElement.dispatchEvent(enterEvent);
          await this.sleep(4000);
        }
        
        // Verificar si se abrió
        inputBox = document.querySelector('[data-testid="conversation-compose-box-input"]');
        if (inputBox) {
          console.log('✅ Chat abierto correctamente');
          return true;
        }
        
        attempt++;
        if (attempt < maxAttempts) {
          console.log(`⏳ Intento ${attempt}/${maxAttempts} fallido, reintentando...`);
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
    
    // ESTRATEGIA MEJORADA: Escribir con delay entre caracteres usando keys
    for (let i = 0; i < message.length; i++) {
      const char = message[i];
      
      // Simular velocidad de tipeo variable (40-120ms por carácter)
      const typeSpeed = getRandomDelay(40, 120);
      await this.sleep(typeSpeed);
      
      // Usar execCommand para insertar el carácter de forma nativa
      // Esto asegura que WhatsApp procese el evento correctamente
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(inputBox);
      range.collapse(false); // Colapsar al final
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Insertar el carácter
      document.execCommand('insertText', false, char);
      
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
   * Busca NUESTRO último mensaje enviado (el que acabamos de mandar)
   * Estrategia mejorada para funcionar en BACKGROUND
   */
  getOurLastMessage() {
    try {
      // MÉTODO 0: Buscar explícitamente por mensaje con timestamp reciente
      // (Mejor para background - busca por estructura visual)
      const recentMessages = document.querySelectorAll('div[data-testid*="msg"]');
      for (let i = recentMessages.length - 1; i >= Math.max(0, recentMessages.length - 5); i--) {
        const msg = recentMessages[i];
        if (msg.offsetHeight > 0 && msg.textContent.trim().length > 0) {
          // Verificar que tenga marca de tiempo
          if (msg.innerHTML.includes(':') && msg.innerHTML.match(/\d{1,2}:\d{2}/)) {
            return msg;
          }
        }
      }

      // MÉTODO 1: Buscar por div con role="row" - más específico para background
      const messageRows = document.querySelectorAll('div[role="row"][data-testid*="msg"], div[data-testid*="msg-container"]');
      
      if (messageRows.length > 0) {
        // Iterar desde el final hacia atrás
        for (let i = messageRows.length - 1; i >= 0; i--) {
          const row = messageRows[i];
          
          // Verificar que tiene contenido visible
          if (row.offsetHeight > 0 && row.textContent.trim().length > 0) {
            return row;
          }
        }
      }
      
      // MÉTODO 2: Buscar en scrollable message area (más específico)
      const messageArea = document.querySelector('div[data-testid="conversation-panel-messages"] div[role="row"]:last-child');
      if (messageArea && messageArea.textContent.trim().length > 0) {
        return messageArea;
      }
      
      // MÉTODO 3: Buscar por estructura visual - último div grande con texto
      const allDivs = document.querySelectorAll('div');
      let lastMessageDiv = null;
      let lastPos = -1;
      
      for (let div of allDivs) {
        const ariaLabel = div.getAttribute('aria-label') || '';
        const dataTestId = div.getAttribute('data-testid') || '';
        
        // Si tiene aria-label con hora/timestamp, probablemente es un mensaje
        if (ariaLabel.match(/\d{1,2}:\d{2}/) && div.offsetHeight > 20) {
          lastMessageDiv = div;
          lastPos = Array.from(allDivs).indexOf(div);
        }
      }
      
      if (lastMessageDiv && lastPos > -1) {
        return lastMessageDiv;
      }
      
      // MÉTODO 4: Búsqueda por jerarquía (último texto largo visible)
      const bodyDivs = document.body.querySelectorAll('div[style*="right"]');
      for (let i = bodyDivs.length - 1; i >= 0; i--) {
        if (bodyDivs[i].offsetHeight > 30 && bodyDivs[i].textContent.trim().length > 2) {
          return bodyDivs[i];
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error buscando nuestro mensaje:', error);
      return null;
    }
  },

  /**
   * Obtiene el estado del icono de nuestro mensaje (undefined/single/double)
   * Mejorado para funcionar en BACKGROUND
   */
  getOurMessageStatus() {
    const ourMsg = this.getOurLastMessage();
    if (!ourMsg) {
      console.log('⚠️ No se encontró nuestro mensaje');
      return 'not_found';
    }

    // Debug: mostrar el HTML para diagnosticar
    const html = ourMsg.outerHTML;
    const textContent = ourMsg.textContent;
    
    console.log(`🔍 DEBUG: Buscando estado en elemento con contenido: "${textContent.substring(0, 50)}"...`);

    // MÉTODO 0: Buscar en textContent por "dblcheck" o "double"
    if (textContent.includes('dblcheck') || textContent.includes('double')) {
      console.log(`✅ Nuestro mensaje: DOBLE TILDE (detectado en textContent)`);
      return 'double';
    }
    
    // Si contiene "check" sin "dbl" es single
    if (textContent.includes('check') && !textContent.includes('dbl')) {
      console.log(`⚠️ Nuestro mensaje: SINGLE TILDE (detectado en textContent)`);
      return 'single';
    }

    // MÉTODO 1: Buscar SVG con análisis de paths
    const allSvgs = ourMsg.querySelectorAll('svg');
    for (let svg of allSvgs) {
      const paths = svg.querySelectorAll('path');
      const pathCount = paths.length;
      const svgHtml = svg.outerHTML;
      
      // Debug: mostrar estructura del SVG
      console.log(`   🔎 SVG encontrado con ${pathCount} path(s). HTML: ${svgHtml.substring(0, 100)}...`);
      
      if (svgHtml.includes('check')) {
        // Doble tilde típicamente tiene 2 paths (uno para cada checkmark)
        // Single tilde tiene 1 path
        if (pathCount >= 2) {
          console.log(`✅ Nuestro mensaje: DOBLE TILDE (${pathCount} paths detectados)`);
          return 'double';
        } else if (pathCount === 1) {
          console.log(`⚠️ Nuestro mensaje: SINGLE TILDE (${pathCount} path detectado)`);
          return 'single';
        }
      }
    }

    // MÉTODO 2: Buscar por clases que contengan "double" o "double-check"
    const allElements = ourMsg.querySelectorAll('[class*="check"], [class*="status"], [class*="icon"]');
    for (let elem of allElements) {
      const classes = elem.className;
      
      if (typeof classes === 'string') {
        if (classes.includes('double') || classes.includes('dblcheck') || classes.includes('double-check')) {
          console.log(`✅ Nuestro mensaje: DOBLE TILDE (clase: ${classes})`);
          return 'double';
        }
        
        if (classes.includes('single-check') || (classes.includes('check') && !classes.includes('double'))) {
          console.log(`⚠️ Nuestro mensaje: SINGLE TILDE (clase: ${classes})`);
          return 'single';
        }
      }
    }

    // MÉTODO 3: Buscar por aria-label que indique estado
    const elementsWithAria = ourMsg.querySelectorAll('[aria-label*="check"], [aria-label*="entregado"], [aria-label*="leído"], [aria-label*="read"]');
    for (let elem of elementsWithAria) {
      const ariaLabel = elem.getAttribute('aria-label') || '';
      
      if (ariaLabel.includes('leído') || ariaLabel.includes('read') || ariaLabel.includes('double')) {
        console.log(`✅ Nuestro mensaje: DOBLE TILDE (aria-label: ${ariaLabel})`);
        return 'double';
      }
      
      if (ariaLabel.includes('entregado') || ariaLabel.includes('delivered') || ariaLabel.includes('single')) {
        console.log(`⚠️ Nuestro mensaje: SINGLE TILDE (aria-label: ${ariaLabel})`);
        return 'single';
      }
    }

    // MÉTODO 4: Buscar por data-icon específicamente
    let dblCheckIcon = ourMsg.querySelector('[data-icon*="dblcheck"], [data-icon*="double"], [data-icon*="read"]');
    let singleCheckIcon = ourMsg.querySelector('[data-icon*="check"]:not([data-icon*="double"])');

    if (dblCheckIcon) {
      console.log(`✅ Nuestro mensaje: DOBLE TILDE (data-icon)`);
      return 'double';
    } else if (singleCheckIcon) {
      console.log(`⚠️ Nuestro mensaje: SINGLE TILDE (data-icon)`);
      return 'single';
    }

    // MÉTODO 5: Análisis exhaustivo de HTML bruto
    if (html.match(/checkmark|dblcheck|double/i)) {
      const doubleMatch = html.match(/double|dblcheck/gi);
      if (doubleMatch && doubleMatch.length > 0) {
        console.log(`✅ Nuestro mensaje: DOBLE TILDE (HTML pattern)`);
        return 'double';
      }
    }

    // MÉTODO 6: Buscar imágenes de checkmark
    const imgs = ourMsg.querySelectorAll('img[src*="check"], img[alt*="check"]');
    if (imgs.length >= 2) {
      console.log(`✅ Nuestro mensaje: DOBLE TILDE (${imgs.length} imágenes de check)`);
      return 'double';
    } else if (imgs.length === 1) {
      console.log(`⚠️ Nuestro mensaje: SINGLE TILDE (1 imagen de check)`);
      return 'single';
    }

    // MÉTODO 7: Último recurso - buscar en todos los descendientes
    const allDescendants = ourMsg.querySelectorAll('*');
    let foundDouble = false;
    let foundSingle = false;

    for (let desc of allDescendants) {
      const descClass = desc.className;
      const descAttr = desc.getAttribute('data-icon') || '';
      const descAria = desc.getAttribute('aria-label') || '';

      if (descClass.includes('double') || descAttr.includes('double') || descAria.includes('double')) {
        foundDouble = true;
        break;
      }

      if ((descClass.includes('check') && !descClass.includes('double')) || 
          (descAttr.includes('check') && !descAttr.includes('double'))) {
        foundSingle = true;
      }
    }

    if (foundDouble) {
      console.log(`✅ Nuestro mensaje: DOBLE TILDE (descendientes)`);
      return 'double';
    } else if (foundSingle) {
      console.log(`⚠️ Nuestro mensaje: SINGLE TILDE (descendientes)`);
      return 'single';
    }

    console.log('⏳ Nuestro mensaje: SIN TILDE (en proceso)');
    return 'none';
  },

  /**
   * Verifica lectura en modo progresivo (2s, +5s, +10s)
   */
  async checkDeliveryProgressive(chatName, chatId, message) {
    console.log(`\n📊 VERIFICACIÓN PROGRESIVA DE ENTREGA para ${chatName}:`);
    
    // FASE 1: Esperar 2 segundos y verificar
    console.log('⏱️ FASE 1: Esperando 2 segundos...');
    await this.sleep(2000);
    
    let status = this.getOurMessageStatus();
    console.log(`   Estado: ${status}`);
    
    // Debug: mostrar elemento encontrado
    const msg = this.getOurLastMessage();
    if (msg) {
      console.log(`   Elemento encontrado: ${msg.tagName} con clases: ${msg.className}`);
      console.log(`   Contenido: ${msg.textContent.substring(0, 50)}...`);
    } else {
      console.log('   ⚠️ Elemento de mensaje NO ENCONTRADO en DOM');
    }
    
    if (status === 'double') {
      console.log(`✅ LÍNEA ACTIVA - Mensaje entregado en fase 1`);
      return { read: true, alertSent: false };
    }
    
    if (status === 'single') {
      console.log(`🚨 LÍNEA CAÍDA - Solo un tilde (mensaje NO entregado). Enviando alerta...`);
      
      const alertData = {
        type: "whatsapp-downline",
        contactName: chatName || "Desconocido",
        chatId: chatId || "unknown@c.us",
        lastMessage: message || "Mensaje de prueba",
        detectedAt: new Date().toISOString(),
        severity: "high",
        source: "whatsapp-extension",
        reason: "Single tick - message sent but not delivered"
      };

      const serverResponse = await this.sendAlertToServer(alertData);
      
      if (serverResponse && serverResponse.alertId) {
        console.log(`✅ Alerta enviada por single tilde - ID: ${serverResponse.alertId}`);
        return { read: false, alertSent: true, reason: 'single_tick' };
      } else {
        console.log(`❌ Error enviando alerta por single tilde`);
        return { read: false, alertSent: false, reason: 'single_tick_error' };
      }
    }
    
    // Tratar 'none' (sin tilde) y 'not_found' igual - esperar a que aparezca
    if (status === 'none' || status === 'not_found') {
      // FASE 2: Esperar 5 segundos más (total 7s) y verificar nuevamente
      const statusMsg = status === 'none' ? 'Icono de entrega aún no visible' : 'Mensaje no encontrado';
      console.log(`⏱️ FASE 2: ${statusMsg}. Esperando 5 segundos más...`);
      await this.sleep(5000);
      
      status = this.getOurMessageStatus();
      console.log(`   Estado: ${status}`);
      
      if (status === 'double') {
        console.log(`✅ LÍNEA ACTIVA - Mensaje entregado en fase 2`);
        return { read: true, alertSent: false };
      }
      
      if (status === 'single') {
        console.log(`🚨 LÍNEA CAÍDA (FASE 2) - Single tilde después de 7 segundos. Enviando alerta...`);
        
        const alertData = {
          type: "whatsapp-downline",
          contactName: chatName || "Desconocido",
          chatId: chatId || "unknown@c.us",
          lastMessage: message || "Mensaje de prueba",
          detectedAt: new Date().toISOString(),
          severity: "high",
          source: "whatsapp-extension",
          reason: "Single tick after 7s - message not delivered"
        };

        const serverResponse = await this.sendAlertToServer(alertData);
        
        if (serverResponse && serverResponse.alertId) {
          console.log(`✅ Alerta enviada (FASE 2) - ID: ${serverResponse.alertId}`);
          return { read: false, alertSent: true, reason: 'single_tick_phase2' };
        }
        return { read: false, alertSent: false, reason: 'single_tick_phase2_error' };
      }
      
      if (status === 'none' || status === 'not_found') {
        // FASE 3: Esperar 10 segundos más (total 17s) verificación final
        console.log('⏱️ FASE 3: Sigue problemático. Esperando 10 segundos más (total 17s)...');
        await this.sleep(10000);
        
        status = this.getOurMessageStatus();
        console.log(`   Estado FINAL: ${status}`);
        
        // Si ahora aparece
        if (status === 'double') {
          console.log(`✅ LÍNEA ACTIVA - Mensaje finalmente entregado`);
          return { read: true, alertSent: false };
        }
        
        if (status === 'single') {
          console.log(`🚨 LÍNEA CAÍDA (FASE 3) - Single tilde después de 17 segundos. Enviando alerta...`);
          
          const alertData = {
            type: "whatsapp-downline",
            contactName: chatName || "Desconocido",
            chatId: chatId || "unknown@c.us",
            lastMessage: message || "Mensaje de prueba",
            detectedAt: new Date().toISOString(),
            severity: "high",
            source: "whatsapp-extension",
            reason: "Single tick after 17s - message not delivered"
          };

          const serverResponse = await this.sendAlertToServer(alertData);
          
          if (serverResponse && serverResponse.alertId) {
            console.log(`✅ Alerta enviada (FASE 3) - ID: ${serverResponse.alertId}`);
            return { read: false, alertSent: true, reason: 'single_tick_phase3' };
          }
          return { read: false, alertSent: false, reason: 'single_tick_phase3_error' };
        }
        
        // Si sigue sin tilde después de 17 segundos = ALERTA
        if (status === 'none' || status === 'not_found') {
          const alertReason = status === 'not_found' 
            ? 'Mensaje no encontrado después de 17 segundos'
            : 'Mensaje sin confirmación de entrega después de 17 segundos';
          console.log(`🚨 ALERTA DEFINITIVA: ${alertReason}`);
          
          const alertData = {
            type: "whatsapp-downline",
            contactName: chatName || "Desconocido",
            chatId: chatId || "unknown@c.us",
            lastMessage: message || "Mensaje de prueba",
            detectedAt: new Date().toISOString(),
            severity: "high",
            source: "whatsapp-extension"
          };

          const serverResponse = await this.sendAlertToServer(alertData);
          
          if (serverResponse && serverResponse.alertId) {
            console.log(`✅ Alerta enviada - ID: ${serverResponse.alertId}`);
            
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
            
            return { read: false, alertSent: true };
          }
          
          return { read: false, alertSent: false };
        } else if (status === 'double') {
          console.log(`✅ LÍNEA ACTIVA - Entregado finalmente en fase 3`);
          return { read: true, alertSent: false };
        }
      }
    }
    
    return { read: false, alertSent: false };
  },

  /**
   * Verifica si el mensaje tiene un solo checkmark (enviado pero NO entregado)
   */
  checkSingleCheck() {
    // 🔍 BÚSQUEDA AGRESIVA: Revisar TODOS los iconos de estado disponibles
    
    // MÉTODO 1: Buscar en todos los SVG con data-icon (más exhaustivo)
    const allSvgs = document.querySelectorAll('svg[data-icon]');
    if (allSvgs.length > 0) {
      // Invertir para buscar desde el más reciente (último enviado)
      for (let i = allSvgs.length - 1; i >= 0; i--) {
        const svg = allSvgs[i];
        const icon = svg.getAttribute('data-icon');
        
        // Si encontramos un status-check, verificar que NO sea status-dblcheck
        if (icon === 'status-check') {
          // Mirar el siguiente para asegurarse de que no haya doble tilde
          const nextSvg = allSvgs[i + 1];
          const nextIcon = nextSvg ? nextSvg.getAttribute('data-icon') : null;
          
          if (nextIcon !== 'status-dblcheck') {
            console.log('⚠️ Mensaje con SINGLE CHECK (enviado, no entregado) - DETECTADO');
            return true;
          }
        }
      }
    }
    
    // MÉTODO 2: Buscar por data-testid de mensaje (alternativo)
    const messageContainers = document.querySelectorAll('[data-testid="message-container"], [role="img"][data-testid*="msg"]');
    if (messageContainers.length > 0) {
      // Mirar el último mensaje
      const lastMsg = messageContainers[messageContainers.length - 1];
      const singleCheckIcon = lastMsg.querySelector('[data-icon="status-check"]');
      const dblCheckIcon = lastMsg.querySelector('[data-icon="status-dblcheck"]');
      
      if (singleCheckIcon && !dblCheckIcon) {
        console.log('⚠️ Mensaje con SINGLE CHECK - Detectado en contenedor');
        return true;
      }
    }
    
    // MÉTODO 3: Buscar en el span de tiempo más reciente (confiable)
    const timeSpans = document.querySelectorAll('[data-testid="msg-time"]');
    if (timeSpans.length > 0) {
      const lastTimeSpan = timeSpans[timeSpans.length - 1];
      const container = lastTimeSpan.closest('[role="link"], [role="gridcell"], div');
      
      if (container) {
        // Buscar todos los SVGs dentro del contenedor
        const containerSvgs = container.querySelectorAll('svg[data-icon]');
        for (let svg of containerSvgs) {
          if (svg.getAttribute('data-icon') === 'status-check') {
            console.log('⚠️ Mensaje con SINGLE CHECK - Detectado por timestamp');
            return true;
          }
        }
      }
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

      // 🆕 VERIFICACIÓN PROGRESIVA: 2s + 5s + 10s (total 17s máximo)
      const deliveryResult = await this.checkDeliveryProgressive(chatName, chatId, message);
      
      if (deliveryResult.alertSent) {
        // Alerta enviada - línea caída detectada
        console.log(`🚨 ${chatName} - LÍNEA CAÍDA (alerta enviada) - ${chatId}`);
        await this.closeChat();
        return { 
          name: chatName, 
          success: true, 
          read: false, 
          alertSent: true,
          reason: 'Single check persistente - No llega',
          chatId: chatId
        };
      } else if (deliveryResult.read) {
        // Doble tilde - línea activa
        console.log(`✅ ${chatName} - LÍNEA ACTIVA (entregado) - ${chatId}`);
        await this.closeChat();
        return { name: chatName, success: true, read: true, chatId: chatId };
      } else {
        // No se pudo determinar - timeout o sin tilde
        console.log(`⚠️ ${chatName} - ESTADO INDEFINIDO (posible error en detección) - ${chatId}`);
        await this.closeChat();
        return { name: chatName, success: true, read: false, registered: true, chatId: chatId };
      }

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
        
        // Esperar variable entre chats (10s a 15s aleatorios)
        const waitTime = getRandomDelay(10000, 15000);
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

    // � CREAR PUERTO PERSISTENTE CON SERVICE WORKER
    try {
      const port = chrome.runtime.connect({ name: 'whatsapp-checker-port' });
      console.log('🔌 [CONTENT] Conectando puerto persistente con Service Worker...');
      
      port.onMessage.addListener((message) => {
        if (message.action === 'heartbeat') {
          console.log(`💓 [CONTENT PORT] Heartbeat recibido - ejecutando keep-alive...`);
          this.keepAlive();
          port.postMessage({ action: 'heartbeatAck', timestamp: Date.now() });
        } else if (message.action === 'pong') {
          console.log(`🏓 [CONTENT PORT] Pong del Service Worker recibido`);
        }
      });
      
      port.onDisconnect.addListener(() => {
        console.log('⚠️ [CONTENT] Puerto desconectado, intentando reconectar en 3s...');
        setTimeout(() => {
          this.start(); // Intentar reconectar
        }, 3000);
      });
      
      // Enviar ping inicial
      port.postMessage({ action: 'ping', timestamp: Date.now() });
    } catch (error) {
      console.warn('⚠️ Error al conectar puerto persistente:', error);
    }

    // 🔔 Listeners para detectar focus de ventana
    window.addEventListener('focus', () => {
      this.windowHasFocus = true;
      console.log('✅ ¡VENTANA ACTIVA! - Reanudando operaciones...');
    });

    window.addEventListener('blur', () => {
      this.windowHasFocus = false;
      console.log('⚠️ ¡VENTANA MINIMIZADA/EN BACKGROUND! - Keep-alive continuo mantendrá viva la conexión...');
    });

    // 💪 INICIAR KEEP-ALIVE CONTINUO (cada 2 segundos para máxima efectividad)
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
    this.keepAliveInterval = setInterval(() => {
      this.keepAlive();
    }, 2000); // Cada 2 segundos (más frecuente)
    console.log('💪 Keep-alive continuo iniciado (cada 2s)');

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
    
    // 💪 Detener keep-alive continuo
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
      console.log('🛑 Keep-alive continuo detenido');
    }
    
    console.log('🔴 WhatsApp Auto Checker DETENIDO');
  },

  /**
   * 💪 Keep-alive: Mantiene el content script y la pestaña activos
   * Ejecuta actividades múltiples para prevenir que Chrome suspenda la pestaña
   */
  keepAlive() {
    try {
      // 1. Acceso agresivo a DOM (fuerza evaluación)
      const elements = document.querySelectorAll('*').length;
      const body = document.body.offsetHeight;
      const scrollH = window.scrollY;
      
      // 2. Simular eventos del usuario
      const event = new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: Math.random() * window.innerWidth,
        clientY: Math.random() * window.innerHeight
      });
      document.dispatchEvent(event);

      // 3. Pequeño scroll para mantener animaciones del navegador
      window.scrollBy(0, 1);
      window.scrollBy(0, -1);

      // 4. Acceso a storage (Chrome sabe que el script está activo)
      try {
        const stored = localStorage.getItem('__keepalive__');
        localStorage.setItem('__keepalive__', Date.now().toString());
      } catch (e) {
        // Si localStorage no está disponible, ignorar
      }

      // 5. Trigger de mutation en el DOM (Chrome detecta actividad)
      const dummy = document.createElement('div');
      document.body.appendChild(dummy);
      dummy.style.display = 'none';
      document.body.removeChild(dummy);

      // 6. Update de timestamp en memoria
      this.lastHeartbeatTime = Date.now();

      // 7. Crear un pequeño setTimeout para que Chrome vea actividad async
      setTimeout(() => {
        try {
          const _ = window.innerWidth;
        } catch (e) {}
      }, 100);

      console.log('💪 Keep-alive ejecutado - Content script activo');
    } catch (error) {
      console.warn('⚠️ Error en keep-alive:', error);
    }
  }
};

// Escuchar mensajes del popup y service worker
console.log('✅ Content script listo para recibir comandos');

// Verificar que chrome.runtime esté disponible
console.log('DEBUG: Verificando chrome.runtime...');
console.log('typeof chrome:', typeof chrome);
console.log('chrome.runtime disponible:', chrome && chrome.runtime ? 'SÍ' : 'NO');

if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.log('DEBUG: Registrando message listener...');
  try {
    const listener = (message, sender, sendResponse) => {
      console.log('📨 [CONTENT] Mensaje recibido:', message);
      console.log('📨 [CONTENT] Action:', message.action);
      
      try {
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
          // 🛡️ VERIFICACIÓN: Sincronizar con storage (el estado verdadero)
          chrome.storage.local.get('whatsappAutoRunning', (result) => {
            if (result.whatsappAutoRunning) {
              // Asegurar que running esté en true
              whatsappChecker.running = true;
              console.log('✅ Estado sincronizado: running = true');
              
              // Ejecutar ciclo
              whatsappChecker.runCycle();
              sendResponse({ status: 'ciclo_ejecutado' });
            } else {
              console.log('⚠️ Auto-checker está desactivado en storage, ignorando ciclo');
              sendResponse({ status: 'no_corriendo' });
            }
          });
        }
        else if (message.action === 'heartbeat') {
          // ❤️ Heartbeat del Service Worker para mantener el content script despierto
          whatsappChecker.heartbeatCount++;
          console.log(`💓 [CONTENT MSG] Heartbeat #${whatsappChecker.heartbeatCount} - respondiendo...`);
          
          // Ejecutar actividad para mantener la pestaña "viva"
          whatsappChecker.keepAlive();
          
          chrome.runtime.sendMessage({
            action: 'heartbeatResponse'
          }).catch(() => {
            console.warn('⚠️ Error respondiendo al heartbeat');
          });
          sendResponse({ status: 'heartbeat_ok', count: whatsappChecker.heartbeatCount });
        }
        else if (message.action === 'reconnect') {
          console.log('🔄 [CONTENT] Solicitud de reconexión recibida');
          whatsappChecker.start(); // Reintentar conexión del puerto
          sendResponse({ status: 'reconnecting' });
        }
        else {
          console.warn('⚠️ Acción desconocida:', message.action);
          sendResponse({ status: 'unknown_action' });
        }
      } catch (error) {
        console.error('❌ Error procesando mensaje:', error);
        sendResponse({ status: 'error', error: error.message });
      }
      
      return true; // Indica que la respuesta es asincrónica
    };
    
    chrome.runtime.onMessage.addListener(listener);
    console.log('✅ Message listener registrado correctamente');
  } catch (error) {
    console.error('❌ Error registrando listener:', error);
  }
} else {
  console.warn('⚠️ chrome.runtime no disponible - Extension no cargada correctamente');
}
