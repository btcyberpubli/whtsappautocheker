import express from 'express';
import fs from 'fs/promises'; // Usamos la versión con promises
import fsSinc from 'fs'; // Para operaciones síncronas
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { getCombinedReport } from './merge_reports.js';
import { generarReporteUnificado, prepararConfigParaNuevoDia, sincronizarConfigConReporte } from './clientify/instrucciones/generarreporteunificado.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3010;

// ✅ LOCK PARA SERIALIZAR ESCRITURAS DE CONFIG
// Evita race conditions cuando llegan múltiples POSTs simultáneamente
let configLockPromise = Promise.resolve();

// ✅ Middleware para parsear JSON
app.use(express.json());

// ✅ CORS simple - Solo permitir requests preflight
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Configuración de rutas absolutas
const PATHS = {
  reporte2: path.join(__dirname, 'clientify', 'reporte_paneles2.json'),
  reporte3: path.join(__dirname, 'clientify', 'reporte_paneles3.json'),
  config: path.join(__dirname, 'clientify', 'configuracion_asignaciones.json'),
  campanias: path.join(__dirname, 'meta', 'campanias_meta_ads.json'),
  horariosMeta: path.join(__dirname, 'meta', 'horarios_ejecucion_meta_ads.json'),
  errorReport: path.join(__dirname, 'error_report.json'), // ✅ NUEVO: Archivo de errores
  whatsappAlerts: path.join(__dirname, 'whatsapp', 'alertas.json') // ✅ Alertas de WhatsApp
};

// 🛡️ FUNCIÓN AUXILIAR: Escribir JSON de forma SEGURA con validaciones y backup
async function writeJsonSafe(filePath, data, backupSuffix = '.bak') {
  // 1️⃣ Validar que sea un objeto válido
  if (data === null || data === undefined) {
    throw new Error('❌ Datos nulos o indefinidos');
  }

  if (typeof data !== 'object') {
    throw new Error('❌ Los datos deben ser un objeto JSON');
  }

  // 2️⃣ Serializar JSON
  let jsonString;
  try {
    jsonString = JSON.stringify(data, null, 2);
  } catch (err) {
    throw new Error(`❌ No se puede serializar JSON: ${err.message}`);
  }

  if (jsonString.length === 0) {
    throw new Error('❌ JSON serializado está vacío');
  }

  // 3️⃣ Validar JSON nuevamente (doble check)
  try {
    JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`❌ JSON inválido después de serializar: ${err.message}`);
  }

  // 4️⃣ Crear backup del archivo actual (si existe)
  const backupFile = filePath + backupSuffix;
  if (fsSinc.existsSync(filePath)) {
    try {
      const currentContent = await fs.readFile(filePath, 'utf8');
      await fs.writeFile(backupFile, currentContent, 'utf8');
      console.log(`   📋 Backup: ${path.basename(filePath)}`);
    } catch (backupErr) {
      console.warn(`⚠️  No se pudo crear backup: ${backupErr.message}`);
    }
  }

  // 5️⃣ Escribir a archivo temporal primero (ESCRITURA ATÓMICA)
  const tempFile = filePath + '.tmp';
  try {
    await fs.writeFile(tempFile, jsonString, 'utf8');
    console.log(`   ✅ Temp escrito`);
  } catch (tempErr) {
    throw new Error(`❌ Fallo escribiendo archivo temporal: ${tempErr.message}`);
  }

  // 6️⃣ Validar que el archivo temporal sea válido
  try {
    const tempContent = await fs.readFile(tempFile, 'utf8');
    JSON.parse(tempContent);
    console.log(`   ✅ Validación temp exitosa`);
  } catch (validateErr) {
    // Eliminar archivo temporal corrupto
    try {
      await fs.unlink(tempFile);
    } catch (e) {}
    throw new Error(`❌ Validación de temp fallida: ${validateErr.message}`);
  }

  // 7️⃣ Renombrar temp → original (OPERACIÓN ATÓMICA)
  try {
    await fs.rename(tempFile, filePath);
    console.log(`✅ ${path.basename(filePath)} guardado correctamente`);
  } catch (renameErr) {
    // Si falla rename, intentar delete temp
    try {
      await fs.unlink(tempFile);
    } catch (e) {}
    throw new Error(`❌ Fallo finalizando guardado: ${renameErr.message}`);
  }

  return {
    success: true,
    file: filePath,
    backup: backupFile,
    bytes: jsonString.length
  };
}

// Middleware de verificación mejorado
const checkFiles = async () => {
  const results = {};
  
  for (const [key, filePath] of Object.entries(PATHS)) {
    try {
      await fs.access(filePath, fs.constants.R_OK);
      const content = await fs.readFile(filePath, 'utf8');
      JSON.parse(content); // Validación adicional
      results[key] = { exists: true, valid: true };
    } catch (err) {
      results[key] = { 
        exists: err.code !== 'ENOENT',
        valid: false,
        error: err.message
      };
    }
  }
  
  return results;
};

// Endpoint con diagnóstico completo
app.get('/root/superbot1.0', async (req, res) => {
  try {
    const fileStatus = await checkFiles();
    
    // Verificar si todos los archivos son válidos
    const allValid = Object.values(fileStatus).every(f => f.exists && f.valid);
    
    if (!allValid) {
      return res.status(500).json({
        error: "Problemas con los archivos",
        details: fileStatus,
        solution: "Verifique que los archivos existan y tengan formato JSON válido"
      });
    }

    // ✅ MODIFICADO: Usar reporte_paneles3 (ya procesado) y reporte_paneles2 (original)
    const reportePanelesProcessed = JSON.parse(await fs.readFile(PATHS.reporte3, 'utf8'));
    const reportePanelesOriginal = JSON.parse(await fs.readFile(PATHS.reporte2, 'utf8'));

    const [campanias, horariosMeta, config] = await Promise.all([
      fs.readFile(PATHS.campanias, 'utf8').then(JSON.parse),
      fs.readFile(PATHS.horariosMeta, 'utf8').then(JSON.parse),
      fs.readFile(PATHS.config, 'utf8').then(JSON.parse).catch(() => ({}))
    ]);

    res.json({
      success: true,
      reportePaneles: reportePanelesProcessed,
      reportePanelesOriginal: reportePanelesOriginal,
      campaniasMetaAds: campanias,
      horariosMetaAds: horariosMeta,
      _config: config,
      _info: {
        fuentes: "reporte_paneles3.json (procesado) + reporte_paneles2.json (original)"
      }
    });

  } catch (err) {
    console.error('Error en endpoint:', err);
    res.status(500).json({
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// ✅ NUEVO: Endpoint versión 1.0.2 con reporte_paneles2
app.get('/root/superbot1.0.2', async (req, res) => {
  try {
    const fileStatus = await checkFiles();
    
    // Verificar si todos los archivos son válidos
    const allValid = Object.values(fileStatus).every(f => f.exists && f.valid);
    
    if (!allValid) {
      return res.status(500).json({
        error: "Problemas con los archivos",
        details: fileStatus,
        solution: "Verifique que los archivos existan y tengan formato JSON válido"
      });
    }

    // ✅ v1.0.2: Usar reporte_paneles2 (original) 
    const reportePaneles = JSON.parse(await fs.readFile(PATHS.reporte2, 'utf8'));

    const [campanias, horariosMeta, config] = await Promise.all([
      fs.readFile(PATHS.campanias, 'utf8').then(JSON.parse),
      fs.readFile(PATHS.horariosMeta, 'utf8').then(JSON.parse),
      fs.readFile(PATHS.config, 'utf8').then(JSON.parse).catch(() => ({}))
    ]);

    res.json({
      success: true,
      reportePaneles: reportePaneles,
      campaniasMetaAds: campanias,
      horariosMetaAds: horariosMeta,
      _config: config,
      _info: {
        version: "1.0.2",
        fuentes: "reporte_paneles2.json + campanias_meta_ads.json"
      }
    });

  } catch (err) {
    console.error('Error en endpoint:', err);
    res.status(500).json({
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// ✅ NUEVO: Endpoint POST para recibir datos de whaticket
app.post('/api/paneles', async (req, res) => {
  try {
    const datos = req.body;

    // Validación básica
    if (!Array.isArray(datos) || datos.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Debe enviar un array no vacío",
        estructura: [
          {
            id: "0",
            panel: "Panel Royal",
            total_mensajes_hoy: 69,
            cargas_hoy: 0,
            porcentaje_carga: "0.0%",
            campañas: {},
            detalle_por_origen: ["whaticket"]
          }
        ]
      });
    }

    // Validar cada panel
    const errores = [];
    datos.forEach((panel, idx) => {
      if (!panel.id) errores.push(`Panel ${idx}: Falta 'id'`);
      if (!panel.panel) errores.push(`Panel ${idx}: Falta 'panel'`);
      if (panel.total_mensajes_hoy === undefined) errores.push(`Panel ${idx}: Falta 'total_mensajes_hoy'`);
      if (panel.cargas_hoy === undefined) errores.push(`Panel ${idx}: Falta 'cargas_hoy'`);
    });

    if (errores.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Validación fallida",
        detalles: errores
      });
    }

    // Crear directorio whaticket si no existe
    const whaticketDir = path.join(__dirname, 'whaticket');
    if (!fsSinc.existsSync(whaticketDir)) {
      fsSinc.mkdirSync(whaticketDir, { recursive: true });
    }

    // Guardar en whaticket/latest.json
    const whaticketPath = path.join(whaticketDir, 'latest.json');
    await fs.writeFile(whaticketPath, JSON.stringify(datos, null, 2), 'utf8');

    // También guardar con timestamp para historial
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const historialPath = path.join(whaticketDir, `datos_${timestamp}.json`);
    await fs.writeFile(historialPath, JSON.stringify(datos, null, 2), 'utf8');

    console.log(`✅ [WHATICKET] ${datos.length} paneles guardados`);
    console.log(`   📁 ${whaticketPath}`);

    res.status(200).json({
      success: true,
      message: "Datos de whaticket guardados correctamente",
      paneles_guardados: datos.length,
      archivo: whaticketPath,
      historial: historialPath,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Error en POST /api/paneles:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ NUEVO: Endpoint POST para configurar objetivo del panel
app.post('/api/panel-objetivo', async (req, res) => {
  try {
    const { panel, objetivo } = req.body;

    // Validación
    if (!panel || objetivo === undefined) {
      return res.status(400).json({
        success: false,
        error: "Debe enviar 'panel' y 'objetivo'",
        estructura: {
          panel: "royal",
          objetivo: 500
        }
      });
    }

    if (typeof objetivo !== 'number' || objetivo <= 0) {
      return res.status(400).json({
        success: false,
        error: "El objetivo debe ser un número positivo"
      });
    }

    // Leer configuración
    let config = {};
    try {
      const contenido = await fs.readFile(PATHS.config, 'utf8');
      config = JSON.parse(contenido);
    } catch (err) {
      config = { paneles: {} };
    }

    // Normalizar nombre del panel
    const panelNormalizado = String(panel).trim().toLowerCase().replace(/\s+/g, '');

    // Actualizar objetivo
    if (!config.paneles[panelNormalizado]) {
      config.paneles[panelNormalizado] = {};
    }
    config.paneles[panelNormalizado].objetivo = objetivo;
    config.ultima_actualizacion = new Date().toISOString();

    // 🛡️ Guardar con validaciones y backup
    await writeJsonSafe(PATHS.config, config);
    console.log(`✅ Objetivo actualizado: ${panel} → ${objetivo}`);

    res.json({
      success: true,
      message: "Objetivo guardado correctamente",
      panel,
      objetivo,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Error en POST /api/panel-objetivo:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      hint: "Si el problema persiste, restaura el backup .bak"
    });
  }
});

// ✅ NUEVO: Endpoint POST para configurar asignaciones de mensajes sin campaña
app.post('/api/panel-asignaciones', async (req, res) => {
  // ✅ CREAR UNA NUEVA PROMESA PARA ESTE POST Y AGREGAR A LA COLA
  let releaseConfigLock;
  const currentLock = configLockPromise;
  configLockPromise = new Promise((resolve) => {
    releaseConfigLock = resolve;
  });

  // Esperar a que el POST anterior termine
  await currentLock;

  try {
    const { panel, panel_nombre, campañas, campania, cantidad_asignada, asignacion_automatica } = req.body;

    // Normalizar nombre del panel (soportar ambos formatos)
    let panelNormalizado = panel || panel_nombre;
    if (!panelNormalizado || typeof panelNormalizado !== 'string') {
      releaseConfigLock(); // ✅ LIBERAR LOCK
      return res.status(400).json({
        success: false,
        error: "Debe enviar 'panel' o 'panel_nombre'"
      });
    }

    panelNormalizado = String(panelNormalizado).trim().toLowerCase().replace(/\s+/g, '');

    // ✅ LEER REPORTE2 PARA SINCRONIZACIÓN
    let reporte2 = {};
    try {
      const contenido = await fs.readFile(PATHS.reporte2, 'utf8');
      reporte2 = JSON.parse(contenido);
    } catch (err) {
      console.warn(`⚠️  No se pudo leer reporte2: ${err.message}`);
    }

    // Leer configuración
    let config = {};
    try {
      const contenido = await fs.readFile(PATHS.config, 'utf8');
      config = JSON.parse(contenido);
    } catch (err) {
      config = { paneles: {} };
    }

    // ✅ PREPARAR CONFIG: Verificar y limpiar si cambió de día
    const limpiezaRealizada = prepararConfigParaNuevoDia(config);
    
    // ✅ SINCRONIZAR: Agregar campañas nuevas del reporte que falten en config
    const cambiosSincronizacion = sincronizarConfigConReporte(reporte2, config);
    
    // Si se realizaron cambios de limpieza o sincronización, guardarlos AHORA
    // Esto se hace ANTES de las validaciones de entrada del usuario
    if (limpiezaRealizada || cambiosSincronizacion) {
      try {
        console.log(`💾 Guardando preparación de config...`);
        await writeJsonSafe(PATHS.config, config);
        console.log(`✅ Config preparado y guardado`);
      } catch (prepErr) {
        console.error('⚠️  Error guardando preparación de config:', prepErr.message);
        // No es crítico, continuamos
      }
    }

    // Inicializar panel si no existe
    if (!config.paneles[panelNormalizado]) {
      config.paneles[panelNormalizado] = { campañas: {} };
    }
    if (!config.paneles[panelNormalizado].campañas) {
      config.paneles[panelNormalizado].campañas = {};
    }

    // FORMATO 1: Actualizar múltiples campañas de una vez (inputs de cantidad)
    if (campañas && typeof campañas === 'object') {
      config.paneles[panelNormalizado].campañas = campañas;
      console.log(`✅ Asignaciones múltiples guardadas para: ${panelNormalizado}`);
    }
    // FORMATO 2: Actualizar un solo campo de una campaña (checkbox automático)
    else if (campania && (cantidad_asignada !== undefined || asignacion_automatica !== undefined)) {
      if (!config.paneles[panelNormalizado].campañas[campania]) {
        config.paneles[panelNormalizado].campañas[campania] = { 
          cantidad_asignada: 0, 
          asignacion_automatica: false 
        };
      }
      
      if (cantidad_asignada !== undefined) {
        config.paneles[panelNormalizado].campañas[campania].cantidad_asignada = parseInt(cantidad_asignada) || 0;
      }
      if (asignacion_automatica !== undefined) {
        config.paneles[panelNormalizado].campañas[campania].asignacion_automatica = Boolean(asignacion_automatica);
      }
      
      console.log(`✅ Automático actualizado: ${panelNormalizado} - ${campania} = ${asignacion_automatica}`);
    } else {
      releaseConfigLock(); // ✅ LIBERAR LOCK antes de return
      return res.status(400).json({
        success: false,
        error: "Formato de solicitud inválido"
      });
    }

    // Actualizar fecha a hoy a las 00:00 (zona horaria local)
    const ahora = new Date();
    const hoyCero = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate(),
      0, 0, 0, 0
    );
    config.ultima_actualizacion = hoyCero.toISOString();

    // 🛡️ GUARDAR CON VALIDACIÓN, BACKUP Y RECUPERACIÓN AUTOMÁTICA
    try {
      await writeJsonSafe(PATHS.config, config);
    } catch (saveErr) {
      console.error('❌ Error guardando configuración:', saveErr.message);
      // Intentar recuperar desde backup
      const backupFile = PATHS.config + '.bak';
      if (fsSinc.existsSync(backupFile)) {
        try {
          const backupContent = await fs.readFile(backupFile, 'utf8');
          const backupData = JSON.parse(backupContent);
          await fs.writeFile(PATHS.config, JSON.stringify(backupData, null, 2), 'utf8');
          console.log(`⚠️  Configuración restaurada desde backup`);
          releaseConfigLock();
          throw new Error(`${saveErr.message} [RESTAURADO DESDE BACKUP]`);
        } catch (restoreErr) {
          console.error('❌ No se pudo restaurar desde backup:', restoreErr.message);
          releaseConfigLock();
          throw new Error(`Fallo crítico: ${saveErr.message}. También falló restaurar backup.`);
        }
      } else {
        releaseConfigLock();
        throw saveErr;
      }
    }

    // ✅ EJECUTAR generarreporteunificado (pasando config en memoria para evitar race conditions)
    console.log(`🔄 Ejecutando generarreporteunificado...`);
    let resultado = false;
    let reporteProcesado = null;
    let reporteOriginal = null;
    try {
      // ✅ NUEVO: Pasar config actualizado para que no lo lea de disco
      // Esto evita race conditions si llegan múltiples POSTs simultáneamente
      resultado = await generarReporteUnificado(config);
      if (!resultado) {
        console.warn(`⚠️  generarreporteunificado completó con advertencias`);
      }
      
      // ✅ LEER ambos reportes para que el cliente calcule correctamente
      try {
        // Leer reporte procesado (reporte3)
        const contenido3 = await fs.readFile(PATHS.reporte3, 'utf8');
        reporteProcesado = JSON.parse(contenido3);
        console.log(`✅ Reporte procesado leído exitosamente`);
        
        // Leer reporte original (reporte2) para validaciones en cliente
        const contenido2 = await fs.readFile(PATHS.reporte2, 'utf8');
        reporteOriginal = JSON.parse(contenido2);
        console.log(`✅ Reporte original leído exitosamente`);
      } catch (readErr) {
        console.warn(`⚠️  No se pudo leer reportes: ${readErr.message}`);
      }
    } catch (generarErr) {
      console.error('❌ Error en generarReporteUnificado:', generarErr.message);
      throw new Error(`Error procesando reporte: ${generarErr.message}`);
    }

    res.json({
      success: true,
      message: "Asignaciones guardadas y reporte actualizado",
      panel: panelNormalizado,
      timestamp: new Date().toISOString(),
      info: "Los cambios se reflejan inmediatamente en reporte_paneles3.json",
      // ✅ DEVOLVER ambos reportes
      reportePanelesProcesado: reporteProcesado || [],
      reportePanelesOriginal: reporteOriginal || []
    });

  } catch (err) {
    console.error('Error en POST /api/panel-asignaciones:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  } finally {
    // ✅ SIEMPRE LIBERAR EL LOCK, pase lo que pase
    releaseConfigLock();
  }
});

// ✅ Endpoint para actualizar objetivo del panel
app.post('/api/actualizar-objetivo', async (req, res) => {
  try {
    const { panel_id, objetivo } = req.body;

    if (!panel_id || !objetivo) {
      return res.status(400).json({
        success: false,
        error: "Debe enviar 'panel_id' y 'objetivo'"
      });
    }

    // ✅ NUEVO: Buscar panel automáticamente en reportePaneles
    const reportePaneles = JSON.parse(await fs.readFile(PATHS.reporte3, 'utf8'));
    const panelEncontrado = reportePaneles.find(p => String(p.id) === String(panel_id));
    
    if (!panelEncontrado) {
      return res.status(400).json({
        success: false,
        error: `Panel con ID '${panel_id}' no encontrado`
      });
    }

    // Normalizar nombre del panel encontrado
    const panelNormalizado = String(panelEncontrado.panel || '').trim().toLowerCase().replace(/\s+/g, '');
    
    // Leer configuración
    let config = {};
    try {
      const contenido = await fs.readFile(PATHS.config, 'utf8');
      config = JSON.parse(contenido);
    } catch (err) {
      config = { paneles: {} };
    }

    // Inicializar panel si no existe - PRESERVAR todos los campos
    if (!config.paneles[panelNormalizado]) {
      config.paneles[panelNormalizado] = { 
        objetivo: parseInt(objetivo) || 500, 
        campañas: {} 
      };
    } else {
      // Actualizar solo el objetivo, preservar campañas y otros datos
      config.paneles[panelNormalizado].objetivo = parseInt(objetivo) || 500;
    }

    // NO actualizar fecha de última actualización para no afectar el reseteo
    // La fecha se actualiza solo cuando hay cambios de asignaciones

    // 🛡️ GUARDAR CON VALIDACIÓN, BACKUP Y RECUPERACIÓN AUTOMÁTICA
    try {
      await writeJsonSafe(PATHS.config, config);
    } catch (saveErr) {
      console.error('❌ Error guardando configuración:', saveErr.message);
      // Intentar recuperar desde backup
      const backupFile = PATHS.config + '.bak';
      if (fsSinc.existsSync(backupFile)) {
        try {
          const backupContent = await fs.readFile(backupFile, 'utf8');
          const backupData = JSON.parse(backupContent);
          await fs.writeFile(PATHS.config, JSON.stringify(backupData, null, 2), 'utf8');
          console.log(`⚠️  Configuración restaurada desde backup`);
          throw new Error(`${saveErr.message} [RESTAURADO DESDE BACKUP]`);
        } catch (restoreErr) {
          console.error('❌ No se pudo restaurar desde backup:', restoreErr.message);
          throw new Error(`Fallo crítico: ${saveErr.message}. También falló restaurar backup.`);
        }
      } else {
        throw saveErr;
      }
    }

    console.log(`✅ Objetivo actualizado: ${panelNormalizado} (ID ${panel_id}) = ${objetivo}`);

    res.json({
      success: true,
      message: "Objetivo actualizado correctamente",
      panel: panelNormalizado,
      panel_id: panel_id,
      objetivo: parseInt(objetivo),
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Error en POST /api/actualizar-objetivo:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      hint: "Si el problema persiste, restaura el backup .bak"
    });
  }
});
app.get('/api/paneles/stats', (req, res) => {
  try {
    const combined = getCombinedReport();
    const whaticket = combined.filter(p => p.source === 'whaticket');
    const clientify = combined.filter(p => p.source === 'clientify');

    res.json({
      success: true,
      total: combined.length,
      desde_whaticket: whaticket.length,
      desde_clientify: clientify.length,
      porcentaje_whaticket: combined.length > 0 ? ((whaticket.length / combined.length) * 100).toFixed(1) : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint de diagnóstico
app.get('/debug-files', async (req, res) => {
  res.json(await checkFiles());
});

// ✅ NUEVO: Endpoint para el reporte de errores
app.get('/errores', async (req, res) => {
  try {
    // Verificar si el archivo existe
    try {
      await fs.access(PATHS.errorReport, fs.constants.R_OK);
    } catch (err) {
      return res.status(404).json({
        error: "No hay reporte de errores disponible",
        message: "El archivo error_report.json no existe. Esto puede significar que no ha habido errores recientes o que el runner no se ha ejecutado.",
        file_path: PATHS.errorReport
      });
    }

    // Leer y parsear el archivo
    const errorReportContent = await fs.readFile(PATHS.errorReport, 'utf8');
    const errorReport = JSON.parse(errorReportContent);

    // Agregar información adicional
    const stats = await fs.stat(PATHS.errorReport);
    
    res.json({
      success: true,
      last_updated: stats.mtime.toISOString(),
      file_size_bytes: stats.size,
      error_report: errorReport,
      summary: {
        has_errors: errorReport.summary?.total_errors > 0,
        total_errors: errorReport.summary?.total_errors || 0,
        failed_scripts_count: errorReport.summary?.failed_scripts?.length || 0,
        last_batch_time: errorReport.timestamp
      }
    });

  } catch (err) {
    console.error('Error al leer reporte de errores:', err);
    res.status(500).json({
      error: "Error al procesar el reporte de errores",
      message: err.message,
      details: "El archivo puede estar corrupto o tener formato JSON inválido"
    });
  }
});

// ✅ NUEVO: Endpoint simplificado solo con errores actuales
app.get('/errores/simple', async (req, res) => {
  try {
    try {
      await fs.access(PATHS.errorReport, fs.constants.R_OK);
    } catch (err) {
      return res.json({
        has_errors: false,
        message: "No hay errores reportados"
      });
    }

    const errorReportContent = await fs.readFile(PATHS.errorReport, 'utf8');
    const errorReport = JSON.parse(errorReportContent);

    res.json({
      has_errors: errorReport.summary?.total_errors > 0,
      total_errors: errorReport.summary?.total_errors || 0,
      failed_scripts: errorReport.summary?.failed_scripts || [],
      last_execution: errorReport.timestamp,
      environment: errorReport.batch_info?.environment || 'unknown'
    });

  } catch (err) {
    res.status(500).json({
      has_errors: true,
      error: "Error al leer reporte",
      message: err.message
    });
  }
});

// ✅ NUEVO: Endpoint POST para ejecutar runner.js desde Vercel/Frontend
app.post('/api/execute-runner', async (req, res) => {
  try {
    // Validar token secreto (opcional pero recomendado para seguridad)
    const token = req.headers['x-secret-token'];
    const secretToken = process.env.SECRET_TOKEN || 'tu-token-secreto-aqui';
    
    if (token !== secretToken) {
      console.warn(`⚠️  [RUNNER] Intento no autorizado desde ${req.ip}`);
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Token inválido o no proporcionado'
      });
    }

    const runnerPath = path.join(__dirname, 'runner.js');
    
    // Verificar que el archivo existe
    try {
      await fs.access(runnerPath);
    } catch {
      return res.status(404).json({
        error: 'Runner no encontrado',
        path: runnerPath
      });
    }

    console.log(`🚀 [RUNNER] Iniciando ejecución de runner.js...`);
    
    // Ejecutar runner.js en background (no esperar a que termine)
    exec(`node ${runnerPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ [RUNNER] Error durante ejecución:`, error.message);
        if (stderr) console.error(`STDERR: ${stderr}`);
        return;
      }
      console.log(`✅ [RUNNER] Ejecución completada`);
      if (stdout) console.log(`OUTPUT: ${stdout}`);
    });

    res.json({
      success: true,
      message: 'Runner iniciado en background',
      timestamp: new Date().toISOString(),
      info: 'Revisa los logs del servidor para ver el progreso'
    });

  } catch (error) {
    console.error('Error en POST /api/execute-runner:', error);
    res.status(500).json({
      error: 'Error interno',
      message: error.message
    });
  }
});

// ✅ NUEVO: Endpoint para recibir alertas de caída de WhatsApp
app.post('/api/whatsapp-alert', async (req, res) => {
  try {
    const alerta = req.body;

    // Validación básica
    if (!alerta.type || !alerta.contactName) {
      return res.status(400).json({
        success: false,
        error: "Falta 'type' o 'contactName'",
        estructura: {
          type: "whatsapp-downline",
          contactName: "string",
          chatId: "string",
          lastMessage: "string",
          detectedAt: "ISO timestamp",
          severity: "high",
          source: "whatsapp-extension"
        }
      });
    }

    // Crear objeto de alerta con timestamp del servidor
    const alertaCompleta = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...alerta,
      receivedAt: new Date().toISOString(),
      status: 'active' // active, resolved, ignored
    };

    // Leer alertas existentes
    let alertas = [];
    try {
      if (fsSinc.existsSync(PATHS.whatsappAlerts)) {
        const contenido = await fs.readFile(PATHS.whatsappAlerts, 'utf8');
        alertas = JSON.parse(contenido);
      }
    } catch (err) {
      console.warn(`⚠️  No se pudo leer alertas previas: ${err.message}`);
      alertas = [];
    }

    // Verificar si ya existe una alerta activa para este chat (últimos 5 minutos)
    const chatAlertas = alertas.filter(a => 
      a.chatId === alertaCompleta.chatId && 
      a.status === 'active' &&
      new Date(a.detectedAt).getTime() > Date.now() - 300000 // 5 minutos
    );

    if (chatAlertas.length > 0) {
      // Ya existe una alerta reciente, solo actualizar timestamp
      console.log(`⚠️  [WhatsApp] Alerta duplicada evitada para: ${alerta.contactName}`);
      return res.json({
        success: true,
        message: 'Alerta duplicada (existe una activa)',
        alertId: chatAlertas[0].id,
        isDuplicate: true
      });
    }

    // Agregar nueva alerta al inicio (más reciente primero)
    alertas.unshift(alertaCompleta);

    // Limitar a las últimas 200 alertas
    alertas = alertas.slice(0, 200);

    // Guardar alertas actualizadas
    try {
      await writeJsonSafe(PATHS.whatsappAlerts, alertas);
      console.log(`✅ [WhatsApp] Alerta registrada: ${alerta.contactName} (${alerta.severity})`);
    } catch (saveErr) {
      console.error('❌ Error guardando alerta:', saveErr.message);
      // No es crítico si fallan las alertas, continuar
    }

    // Responder al cliente
    res.json({
      success: true,
      message: "Alerta recibida y registrada",
      alertId: alertaCompleta.id,
      contactName: alerta.contactName,
      receivedAt: alertaCompleta.receivedAt,
      isDuplicate: false
    });

  } catch (error) {
    console.error('Error en POST /api/whatsapp-alert:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno',
      message: error.message
    });
  }
});

// ✅ NUEVO: Endpoint GET para obtener alertas de WhatsApp
app.get('/api/whatsapp-alerts', async (req, res) => {
  try {
    let alertas = [];
    
    if (fsSinc.existsSync(PATHS.whatsappAlerts)) {
      const contenido = await fs.readFile(PATHS.whatsappAlerts, 'utf8');
      alertas = JSON.parse(contenido);
    }

    // Filtrar por estado si se solicita
    const { status } = req.query;
    const alertasFiltradas = status ? alertas.filter(a => a.status === status) : alertas;

    res.json({
      success: true,
      count: alertasFiltradas.length,
      alerts: alertasFiltradas,
      activeCount: alertasFiltradas.filter(a => a.status === 'active').length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en GET /api/whatsapp-alerts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ NUEVO: Endpoint PUT para actualizar estado de una alerta
app.put('/api/whatsapp-alert/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { status } = req.body;

    // Validar status
    if (!['active', 'resolved', 'ignored'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Status debe ser: 'active', 'resolved' o 'ignored'"
      });
    }

    // Leer alertas
    let alertas = [];
    if (fsSinc.existsSync(PATHS.whatsappAlerts)) {
      const contenido = await fs.readFile(PATHS.whatsappAlerts, 'utf8');
      alertas = JSON.parse(contenido);
    }

    // Buscar y actualizar alerta
    const alerta = alertas.find(a => a.id === alertId);
    if (!alerta) {
      return res.status(404).json({
        success: false,
        error: `Alerta no encontrada: ${alertId}`
      });
    }

    alerta.status = status;
    alerta.updatedAt = new Date().toISOString();

    // Guardar cambios
    await writeJsonSafe(PATHS.whatsappAlerts, alertas);

    console.log(`✅ [WhatsApp] Alerta actualizada: ${alertId} → ${status}`);

    res.json({
      success: true,
      message: `Alerta actualizada a: ${status}`,
      alertId: alertId,
      updatedAt: alerta.updatedAt
    });

  } catch (error) {
    console.error('Error en PUT /api/whatsapp-alert:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ INICIALIZAR ARCHIVOS NECESARIOS AL STARTUP
async function initializeRequiredFiles() {
  console.log('\n🔧 Inicializando archivos requeridos...');
  
  // 1️⃣ Crear carpeta whatsapp si no existe
  const whatsappDir = path.join(__dirname, 'whatsapp');
  try {
    if (!fsSinc.existsSync(whatsappDir)) {
      await fs.mkdir(whatsappDir, { recursive: true });
      console.log(`   ✅ Carpeta creada: ${whatsappDir}`);
    } else {
      console.log(`   ✅ Carpeta existe: ${whatsappDir}`);
    }
  } catch (err) {
    console.error(`   ❌ Error creando carpeta: ${err.message}`);
  }

  // 2️⃣ Crear alertas.json si no existe
  try {
    if (!fsSinc.existsSync(PATHS.whatsappAlerts)) {
      await fs.writeFile(PATHS.whatsappAlerts, JSON.stringify([], null, 2), 'utf8');
      console.log(`   ✅ Archivo creado: ${PATHS.whatsappAlerts}`);
    } else {
      console.log(`   ✅ Archivo existe: ${PATHS.whatsappAlerts}`);
    }
  } catch (err) {
    console.error(`   ❌ Error creando alertas.json: ${err.message}`);
  }

  console.log('✅ Inicialización completada\n');
}

// ✅ EJECUTAR INICIALIZACIÓN ANTES DE INICIAR SERVIDOR
await initializeRequiredFiles();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🛠️  Servidor de diagnóstico en http://0.0.0.0:${PORT}/debug-files`);
  console.log(`🚀 Endpoint principal en http://0.0.0.0:${PORT}/root/superbot1.0`);
  console.log(`❌ Reporte de errores en http://0.0.0.0:${PORT}/errores`);
  console.log(`📋 Errores simples en http://0.0.0.0:${PORT}/errores/simple`);
  console.log(`🔄 Ejecutar runner en http://0.0.0.0:${PORT}/api/execute-runner (POST)`);
});