#!/bin/bash

# 🧪 SCRIPT PARA PROBAR ENDPOINTS - Opción Terminal/Command Line
# Uso: bash test-endpoints.sh
# O copia y pega los comandos en tu terminal

echo "=========================================="
echo "🚀 INICIANDO PRUEBAS DE ENDPOINTS"
echo "=========================================="
echo ""

# Variables
BASE_URL="http://localhost:3010"
TIMESTAMP=$(date +%s%N)

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# 1️⃣ CREAR ALERTA - Juan Pérez
# ============================================
echo -e "${BLUE}1️⃣ POST - Crear Alerta (Juan Pérez)${NC}"
echo "Endpoint: POST /api/whatsapp-alert"
echo ""

RESPONSE_1=$(curl -s -X POST "$BASE_URL/api/whatsapp-alert" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"whatsapp-downline\",
    \"contactName\": \"Juan Pérez\",
    \"chatId\": \"chat-juan-$TIMESTAMP\",
    \"lastMessage\": \"Última actualización fue hace 2 horas\",
    \"detectedAt\": \"$(date -u +'%Y-%m-%dT%H:%M:%SZ')\",
    \"severity\": \"high\",
    \"source\": \"whatsapp-extension\"
  }")

echo "Response:"
echo "$RESPONSE_1" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_1"
echo ""

# Extraer alertId para usarlo después
ALERT_ID_1=$(echo "$RESPONSE_1" | grep -o '"alertId":"[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}Alert ID: $ALERT_ID_1${NC}"
echo ""
echo "---"
echo ""

# ============================================
# 2️⃣ CREAR ALERTA - María García
# ============================================
echo -e "${BLUE}2️⃣ POST - Crear Alerta (María García)${NC}"
echo "Endpoint: POST /api/whatsapp-alert"
echo ""

RESPONSE_2=$(curl -s -X POST "$BASE_URL/api/whatsapp-alert" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"whatsapp-downline\",
    \"contactName\": \"María García\",
    \"chatId\": \"chat-maria-$TIMESTAMP\",
    \"lastMessage\": \"Datos de la campaña X\",
    \"detectedAt\": \"$(date -u +'%Y-%m-%dT%H:%M:%SZ')\",
    \"severity\": \"high\",
    \"source\": \"whatsapp-extension\"
  }")

echo "Response:"
echo "$RESPONSE_2" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_2"
echo ""

ALERT_ID_2=$(echo "$RESPONSE_2" | grep -o '"alertId":"[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}Alert ID: $ALERT_ID_2${NC}"
echo ""
echo "---"
echo ""

# ============================================
# 3️⃣ CREAR ALERTA - Carlos López
# ============================================
echo -e "${BLUE}3️⃣ POST - Crear Alerta (Carlos López)${NC}"
echo "Endpoint: POST /api/whatsapp-alert"
echo ""

RESPONSE_3=$(curl -s -X POST "$BASE_URL/api/whatsapp-alert" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"whatsapp-downline\",
    \"contactName\": \"Carlos López\",
    \"chatId\": \"chat-carlos-$TIMESTAMP\",
    \"lastMessage\": \"¿Qué pasó con el pago?\",
    \"detectedAt\": \"$(date -u +'%Y-%m-%dT%H:%M:%SZ')\",
    \"severity\": \"high\",
    \"source\": \"whatsapp-extension\"
  }")

echo "Response:"
echo "$RESPONSE_3" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_3"
echo ""

ALERT_ID_3=$(echo "$RESPONSE_3" | grep -o '"alertId":"[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}Alert ID: $ALERT_ID_3${NC}"
echo ""
echo "---"
echo ""

# ============================================
# 4️⃣ OBTENER TODAS LAS ALERTAS
# ============================================
echo -e "${BLUE}4️⃣ GET - Obtener Todas las Alertas${NC}"
echo "Endpoint: GET /api/whatsapp-alerts"
echo ""

RESPONSE_ALL=$(curl -s -X GET "$BASE_URL/api/whatsapp-alerts")

echo "Response:"
echo "$RESPONSE_ALL" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_ALL"
echo ""
echo "---"
echo ""

# ============================================
# 5️⃣ OBTENER SOLO ALERTAS ACTIVAS
# ============================================
echo -e "${BLUE}5️⃣ GET - Obtener Solo Alertas Activas${NC}"
echo "Endpoint: GET /api/whatsapp-alerts?status=active"
echo ""

RESPONSE_ACTIVE=$(curl -s -X GET "$BASE_URL/api/whatsapp-alerts?status=active")

echo "Response:"
echo "$RESPONSE_ACTIVE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_ACTIVE"
echo ""
echo "---"
echo ""

# ============================================
# 6️⃣ RESOLVER UNA ALERTA
# ============================================
if [ -n "$ALERT_ID_1" ]; then
    echo -e "${BLUE}6️⃣ PUT - Resolver Alerta${NC}"
    echo "Endpoint: PUT /api/whatsapp-alert/$ALERT_ID_1"
    echo ""

    RESPONSE_PUT=$(curl -s -X PUT "$BASE_URL/api/whatsapp-alert/$ALERT_ID_1" \
      -H "Content-Type: application/json" \
      -d '{"status": "resolved"}')

    echo "Response:"
    echo "$RESPONSE_PUT" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_PUT"
    echo ""
    echo "---"
    echo ""
fi

# ============================================
# 7️⃣ OBTENER ALERTAS RESUELTAS
# ============================================
echo -e "${BLUE}7️⃣ GET - Obtener Solo Alertas Resueltas${NC}"
echo "Endpoint: GET /api/whatsapp-alerts?status=resolved"
echo ""

RESPONSE_RESOLVED=$(curl -s -X GET "$BASE_URL/api/whatsapp-alerts?status=resolved")

echo "Response:"
echo "$RESPONSE_RESOLVED" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_RESOLVED"
echo ""
echo "---"
echo ""

# ============================================
# RESUMEN
# ============================================
echo -e "${GREEN}=========================================="
echo "✅ PRUEBAS COMPLETADAS"
echo "==========================================${NC}"
echo ""
echo "📊 Resumen:"
echo "  ✅ POST 1: Juan Pérez"
echo "  ✅ POST 2: María García"
echo "  ✅ POST 3: Carlos López"
echo "  ✅ GET: Todas las alertas"
echo "  ✅ GET: Alertas activas"
echo "  ✅ PUT: Resolver alerta"
echo "  ✅ GET: Alertas resueltas"
echo ""
echo "📱 Próximo paso:"
echo "  1. Abre http://localhost:3010/informev3/"
echo "  2. Deberías ver las alertas en ROJO"
echo "  3. Prueba el botón 'Resolver'"
echo ""
