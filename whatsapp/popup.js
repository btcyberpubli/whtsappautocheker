// popup.js - Control UI para WhatsApp Auto Checker

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const estadoEl = document.getElementById('estado');
const scannedEl = document.getElementById('scanned');
const unreadEl = document.getElementById('unread');
const nextRunEl = document.getElementById('nextRun');
const alertsListEl = document.getElementById('alertsList');

// Estado inicial
updateStatus();

// Event Listeners - Start
startBtn.addEventListener('click', () => {
  console.log('🚀 [POPUP] Iniciando WhatsApp Auto Checker...');
  
  // Primero avisar al service worker
  chrome.runtime.sendMessage({
    action: 'startWhatsAppChecker'
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('❌ Error con service worker:', chrome.runtime.lastError);
    } else {
      console.log('✅ Service worker inicializado:', response);
    }
  });
  
  // Luego inicializar storage local
  chrome.storage.local.set({
    whatsappAutoRunning: true,
    scannedChats: 0,
    unreadLines: 0,
    failedChats: [],
    lastRun: new Date().toLocaleTimeString()
  });
  
  // Enviar mensaje al content script de WhatsApp
  chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }, (tabs) => {
    if (tabs[0]) {
      console.log('📤 [POPUP] Enviando mensaje a WhatsApp tab:', tabs[0].id);
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'startWhatsAppChecker'
      }).catch((error) => {
        console.error('⚠️ WhatsApp no está abierto:', error);
      });
    } else {
      console.warn('⚠️ WhatsApp Web no está abierto');
    }
  });
  
  updateStatus();
});

// Event Listeners - Stop
stopBtn.addEventListener('click', () => {
  console.log('⏹ [POPUP] Deteniendo WhatsApp Auto Checker...');
  
  // Avisar al service worker
  chrome.runtime.sendMessage({
    action: 'stopWhatsAppChecker'
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('❌ Error:', chrome.runtime.lastError);
    }
  });
  
  // Actualizar storage
  chrome.storage.local.set({ whatsappAutoRunning: false });
  
  // Detener el content script
  chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'stopWhatsAppChecker'
      }).catch((error) => {
        console.error('❌ Error:', error);
      });
    }
  });
  
  updateStatus();
});

// Actualizar estado cada 1 segundo
setInterval(updateStatus, 1000);

function updateStatus() {
  chrome.storage.local.get(
    ['whatsappAutoRunning', 'scannedChats', 'unreadLines', 'failedChats', 'nextRun', 'sentAlerts'],
    (result) => {
      const isRunning = result.whatsappAutoRunning || false;
      const scanned = result.scannedChats || 0;
      const unread = result.unreadLines || 0;
      const failedChats = result.failedChats || [];
      const sentAlerts = result.sentAlerts || [];
      const nextRun = result.nextRun || 'N/A';

      // Actualizar estados
      estadoEl.textContent = isRunning ? '🟢 Ejecutando' : '🔴 Detenido';
      estadoEl.className = isRunning ? 'status-value' : 'status-value';
      
      scannedEl.textContent = scanned;
      unreadEl.textContent = unread;
      unreadEl.className = unread > 0 ? 'status-value error' : 'status-value';
      nextRunEl.textContent = nextRun;

      // Habilitar/deshabilitar botones
      startBtn.disabled = isRunning;
      stopBtn.disabled = !isRunning;

      // Actualizar lista de alertas
      updateAlerts(failedChats, sentAlerts);
    }
  );
}

function updateAlerts(failedChats, sentAlerts) {
  let html = '';
  
  // Mostrar alertas enviadas al servidor (más importante)
  if (sentAlerts && sentAlerts.length > 0) {
    html += '<div class="alerts-section"><h4>🚨 Alertas Enviadas (Caídas Detectadas):</h4>';
    sentAlerts.slice(-5).reverse().forEach((alert, index) => {
      html += `<div class="alert-item error">
        <strong>⚠️ #${index + 1}</strong> ${alert.contactName || 'Desconocido'}<br>
        <small>📱 ${alert.chatId || 'N/A'}</small><br>
        <small>⏰ ${new Date(alert.detectedAt).toLocaleTimeString()}</small><br>
        <small>📊 ID: ${alert.alertId ? alert.alertId.substring(0, 20) + '...' : 'N/A'}</small>
      </div>`;
    });
    html += '</div>';
  }
  
  // Mostrar líneas sin leer
  if (failedChats && failedChats.length > 0) {
    html += '<div class="alerts-section"><h4>⚠️ Líneas Sin Leer (Sin Alerta):</h4>';
    failedChats.forEach((chat, index) => {
      html += `<div class="alert-item warning">
        <strong>#${index + 1}</strong> ${chat.name || 'Chat desconocido'}<br>
        <small>Último intento: ${chat.lastCheck || 'N/A'}</small>
      </div>`;
    });
    html += '</div>';
  }
  
  if (!html) {
    html = '<div class="no-alerts">✅ Todas las líneas están activas</div>';
  }
  
  alertsListEl.innerHTML = html;
}

// Escuchar mensajes del content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateUI') {
    console.log('📊 Actualizando UI:', message);
    chrome.storage.local.set({
      scannedChats: message.scanned,
      unreadLines: message.unread,
      failedChats: message.failedChats || [],
      nextRun: message.nextRun || 'N/A'
    });
    updateStatus();
  }
});
