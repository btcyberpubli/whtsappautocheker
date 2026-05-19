// background.js - Service Worker para WhatsApp Auto Checker

console.log('🔧 Service Worker de WhatsApp Auto Checker cargado');

// 🔌 Conexión persistente con el content script
let contentPort = null;

// Listener para mantener puerto activo
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'whatsapp-checker-port') {
    console.log('🔌 [BG] Puerto de conexión persistente establecido con content script');
    contentPort = port;
    
    port.onDisconnect.addListener(() => {
      console.log('❌ [BG] Puerto desconectado, intentando reconectar en 2s...');
      contentPort = null;
      // Intentar reconectar
      setTimeout(() => {
        chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }, (tabs) => {
          if (tabs.length > 0) {
            console.log('🔄 [BG] Reconectando con content script...');
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'reconnect'
            }).catch(() => {
              console.log('ℹ️ Content script no disponible aún');
            });
          }
        });
      }, 2000);
    });
    
    // Escuchar mensajes del content script
    port.onMessage.addListener((msg) => {
      if (msg.action === 'ping') {
        console.log('💓 [BG] Ping recibido del content script, respondiendo pong...');
        port.postMessage({ action: 'pong', timestamp: Date.now() });
      }
    });
  }
});

// Inicializar storage al instalar
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('📦 Extensión instalada');
    
    chrome.storage.local.set({
      whatsappAutoRunning: false,
      scannedChats: 0,
      unreadLines: 0,
      failedChats: [],
      sentAlerts: [],
      nextRun: 'N/A',
      lastRun: 'Nunca'
    });
  }
});

// Crear alarma que se ejecute cada 5 minutos
function setupCheckInterval() {
  console.log('⏰ Configurando alarma de verificación cada 5 minutos');
  
  // Limpiar alarmas previas
  chrome.alarms.clear('whatsappCheckInterval', () => {
    // Crear nueva alarma: cada 5 minutos (300 segundos)
    chrome.alarms.create('whatsappCheckInterval', { periodInMinutes: 5 });
    console.log('✅ Alarma configurada correctamente');
  });
}

// Escuchar alarmas
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'whatsappCheckInterval') {
    console.log('🔔 ALARMA: Ejecutando verificación de chats...');
    
    // Verificar si está activo
    chrome.storage.local.get(['whatsappAutoRunning', 'lastCycleTime'], (result) => {
      if (result.whatsappAutoRunning) {
        // 🛡️ VALIDACIÓN: No ejecutar ciclos muy seguidos (mínimo 5 minutos)
        const now = Date.now();
        const lastCycleTime = result.lastCycleTime || 0;
        const timeSinceLastCycle = now - lastCycleTime;
        const minIntervalMs = 5 * 60 * 1000; // 5 minutos
        
        if (lastCycleTime > 0 && timeSinceLastCycle < minIntervalMs) {
          console.log(`⏳ Ciclo demasiado reciente (${Math.round(timeSinceLastCycle / 1000)}s ago) - saltando`);
          return;
        }
        
        console.log('🚀 Enviando comando de ciclo al content script');
        
        // Encontrar la tab de WhatsApp Web
        chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }, (tabs) => {
          if (tabs.length > 0) {
            // Registrar inicio de ciclo
            chrome.storage.local.set({ lastCycleTime: now });
            
            // Enviar mensaje al content script
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'runCycleFromAlarm'
            }).catch((error) => {
              console.error('⚠️ Error enviando mensaje:', error);
            });
          } else {
            console.log('⚠️ WhatsApp Web no está abierto');
          }
        });
      } else {
        console.log('ℹ️ Auto checker desactivado, no se ejecuta ciclo');
      }
    });
  }
});

// Escuchar mensajes del popup y content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Service Worker recibió:', message.action);
  
  if (message.action === 'startWhatsAppChecker') {
    console.log('🟢 Iniciando auto checker');
    chrome.storage.local.set({ whatsappAutoRunning: true });
    setupCheckInterval(); // Configurar alarma
    
    // 🚀 EJECUTAR PRIMER CICLO INMEDIATAMENTE (sin esperar 10 minutos)
    console.log('🚀 Ejecutando primer ciclo inmediatamente...');
    chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }, (tabs) => {
      if (tabs.length > 0) {
        chrome.storage.local.set({ lastCycleTime: Date.now() });
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'runCycleFromAlarm'
        }).catch((error) => {
          console.error('⚠️ Error enviando primer ciclo:', error);
        });
      } else {
        console.log('⚠️ WhatsApp Web no está abierto para primer ciclo');
      }
    });
    
    sendResponse({ status: 'iniciado' });
  } 
  else if (message.action === 'stopWhatsAppChecker') {
    console.log('🔴 Deteniendo auto checker');
    chrome.storage.local.set({ whatsappAutoRunning: false });
    chrome.alarms.clear('whatsappCheckInterval');
    sendResponse({ status: 'detenido' });
  }
  else if (message.action === 'updateUI') {
    // Actualizar storage con datos del content script
    chrome.storage.local.set({
      lastRun: new Date().toLocaleTimeString(),
      scannedChats: message.scanned,
      unreadLines: message.unread,
      failedChats: message.failedChats || []
    });
  }
  else if (message.action === 'alertSent') {
    console.log('🚨 Alerta registrada:', message.alert);
    chrome.storage.local.get('sentAlerts', (result) => {
      const sentAlerts = result.sentAlerts || [];
      sentAlerts.push({
        ...message.alert,
        recordedAt: new Date().toISOString()
      });
      chrome.storage.local.set({ sentAlerts });
    });
  }
  else if (message.action === 'heartbeatResponse') {
    // Respuesta del content script al heartbeat
    console.log('💓 Heartbeat recibido - content script activo');
    chrome.storage.local.set({ lastHeartbeat: Date.now() });
  }
});

// Sistema de heartbeat para mantener el content script despierto
function setupHeartbeat() {
  console.log('💓 Configurando heartbeat cada 2 segundos (con puerto persistente)');
  
  setInterval(() => {
    chrome.storage.local.get('whatsappAutoRunning', (result) => {
      if (result.whatsappAutoRunning) {
        // Si hay puerto persistente, usarlo
        if (contentPort) {
          try {
            contentPort.postMessage({
              action: 'heartbeat',
              timestamp: Date.now()
            });
          } catch (error) {
            console.warn('⚠️ Error enviando por puerto:', error);
            contentPort = null;
          }
        } else {
          // Fallback: enviar mensaje directo
          chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }, (tabs) => {
            if (tabs.length > 0) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: 'heartbeat',
                timestamp: Date.now()
              }).catch((error) => {
                console.log('ℹ️ Content script no disponible al hacer heartbeat');
              });
            }
          });
        }
      }
    });
  }, 2000); // Cada 2 segundos (MÁS AGRESIVO)
}

// Iniciar heartbeat cuando la extensión se carga
setupHeartbeat();

// Al cargar, si estaba corriendo, reiniciar las alarmas
chrome.storage.local.get('whatsappAutoRunning', (result) => {
  if (result.whatsappAutoRunning) {
    console.log('⏰ Restaurando alarmas después de reinicio del service worker');
    setupCheckInterval();
  }
});
