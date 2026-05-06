// background.js - Service Worker para WhatsApp Auto Checker

console.log('🔧 Service Worker de WhatsApp Auto Checker cargado');

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

// Crear alarma que se ejecute cada 10 minutos
function setupCheckInterval() {
  console.log('⏰ Configurando alarma de verificación cada 10 minutos');
  
  // Limpiar alarmas previas
  chrome.alarms.clear('whatsappCheckInterval', () => {
    // Crear nueva alarma: cada 10 minutos (600 segundos)
    chrome.alarms.create('whatsappCheckInterval', { periodInMinutes: 10 });
    console.log('✅ Alarma configurada correctamente');
  });
}

// Escuchar alarmas
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'whatsappCheckInterval') {
    console.log('🔔 ALARMA: Ejecutando verificación de chats...');
    
    // Verificar si está activo
    chrome.storage.local.get('whatsappAutoRunning', (result) => {
      if (result.whatsappAutoRunning) {
        console.log('🚀 Enviando comando de ciclo al content script');
        
        // Encontrar la tab de WhatsApp Web
        chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }, (tabs) => {
          if (tabs.length > 0) {
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
});

// Al cargar, si estaba corriendo, reiniciar las alarmas
chrome.storage.local.get('whatsappAutoRunning', (result) => {
  if (result.whatsappAutoRunning) {
    console.log('⏰ Restaurando alarmas después de reinicio del service worker');
    setupCheckInterval();
  }
});
