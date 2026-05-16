/**
 * Script de Instalación - Detector de Caídas WhatsApp
 * 
 * Instrucciones:
 * 1. Abre WhatsApp Web en Chrome
 * 2. Abre Console (F12 > Console)
 * 3. Copia y pega TODO este código
 * 4. Presiona Enter
 * 5. Deberías ver "✅ Extensión instalada" en la consola
 * 
 * El sistema se inicializa automáticamente después de esto.
 */

(function() {
    console.log('%c🚀 Iniciando instalación del Detector de Caídas...', 'color: #27ae60; font-size: 14px; font-weight: bold;');

    // Detectar el servidor correcto (basarse en la URL actual)
    const isProduction = window.location.hostname.includes('accountant-services.co.uk');
    const baseUrl = isProduction 
        ? 'https://accountant-services.co.uk' 
        : 'http://localhost:3010';

    console.log(`%c📍 Entorno: ${isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'}`, 'color: #3498db; font-size: 12px;');
    console.log(`%c🔗 URL Base: ${baseUrl}`, 'color: #3498db; font-size: 12px;');

    // Cargar la extensión
    const script = document.createElement('script');
    script.src = `${baseUrl}/whatsapp/detector-extension.js`;
    
    script.onload = function() {
        console.log('%c✅ Extensión cargada correctamente', 'color: #27ae60; font-size: 14px; font-weight: bold;');
        
        // Esperar a que se inicialice
        setTimeout(() => {
            if (window.whatsappDetector) {
                console.log('%c✨ Detector inicializado', 'color: #f39c12; font-size: 12px;');
                console.log('%c📊 Estado:', 'color: #2980b9; font-size: 12px;', window.whatsappDetector.getStatus());
                console.log('%c💡 Comandos disponibles:', 'color: #8e44ad; font-size: 12px;');
                console.log('  - window.whatsappDetector.getStatus()');
                console.log('  - window.whatsappDetector.getAlertLog()');
                console.log('  - window.whatsappDetector.stopMonitoring()');
                console.log('  - window.whatsappDetector.startMonitoring()');
            } else {
                console.warn('%c⚠️ El detector no se inicializó correctamente', 'color: #e74c3c; font-size: 12px;');
            }
        }, 500);
    };

    script.onerror = function() {
        console.error('%c❌ Error al cargar la extensión', 'color: #e74c3c; font-size: 14px; font-weight: bold;');
        console.error(`   URL intentada: ${script.src}`);
        console.error('   Verifica que el servidor esté corriendo');
    };

    document.head.appendChild(script);
})();
