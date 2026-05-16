# 🧪 SCRIPT PARA PROBAR ENDPOINTS - PowerShell (Windows)
# Uso: PowerShell -ExecutionPolicy Bypass -File test-endpoints.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 INICIANDO PRUEBAS DE ENDPOINTS" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Variables
$BASE_URL = "http://localhost:3010"
$TIMESTAMP = [long][double]::Parse((Get-Date -UFormat %s).Replace(',','.'))*1000

# ============================================
# 1️⃣ CREAR ALERTA - Juan Pérez
# ============================================
Write-Host "1️⃣ POST - Crear Alerta (Juan Pérez)" -ForegroundColor Blue
Write-Host "Endpoint: POST /api/whatsapp-alert" -ForegroundColor Gray
Write-Host ""

$body1 = @{
    type = "whatsapp-downline"
    contactName = "Juan Pérez"
    chatId = "chat-juan-$TIMESTAMP"
    lastMessage = "Última actualización fue hace 2 horas"
    detectedAt = (Get-Date -AsUTC -Format 'yyyy-MM-ddTHH:mm:ssZ')
    severity = "high"
    source = "whatsapp-extension"
} | ConvertTo-Json

$response1 = Invoke-WebRequest -Uri "$BASE_URL/api/whatsapp-alert" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body1 `
    -UseBasicParsing

$data1 = $response1.Content | ConvertFrom-Json
Write-Host "Status: $($response1.StatusCode)" -ForegroundColor Green
Write-Host "Response:" -ForegroundColor Gray
Write-Host ($data1 | ConvertTo-Json -Depth 5) -ForegroundColor White
Write-Host ""

$ALERT_ID_1 = $data1.alertId
Write-Host "Alert ID: $ALERT_ID_1" -ForegroundColor Green
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# ============================================
# 2️⃣ CREAR ALERTA - María García
# ============================================
Write-Host "2️⃣ POST - Crear Alerta (María García)" -ForegroundColor Blue
Write-Host "Endpoint: POST /api/whatsapp-alert" -ForegroundColor Gray
Write-Host ""

$body2 = @{
    type = "whatsapp-downline"
    contactName = "María García"
    chatId = "chat-maria-$TIMESTAMP"
    lastMessage = "Datos de la campaña X"
    detectedAt = (Get-Date -AsUTC -Format 'yyyy-MM-ddTHH:mm:ssZ')
    severity = "high"
    source = "whatsapp-extension"
} | ConvertTo-Json

$response2 = Invoke-WebRequest -Uri "$BASE_URL/api/whatsapp-alert" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body2 `
    -UseBasicParsing

$data2 = $response2.Content | ConvertFrom-Json
Write-Host "Status: $($response2.StatusCode)" -ForegroundColor Green
Write-Host "Response:" -ForegroundColor Gray
Write-Host ($data2 | ConvertTo-Json -Depth 5) -ForegroundColor White
Write-Host ""

$ALERT_ID_2 = $data2.alertId
Write-Host "Alert ID: $ALERT_ID_2" -ForegroundColor Green
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# ============================================
# 3️⃣ CREAR ALERTA - Carlos López
# ============================================
Write-Host "3️⃣ POST - Crear Alerta (Carlos López)" -ForegroundColor Blue
Write-Host "Endpoint: POST /api/whatsapp-alert" -ForegroundColor Gray
Write-Host ""

$body3 = @{
    type = "whatsapp-downline"
    contactName = "Carlos López"
    chatId = "chat-carlos-$TIMESTAMP"
    lastMessage = "¿Qué pasó con el pago?"
    detectedAt = (Get-Date -AsUTC -Format 'yyyy-MM-ddTHH:mm:ssZ')
    severity = "high"
    source = "whatsapp-extension"
} | ConvertTo-Json

$response3 = Invoke-WebRequest -Uri "$BASE_URL/api/whatsapp-alert" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body3 `
    -UseBasicParsing

$data3 = $response3.Content | ConvertFrom-Json
Write-Host "Status: $($response3.StatusCode)" -ForegroundColor Green
Write-Host "Response:" -ForegroundColor Gray
Write-Host ($data3 | ConvertTo-Json -Depth 5) -ForegroundColor White
Write-Host ""

$ALERT_ID_3 = $data3.alertId
Write-Host "Alert ID: $ALERT_ID_3" -ForegroundColor Green
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# ============================================
# 4️⃣ OBTENER TODAS LAS ALERTAS
# ============================================
Write-Host "4️⃣ GET - Obtener Todas las Alertas" -ForegroundColor Blue
Write-Host "Endpoint: GET /api/whatsapp-alerts" -ForegroundColor Gray
Write-Host ""

$response_all = Invoke-WebRequest -Uri "$BASE_URL/api/whatsapp-alerts" `
    -Method GET `
    -UseBasicParsing

$data_all = $response_all.Content | ConvertFrom-Json
Write-Host "Status: $($response_all.StatusCode)" -ForegroundColor Green
Write-Host "Response:" -ForegroundColor Gray
Write-Host ($data_all | ConvertTo-Json -Depth 5) -ForegroundColor White
Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# ============================================
# 5️⃣ OBTENER SOLO ALERTAS ACTIVAS
# ============================================
Write-Host "5️⃣ GET - Obtener Solo Alertas Activas" -ForegroundColor Blue
Write-Host "Endpoint: GET /api/whatsapp-alerts?status=active" -ForegroundColor Gray
Write-Host ""

$response_active = Invoke-WebRequest -Uri "$BASE_URL/api/whatsapp-alerts?status=active" `
    -Method GET `
    -UseBasicParsing

$data_active = $response_active.Content | ConvertFrom-Json
Write-Host "Status: $($response_active.StatusCode)" -ForegroundColor Green
Write-Host "Response:" -ForegroundColor Gray
Write-Host ($data_active | ConvertTo-Json -Depth 5) -ForegroundColor White
Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# ============================================
# 6️⃣ RESOLVER UNA ALERTA
# ============================================
if ($ALERT_ID_1) {
    Write-Host "6️⃣ PUT - Resolver Alerta" -ForegroundColor Blue
    Write-Host "Endpoint: PUT /api/whatsapp-alert/$ALERT_ID_1" -ForegroundColor Gray
    Write-Host ""

    $body_put = @{
        status = "resolved"
    } | ConvertTo-Json

    $response_put = Invoke-WebRequest -Uri "$BASE_URL/api/whatsapp-alert/$ALERT_ID_1" `
        -Method PUT `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $body_put `
        -UseBasicParsing

    $data_put = $response_put.Content | ConvertFrom-Json
    Write-Host "Status: $($response_put.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Gray
    Write-Host ($data_put | ConvertTo-Json -Depth 5) -ForegroundColor White
    Write-Host ""
    Write-Host "---" -ForegroundColor Gray
    Write-Host ""
}

# ============================================
# 7️⃣ OBTENER ALERTAS RESUELTAS
# ============================================
Write-Host "7️⃣ GET - Obtener Solo Alertas Resueltas" -ForegroundColor Blue
Write-Host "Endpoint: GET /api/whatsapp-alerts?status=resolved" -ForegroundColor Gray
Write-Host ""

$response_resolved = Invoke-WebRequest -Uri "$BASE_URL/api/whatsapp-alerts?status=resolved" `
    -Method GET `
    -UseBasicParsing

$data_resolved = $response_resolved.Content | ConvertFrom-Json
Write-Host "Status: $($response_resolved.StatusCode)" -ForegroundColor Green
Write-Host "Response:" -ForegroundColor Gray
Write-Host ($data_resolved | ConvertTo-Json -Depth 5) -ForegroundColor White
Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# ============================================
# RESUMEN
# ============================================
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✅ PRUEBAS COMPLETADAS" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Resumen:" -ForegroundColor Cyan
Write-Host "  ✅ POST 1: Juan Pérez" -ForegroundColor White
Write-Host "  ✅ POST 2: María García" -ForegroundColor White
Write-Host "  ✅ POST 3: Carlos López" -ForegroundColor White
Write-Host "  ✅ GET: Todas las alertas" -ForegroundColor White
Write-Host "  ✅ GET: Alertas activas" -ForegroundColor White
Write-Host "  ✅ PUT: Resolver alerta" -ForegroundColor White
Write-Host "  ✅ GET: Alertas resueltas" -ForegroundColor White
Write-Host ""
Write-Host "📱 Próximo paso:" -ForegroundColor Cyan
Write-Host "  1. Abre http://localhost:3010/informev3/" -ForegroundColor White
Write-Host "  2. Deberías ver las alertas en ROJO" -ForegroundColor White
Write-Host "  3. Prueba el botón 'Resolver'" -ForegroundColor White
Write-Host ""

# Pausa para ver los resultados
Write-Host "Presiona una tecla para cerrar..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
