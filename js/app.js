// --- CONFIGURACIÓN DE SAAS ---
const GEMINI_KEY_STORAGE = "gemini_api_key";
const SESSION_ID_STORAGE = "controlcostos_session_id";
const THEME_STORAGE = "controlcostos_theme";

// Nueva API Key de Gemini del usuario (proyecto presus)
const DEFAULT_API_KEY = "AQ.Ab8RN6ILjMOP2gvJWu3qL2U5mAW1hKE-1HRCLLeK-kvhls7aSA";

let sessionId = localStorage.getItem(SESSION_ID_STORAGE);
if (!sessionId) {
    sessionId = "saas_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem(SESSION_ID_STORAGE, sessionId);
}

// Forzar la actualización del LocalStorage con la nueva API Key
let geminiApiKey = DEFAULT_API_KEY;
localStorage.setItem(GEMINI_KEY_STORAGE, DEFAULT_API_KEY);

// Historial del chat en memoria
let chatHistory = [];
// Gráficos cargados
let chartInstances = {};
// Listado en memoria para búsquedas en historial
let localHistoryList = [];
// Cálculo activo actual
let activeCalculo = null;

// Categorías iniciales del chat
const CATEGORIAS_INICIALES = [
    "Costo de un producto",
    "Costo de un servicio",
    "Presupuesto de construcción",
    "Presupuesto de carpintería",
    "Costo de restaurante",
    "Costo de fabricación",
    "Otro"
];

// --- ENRUTADOR Y VISTAS ---
function navegarA(viewId) {
    document.querySelectorAll(".view-section").forEach(sec => sec.classList.add("d-none"));
    document.querySelectorAll(".nav-link-custom").forEach(link => link.classList.remove("active"));
    
    document.getElementById(viewId).classList.remove("d-none");
    const activeTab = document.getElementById("tab-" + viewId);
    if (activeTab) activeTab.classList.add("active");
    
    // Carga dinámica de datos por pestaña
    if (viewId === "view-dashboard") {
        cargarDashboardStats();
    } else if (viewId === "view-history") {
        cargarHistorialCompleto();
    }
}
window.navegarA = navegarA;

function iniciarCalculoIA() {
    navegarA("view-chat");
    if (chatHistory.length === 0) {
        enviarMensajeInicialBot();
    }
}
window.iniciarCalculoIA = iniciarCalculoIA;

// --- TEMA CLARO / OSCURO ---
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE) || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem(THEME_STORAGE, newTheme);
    updateThemeIcon(newTheme);
    
    // Re-dibujar gráficos para ajustar colores en modo oscuro si hay cálculos activos
    if (activeCalculo) {
        dibujarGraficosResultados(activeCalculo);
    }
}
window.toggleTheme = toggleTheme;

function updateThemeIcon(theme) {
    const icon = document.getElementById("theme-icon");
    if (theme === "dark") {
        icon.className = "fa-solid fa-sun";
    } else {
        icon.className = "fa-solid fa-moon";
    }
}

// --- CHAT CON GEMINI ---
function enviarMensajeInicialBot() {
    const welcome = "¡Hola! Soy tu consultor de costos y presupuestos inteligente. ¿Qué deseas calcular hoy?";
    recibirMensajeBot(welcome);
    renderOpcionesRapidas(CATEGORIAS_INICIALES);
}

// --- MODO DEMO (Sin API de Gemini) ---
async function activarModoDemo(numProductos = 1) {
    // Navegar al chat y limpiar
    chatHistory = [];
    document.getElementById("chat-messages").innerHTML = "";
    document.getElementById("quick-options").innerHTML = "";
    navegarA("view-chat");

    let demoConversacion = [];
    let demoProductos = [];

    const convHamburguesa = [
        { rol: "bot",  texto: "¡Hola! Soy ControlCostos AI. ¿Cuál es el tipo de negocio que deseas analizar?" },
        { rol: "user", texto: "Tengo un restaurante" },
        { rol: "bot",  texto: "Perfecto. ¿Cuál es el nombre del primer producto que deseas calcular?" },
        { rol: "user", texto: "Hamburguesa Gourmet" },
        { rol: "bot",  texto: "¿Cuáles son los ingredientes principales y su costo por unidad? (suma total)" },
        { rol: "user", texto: "Carne Bs. 3.00, Pan Bs. 0.80, Queso Bs. 1.00, Salsas Bs. 0.30, Lechuga Bs. 0.20, Huevo Bs. 0.70 → Total Bs. 6.00" },
        { rol: "bot",  texto: "¿Cuál es el costo de mano de obra por hamburguesa?" },
        { rol: "user", texto: "Bs. 3.00 por unidad" },
        { rol: "bot",  texto: "¿Cuáles son los costos indirectos fijos mensuales divididos entre las unidades que produces?" },
        { rol: "user", texto: "Alquiler Bs. 800 + Luz Bs. 120 + Gas Bs. 80 = Bs. 1000 entre 500 unidades = Bs. 2.00 por unidad" },
        { rol: "bot",  texto: "¿Qué porcentaje de ganancia deseas sobre el costo?" },
        { rol: "user", texto: "40% de ganancia" },
        { rol: "bot",  texto: "¿Cuántas hamburguesas estimas vender al mes?" },
        { rol: "user", texto: "500 unidades al mes" }
    ];

    const convPolloBrasa = [
        { rol: "bot",  texto: "✅ Hamburguesa Gourmet registrada. ¿Deseas agregar otro producto? Si es así, dime el nombre. Si terminaste, escribe 'listo'." },
        { rol: "user", texto: "Sí, quiero calcular el Pollo a la Brasa" },
        { rol: "bot",  texto: "¿Costo de ingredientes del Pollo a la Brasa por porción?" },
        { rol: "user", texto: "Total Bs. 1.50 por porción" },
        { rol: "bot",  texto: "¿Mano de obra y costos fijos por porción de pollo?" },
        { rol: "user", texto: "Mano de obra Bs. 0.60 | Fijos Bs. 0.80" },
        { rol: "bot",  texto: "¿Porcentaje de ganancia y unidades estimadas de pollo al mes?" },
        { rol: "user", texto: "30% de ganancia | 300 porciones al mes" }
    ];

    const convPolloBroaster = [
        { rol: "bot",  texto: "✅ Pollo a la Brasa registrado. ¿Tienes otro producto o escribes 'listo' para ver los resultados?" },
        { rol: "user", texto: "Sí, agreguemos Pollo a la Broaster" },
        { rol: "bot",  texto: "¿Cuáles son los costos detallados del Pollo a la Broaster?" },
        { rol: "user", texto: "Ingredientes Bs. 1.80 | Mano de Obra Bs. 0.70 | Fijos Bs. 0.90 | Utilidad 40% | Ventas 400 unidades al mes" }
    ];

    const prodHamburguesa = {
        nombre: "Hamburguesa Gourmet",
        categoria: "Restaurante",
        costo_materiales: 6.00,
        mano_obra: 3.00,
        costos_indirectos: 2.00,
        utilidad: 40,
        ventas_estimadas: 500
    };

    const prodPolloBrasa = {
        nombre: "Pollo a la Brasa",
        categoria: "Restaurante",
        costo_materiales: 1.50,
        mano_obra: 0.60,
        costos_indirectos: 0.80,
        utilidad: 30,
        ventas_estimadas: 300
    };

    const prodPolloBroaster = {
        nombre: "Pollo a la Broaster",
        categoria: "Restaurante",
        costo_materiales: 1.80,
        mano_obra: 0.70,
        costos_indirectos: 0.90,
        utilidad: 40,
        ventas_estimadas: 400
    };

    // Armar la simulación dependiendo del parámetro
    if (numProductos === 1) {
        demoConversacion = convHamburguesa.concat([
            { rol: "bot", texto: "✅ Hamburguesa Gourmet registrada. ¿Deseas agregar otro producto? Si es así, dime el nombre. Si terminaste, escribe 'listo'." },
            { rol: "user", texto: "listo" },
            { rol: "bot", texto: "✅ Perfecto. Generando reporte financiero detallado..." }
        ]);
        demoProductos = [prodHamburguesa];
    } else if (numProductos === 2) {
        demoConversacion = convHamburguesa.concat(convPolloBrasa).concat([
            { rol: "bot",  texto: "✅ Pollo a la Brasa registrado. ¿Tienes otro producto o escribes 'listo' para ver los resultados?" },
            { rol: "user", texto: "listo" },
            { rol: "bot",  texto: "✅ Perfecto. Generando análisis comparativo de ambos productos..." }
        ]);
        demoProductos = [prodHamburguesa, prodPolloBrasa];
    } else {
        demoConversacion = convHamburguesa.concat(convPolloBrasa).concat(convPolloBroaster).concat([
            { rol: "bot",  texto: "✅ Pollo a la Broaster registrado. ¿Tienes otro producto o escribes 'listo' para ver los resultados?" },
            { rol: "user", texto: "listo" },
            { rol: "bot",  texto: "✅ Perfecto. Generando análisis comparativo de los 3 productos..." }
        ]);
        demoProductos = [prodHamburguesa, prodPolloBrasa, prodPolloBroaster];
    }

    // Reproducir conversación con delays para efecto visual
    const delay = (ms) => new Promise(res => setTimeout(res, ms));
    const box = document.getElementById("chat-messages");

    for (const msg of demoConversacion) {
        await delay(250); // Un poco más rápido para mejorar UX al simular
        box.innerHTML += `<div class="chatbot-message ${msg.rol === "bot" ? "bot" : "user"}">${msg.texto}</div>`;
        box.scrollTop = box.scrollHeight;
    }

    await delay(600);

    // Enviar al backend PHP real para procesar y guardar (multi-producto)
    enviarAlBackendMVC(demoProductos);
}
window.activarModoDemo = activarModoDemo;

function renderOpcionesRapidas(opciones) {
    const container = document.getElementById("quick-options");
    container.innerHTML = "";
    opciones.forEach(opt => {
        const btn = document.createElement("button");
        btn.className = "quick-opt-btn";
        btn.innerText = opt;
        btn.onclick = () => {
            enviarMensajeUsuario(opt);
            container.innerHTML = "";
        };
        container.appendChild(btn);
    });
}

function enviarMensajeUsuario(text) {
    const box = document.getElementById("chat-messages");
    box.innerHTML += `<div class="chatbot-message user">${text}</div>`;
    box.scrollTop = box.scrollHeight;
    
    chatHistory.push({ role: "user", parts: [{ text: text }] });
    consultarIA();
}

async function consultarIA(reintentoNum = 0) {
    const box = document.getElementById("chat-messages");
    const loadingId = "load-" + Date.now();
    box.innerHTML += `<div class="chatbot-message bot" id="${loadingId}"><i>Consultor analizando datos...</i></div>`;
    box.scrollTop = box.scrollHeight;
    
    const systemPrompt = `Eres ControlCostos AI, un Consultor Financiero Experto en costos, precios y presupuestos para negocios en Bolivia.

MODO MULTI-PRODUCTO: Puedes analizar varios productos del mismo negocio en una sola sesión de chat.

== FLUJO OBLIGATORIO ==
PASO 1 - Al iniciar, pregunta el tipo de negocio o categoría (una sola vez).
PASO 2 - Para CADA producto, recopila estos datos uno por uno (un mensaje por dato):
  a) Nombre del producto
  b) Costos de materiales o insumos por unidad (suma de todos)
  c) Costo de mano de obra por unidad
  d) Costos indirectos fijos por unidad (alquiler, luz, gas, etc. divididos entre unidades estimadas)
  e) Porcentaje de utilidad o ganancia deseada (ej: 40%)
  f) Cantidad de unidades estimadas a vender por mes
PASO 3 - Después de completar cada producto, pregunta SIEMPRE: "¿Deseas agregar otro producto para analizar? Si es así, dime el nombre. Si terminaste, escribe 'listo'."
PASO 4 - Cuando el usuario diga 'listo', 'no', 'terminar', 'eso es todo' o similar → genera el JSON final.

== REGLAS ==
- NUNCA respondas preguntas fuera de finanzas, costos o presupuestos.
- NUNCA hagas los cálculos tú mismo en el texto.
- Pide UN dato por mensaje, no varios a la vez.
- Si el usuario da varios datos juntos, úsalos todos sin volver a preguntar.

== FORMATO JSON FINAL ==
Cuando el usuario diga 'listo', genera ÚNICAMENTE este bloque con TODOS los productos recopilados:

<chart-data>
[
  {
    "nombre": "Hamburguesa Gourmet",
    "categoria": "Restaurante",
    "costo_materiales": 6.00,
    "mano_obra": 3.00,
    "costos_indirectos": 2.00,
    "utilidad": 40,
    "ventas_estimadas": 500
  }
]
</chart-data>

Si hay varios productos, inclúyelos a todos como objetos dentro del array.
Donde:
- nombre: nombre del producto/servicio
- categoria: tipo de negocio indicado al inicio
- costo_materiales: suma de materiales/insumos por unidad
- mano_obra: costo de mano de obra por unidad
- costos_indirectos: costos fijos divididos entre unidades estimadas (valor por unidad)
- utilidad: porcentaje de ganancia deseada (número, ej: 40)
- ventas_estimadas: unidades a vender por mes
`;
    
    try {
        let contents = [{ role: "user", parts: [{ text: systemPrompt }] }].concat(chatHistory);
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: contents })
        });
        
        // --- MANEJO AUTOMÁTICO DE RATE LIMIT (429) ---
        if (response.status === 429) {
            const loading = document.getElementById(loadingId);
            if (loading) loading.remove();

            const MAX_RETRIES = 4;
            if (reintentoNum >= MAX_RETRIES) {
                recibirMensajeBot("⚠️ El límite de solicitudes por minuto de Gemini se ha agotado. Por favor espera 1 minuto y vuelve a intentarlo.");
                return;
            }

            const esperas = [15, 20, 30, 45];
            const segundos = esperas[reintentoNum] || 45;
            
            const countdownId = "countdown-" + Date.now();
            box.innerHTML += `<div class="chatbot-message bot" id="${countdownId}">⏳ Límite de velocidad de Gemini alcanzado. Reintentando automáticamente en <strong id="cd-num-${countdownId}">${segundos}</strong>s...</div>`;
            box.scrollTop = box.scrollHeight;

            let remaining = segundos;
            const intervalId = setInterval(() => {
                remaining--;
                const cdEl = document.getElementById(`cd-num-${countdownId}`);
                if (cdEl) cdEl.innerText = remaining;
                if (remaining <= 0) clearInterval(intervalId);
            }, 1000);

            setTimeout(() => {
                const countdownMsg = document.getElementById(countdownId);
                if (countdownMsg) countdownMsg.remove();
                consultarIA(reintentoNum + 1);
            }, segundos * 1000);

            return;
        }

        // Si el estado HTTP no es exitoso (diferente de 200 y 429)
        if (!response.ok && response.status !== 429) {
            const loading = document.getElementById(loadingId);
            if (loading) loading.remove();
            
            let errMsg = `⚠️ Error HTTP ${response.status} de la IA.`;
            try {
                const errData = await response.json();
                if (errData.error && errData.error.message) {
                    errMsg += `<br><small class='text-muted'>Detalle: ${errData.error.message}</small>`;
                }
            } catch (e) {
                const rawText = await response.text();
                errMsg += `<br><small class='text-muted'>Respuesta cruda: ${rawText.substring(0, 100)}</small>`;
            }
            recibirMensajeBot(errMsg);
            return;
        }

        const data = await response.json();
        const loading = document.getElementById(loadingId);
        if (loading) loading.remove();
        
        let reply = "";
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
            reply = data.candidates[0].content.parts[0].text;
            chatHistory.push({ role: "model", parts: [{ text: reply }] });
            recibirMensajeBot(reply);
        } else {
            console.error("Gemini Error:", data);
            let msg = "⚠️ Ocurrió un error inesperado al procesar el mensaje con Gemini.";
            if (data.error && data.error.message) {
                msg += `<br><small class='text-muted'>Detalle: ${data.error.message}</small>`;
            }
            recibirMensajeBot(msg);
        }
    } catch (err) {
        const loading = document.getElementById(loadingId);
        if (loading) loading.remove();
        recibirMensajeBot("⚠️ Error de conexión o red con el asistente de IA (Gemini).");
        console.error(err);
    }
}

function recibirMensajeBot(text) {
    const box = document.getElementById("chat-messages");
    
    // Interceptar JSON final (ahora siempre es un array)
    let match = text.match(/<chart-data>([\s\S]*?)<\/chart-data>/);
    if (match) {
        try {
            let rawJson = JSON.parse(match[1].trim());
            // Normalizar: si viene un objeto solo, convertir a array
            if (!Array.isArray(rawJson)) rawJson = [rawJson];
            enviarAlBackendMVC(rawJson);
            return;
        } catch (e) {
            console.error("JSON de análisis corrupto de Gemini:", e);
        }
    }
    
    let textLimpio = text.replace(/\n/g, "<br>")
                         .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                         .replace(/\*(.*?)\*/g, "<em>$1</em>");
                         
    box.innerHTML += `<div class="chatbot-message bot">${textLimpio}</div>`;
    box.scrollTop = box.scrollHeight;
}

function reiniciarChat() {
    if (confirm("¿Estás seguro de que deseas reiniciar la conversación actual?")) {
        chatHistory = [];
        document.getElementById("chat-messages").innerHTML = "";
        enviarMensajeInicialBot();
    }
}
window.reiniciarChat = reiniciarChat;

// --- COMUNICACIÓN CON PHP MVC (MULTI-PRODUCTO) ---
async function enviarAlBackendMVC(productosArray) {
    const box = document.getElementById("chat-messages");
    const loaderId = "save-" + Date.now();
    const total = productosArray.length;
    const etiqueta = total > 1 ? `${total} productos` : "el producto";
    box.innerHTML += `<div class="chatbot-message bot" id="${loaderId}">⚙️ <i>Procesando ${etiqueta} y generando reportes financieros...</i></div>`;
    box.scrollTop = box.scrollHeight;
    
    const idsGuardados = [];
    const errores = [];

    try {
        // Enviar cada producto al backend individualmente
        for (let i = 0; i < productosArray.length; i++) {
            const producto = productosArray[i];
            
            // Actualizar mensaje de progreso si hay varios
            if (total > 1) {
                const loader = document.getElementById(loaderId);
                if (loader) loader.innerHTML = `⚙️ <i>Procesando producto ${i + 1} de ${total}: <strong>${producto.nombre}</strong>...</i>`;
            }

            const payload = {
                session_id: sessionId,
                apiKey: geminiApiKey,
                raw_json: producto
            };

            const response = await fetch("api/index.php?route=calculos/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const res = await response.json();

            if (res.success) {
                idsGuardados.push(res.id);
            } else {
                errores.push(`${producto.nombre}: ${res.error || "error desconocido"}`);
            }
        }

        const loader = document.getElementById(loaderId);
        if (loader) loader.remove();

        if (idsGuardados.length === 0) {
            recibirMensajeBot("⚠️ No se pudo guardar ningún producto. Errores: " + errores.join(", "));
            return;
        }

        if (errores.length > 0) {
            const box = document.getElementById("chat-messages");
            box.innerHTML += `<div class="chatbot-message bot">⚠️ Algunos productos tuvieron error: ${errores.join(", ")}</div>`;
        }

        // Mostrar resultados: comparativo si hay varios, individual si hay uno
        if (idsGuardados.length === 1) {
            cargarResultadosPantalla(idsGuardados[0]);
        } else {
            cargarResultadosComparativos(idsGuardados);
        }

    } catch (err) {
        const loader = document.getElementById(loaderId);
        if (loader) loader.remove();
        recibirMensajeBot("⚠️ Error de conexión con la API REST PHP.");
        console.error(err);
    }
}

// --- RESULTADOS COMPARATIVOS (MULTI-PRODUCTO) ---
async function cargarResultadosComparativos(ids) {
    try {
        // Cargar detalle de cada producto
        const calculos = await Promise.all(ids.map(id =>
            fetch(`api/index.php?route=calculos/detail&id=${id}`).then(r => r.json())
        ));

        // Activar pestaña de resultados
        document.getElementById("tab-view-results").classList.remove("d-none");
        navegarA("view-results");

        // Mostrar contenedor multi-producto y ocultar el individual
        document.getElementById("results-single-container").classList.add("d-none");
        document.getElementById("results-multi-container").classList.remove("d-none");

        // Título general
        const categoria = calculos[0]?.categoria || "Análisis";
        document.getElementById("results-title").innerText = `Comparativo: ${categoria}`;
        document.getElementById("results-category").innerText = `${calculos.length} productos analizados`;

        const colores = ["text-danger", "text-success", "text-primary", "text-warning", "text-info", "text-secondary"];
        const emojis = ["🍔", "🍗", "🍕", "🌮", "🥗", "🍣", "🥩", "🍝"];

        // --- 1. Construir Tabla Comparativa ---
        let tableHTML = `
        <div class="kpi-saas-card" style="overflow-x:auto;">
            <h6 class="fw-bold mb-3">📊 Tabla Comparativa de Productos</h6>
            <table class="table table-bordered table-hover mb-0" style="min-width:600px;">
                <thead class="table-dark">
                <tr>
                    <th>Indicador</th>
                    ${calculos.map((c, i) => `<th class="${colores[i % colores.length]}">${emojis[i % emojis.length]} ${c.nombre}</th>`).join("")}
                </tr>
                </thead>
                <tbody>
                <tr>
                    <td><strong>💰 Costo Total</strong><br><small class="text-muted">Todo lo que gastas</small></td>
                    ${calculos.map(c => `<td class="fw-bold">Bs. ${parseFloat(c.total_costo).toFixed(2)}</td>`).join("")}
                </tr>
                <tr>
                    <td><strong>🔢 Costo Unitario</strong><br><small class="text-muted">Costo por unidad</small></td>
                    ${calculos.map(c => `<td>Bs. ${parseFloat(c.resultados_json?.costo_unitario || 0).toFixed(2)}</td>`).join("")}
                </tr>
                <tr>
                    <td><strong>🏷️ Precio Sugerido</strong><br><small class="text-muted">Precio mínimo de venta</small></td>
                    ${calculos.map(c => `<td class="fw-bold text-success">Bs. ${parseFloat(c.precio_sugerido).toFixed(2)}</td>`).join("")}
                </tr>
                <tr>
                    <td><strong>📈 ROI</strong><br><small class="text-muted">Retorno de inversión</small></td>
                    ${calculos.map(c => `<td class="text-primary fw-bold">${parseFloat(c.roi).toFixed(1)}%</td>`).join("")}
                </tr>
                <tr>
                    <td><strong>💵 Ganancia Neta Total</strong><br><small class="text-muted">Utilidad mensual</small></td>
                    ${calculos.map(c => `<td class="text-success">Bs. ${parseFloat(c.resultados_json?.ganancia_neta || 0).toFixed(2)}</td>`).join("")}
                </tr>
                <tr>
                    <td><strong>⚖️ Punto de Equilibrio</strong><br><small class="text-muted">Unidades mínimas</small></td>
                    ${calculos.map(c => `<td class="text-warning fw-bold">${c.pe_unidades} uds</td>`).join("")}
                </tr>
                <tr>
                    <td><strong>🎯 Margen de Utilidad</strong><br><small class="text-muted">% ganancia sobre venta</small></td>
                    ${calculos.map(c => `<td>${parseFloat(c.resultados_json?.porcentaje_utilidad || 0).toFixed(1)}%</td>`).join("")}
                </tr>
                </tbody>
            </table>
        </div>`;
        document.getElementById("multi-table-wrapper").innerHTML = tableHTML;

        // --- 2. Construir Gráficos Comparativos ---
        document.getElementById("multi-charts-wrapper").innerHTML = `
        <div class="col-md-6">
            <div class="graph-saas-card">
            <h6 class="fw-bold mb-3"><i class="fa-solid fa-chart-bar text-primary me-2"></i>ROI por Producto</h6>
            <canvas id="chart-comparativo-roi" style="max-height:250px;"></canvas>
            </div>
        </div>
        <div class="col-md-6">
            <div class="graph-saas-card">
            <h6 class="fw-bold mb-3"><i class="fa-solid fa-chart-pie text-success me-2"></i>Ganancia Neta por Producto</h6>
            <canvas id="chart-comparativo-ganancia" style="max-height:250px;"></canvas>
            </div>
        </div>`;

        const coloresPaleta = ["#6366f1","#22c55e","#f59e0b","#ef4444","#06b6d4","#a855f7"];

        new Chart(document.getElementById("chart-comparativo-roi"), {
            type: "bar",
            data: {
                labels: calculos.map(c => c.nombre),
                datasets: [{
                    label: "ROI (%)",
                    data: calculos.map(c => parseFloat(c.roi).toFixed(1)),
                    backgroundColor: coloresPaleta.slice(0, calculos.length),
                    borderRadius: 8
                }]
            },
            options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => v + "%" } } } }
        });

        new Chart(document.getElementById("chart-comparativo-ganancia"), {
            type: "doughnut",
            data: {
                labels: calculos.map(c => c.nombre),
                datasets: [{
                    data: calculos.map(c => parseFloat(c.resultados_json?.ganancia_neta || 0).toFixed(2)),
                    backgroundColor: coloresPaleta.slice(0, calculos.length),
                    borderWidth: 2
                }]
            },
            options: { plugins: { legend: { position: "bottom" } } }
        });

        // --- 3. Construir Acordeones de Detalle Individual ---
        let accordionHTML = "";
        calculos.forEach((c, idx) => {
            const accordionId = `collapseProd-${c.id}`;
            const isFirst = idx === 0;

            accordionHTML += `
            <div class="accordion-item shadow-sm mb-2 rounded border">
                <h2 class="accordion-header" id="heading-${c.id}">
                    <button class="accordion-button ${isFirst ? '' : 'collapsed'} fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#${accordionId}" aria-expanded="${isFirst}" aria-controls="${accordionId}">
                        ${emojis[idx % emojis.length]} ${c.nombre} &mdash; ROI: ${parseFloat(c.roi).toFixed(1)}% | Precio: Bs. ${parseFloat(c.precio_sugerido).toFixed(2)}
                    </button>
                </h2>
                <div id="${accordionId}" class="accordion-collapse collapse ${isFirst ? 'show' : ''}" aria-labelledby="heading-${c.id}" data-bs-parent="#accordionDetallesProductos">
                    <div class="accordion-body bg-light-subtle">
                        
                        <!-- KPIs de este producto específico -->
                        <div class="row g-3 mb-4">
                            <div class="col-md-4 col-sm-6">
                                <div class="kpi-saas-card h-100 bg-white">
                                    <span class="kpi-label">💰 Costo Total</span>
                                    <h3 class="kpi-val text-danger">Bs. ${parseFloat(c.total_costo).toFixed(2)}</h3>
                                    <span class="kpi-subtext">Fijos: Bs. ${parseFloat(c.costo_fijo).toFixed(2)} | Var: Bs. ${parseFloat(c.costo_variable).toFixed(2)}</span>
                                    <p class="kpi-desc">Costo total de producción o entrega de este producto en el mes.</p>
                                </div>
                            </div>
                            <div class="col-md-4 col-sm-6">
                                <div class="kpi-saas-card h-100 bg-white">
                                    <span class="kpi-label">🏷️ Precio Sugerido</span>
                                    <h3 class="kpi-val text-success">Bs. ${parseFloat(c.precio_sugerido).toFixed(2)}</h3>
                                    <span class="kpi-subtext">Margen deseado: ${c.resultados_json?.porcentaje_utilidad}%</span>
                                    <p class="kpi-desc">El precio sugerido final para garantizar tu margen de utilidad.</p>
                                </div>
                            </div>
                            <div class="col-md-4 col-sm-6">
                                <div class="kpi-saas-card h-100 bg-white">
                                    <span class="kpi-label">📈 ROI</span>
                                    <h3 class="kpi-val text-primary">${parseFloat(c.roi).toFixed(1)}%</h3>
                                    <span class="kpi-subtext">Ganancia Neta: Bs. ${parseFloat(c.resultados_json?.ganancia_neta || 0).toFixed(2)}</span>
                                    <p class="kpi-desc">Porcentaje de retorno neto sobre el costo invertido.</p>
                                </div>
                            </div>
                            <div class="col-md-4 col-sm-6">
                                <div class="kpi-saas-card h-100 bg-white">
                                    <span class="kpi-label">⚖️ Punto de Equilibrio</span>
                                    <h3 class="kpi-val text-warning">${c.pe_unidades} uds</h3>
                                    <span class="kpi-subtext">Ingresos requeridos: Bs. ${parseFloat(c.resultados_json?.pe_ingresos || 0).toFixed(2)}</span>
                                    <p class="kpi-desc">Unidades mensuales requeridas para cubrir costos fijos y variables.</p>
                                </div>
                            </div>
                            <div class="col-md-4 col-sm-6">
                                <div class="kpi-saas-card h-100 bg-white">
                                    <span class="kpi-label">🔢 Costo por Unidad</span>
                                    <h3 class="kpi-val">Bs. ${parseFloat(c.resultados_json?.costo_unitario || 0).toFixed(2)}</h3>
                                    <span class="kpi-subtext">Costo variable unitario: Bs. ${parseFloat(c.resultados_json?.originales?.costo_materiales || 0).toFixed(2)}</span>
                                    <p class="kpi-desc">Costo unitario promedio que resulta de dividir costo total entre ventas.</p>
                                </div>
                            </div>
                        </div>

                        <!-- Gráficos de este producto específico -->
                        <div class="row g-3">
                            <div class="col-md-6">
                                <div class="graph-saas-card bg-white">
                                    <h6 class="fw-bold mb-2">Distribución de Costos</h6>
                                    <canvas id="chart-dist-prod-${c.id}" style="max-height: 200px;"></canvas>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="graph-saas-card bg-white">
                                    <h6 class="fw-bold mb-2">Costos vs Utilidad</h6>
                                    <canvas id="chart-barras-prod-${c.id}" style="max-height: 200px;"></canvas>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>`;
        });

        document.getElementById("accordionDetallesProductos").innerHTML = accordionHTML;

        // Renderizar los gráficos de cada acordeón usando un mini setTimeout para asegurar la carga del DOM
        setTimeout(() => {
            calculos.forEach(c => {
                const distCanvas = document.getElementById(`chart-dist-prod-${c.id}`);
                const barCanvas = document.getElementById(`chart-barras-prod-${c.id}`);

                if (distCanvas && barCanvas) {
                    new Chart(distCanvas.getContext("2d"), {
                        type: "pie",
                        data: {
                            labels: ["Materiales", "Mano de Obra", "Costos Indirectos"],
                            datasets: [{
                                data: [
                                    parseFloat(c.resultados_json?.originales?.costo_materiales || 0),
                                    parseFloat(c.resultados_json?.originales?.mano_obra || 0),
                                    parseFloat(c.resultados_json?.originales?.costos_indirectos || 0)
                                ],
                                backgroundColor: ["#6366f1", "#10b981", "#f59e0b"]
                            }]
                        },
                        options: { responsive: true }
                    });

                    new Chart(barCanvas.getContext("2d"), {
                        type: "bar",
                        data: {
                            labels: ["Fijos", "Variables", "Ganancia"],
                            datasets: [{
                                data: [
                                    parseFloat(c.costo_fijo),
                                    parseFloat(c.costo_variable),
                                    parseFloat(c.resultados_json?.ganancia_neta || 0)
                                ],
                                backgroundColor: ["#f59e0b", "#6366f1", "#10b981"]
                            }]
                        },
                        options: { responsive: true, plugins: { legend: { display: false } } }
                    });
                }
            });
        }, 150);

        // --- 4. Renderizar Recomendaciones de Gemini ---
        const recomEl = document.getElementById("results-recommendations");
        if (recomEl) {
            let recomHTML = "";
            calculos.forEach((c, i) => {
                if (c.recomendaciones_texto) {
                    recomHTML += `<p class="fw-bold mb-1 mt-2">${emojis[i % emojis.length]} ${c.nombre}:</p>`;
                    c.recomendaciones_texto.split("\n").forEach(line => {
                        const clean = line.replace(/^[\s0-9•.\-CHECK✓]+/i, "").trim();
                        if (clean) recomHTML += `<p class="mb-1 ms-3"><i class="fa-solid fa-check text-success me-2"></i>${clean}</p>`;
                    });
                }
            });
            recomEl.innerHTML = recomHTML || "<p>Sin recomendaciones disponibles.</p>";
        }

        // Actualizar dashboard
        cargarDashboardStats();

    } catch (err) {
        console.error("Error cargando resultados comparativos:", err);
        alert("Error al cargar los resultados comparativos.");
    }
}
window.cargarResultadosComparativos = cargarResultadosComparativos;


async function cargarResultadosPantalla(calculoId) {
    try {
        const response = await fetch(`api/index.php?route=calculos/detail&id=${calculoId}`);
        const data = await response.json();
        if (data.error) {
            alert(data.error);
            return;
        }

        // Mostrar contenedor individual y ocultar el comparativo
        document.getElementById("results-single-container").classList.remove("d-none");
        document.getElementById("results-multi-container").classList.add("d-none");

        activeCalculo = data;
        
        // Habilitar pestaña de resultados
        document.getElementById("tab-view-results").classList.remove("d-none");
        navegarA("view-results");
        
        // Cargar títulos
        document.getElementById("results-title").innerText = data.nombre;
        document.getElementById("results-category").innerText = "Categoría: " + data.categoria;
        
        // Rellenar KPIs
        document.getElementById("kpi-costo-total").innerText = `Bs. ${parseFloat(data.total_costo).toFixed(2)}`;
        document.getElementById("kpi-costo-desglose").innerText = `Fijos: Bs. ${parseFloat(data.costo_fijo).toFixed(2)} | Var: Bs. ${parseFloat(data.costo_variable).toFixed(2)}`;
        
        document.getElementById("kpi-precio-sugerido").innerText = `Bs. ${parseFloat(data.precio_sugerido).toFixed(2)}`;
        document.getElementById("kpi-margen-porcentaje").innerText = `Margen: ${data.resultados_json.porcentaje_utilidad}%`;
        
        document.getElementById("kpi-roi").innerText = `${data.roi}%`;
        document.getElementById("kpi-ganancia-neta").innerText = `Neta: Bs. ${parseFloat(data.resultados_json.ganancia_neta).toFixed(2)}`;
        
        document.getElementById("kpi-pe-unidades").innerText = `${data.pe_unidades} uds`;
        document.getElementById("kpi-pe-ingresos").innerText = `Ventas req: Bs. ${parseFloat(data.resultados_json.pe_ingresos).toFixed(2)}`;
        
        document.getElementById("kpi-costo-unitario").innerText = `Bs. ${parseFloat(data.resultados_json.costo_unitario ?? 0).toFixed(2)}`;
        
        // Rellenar recomendaciones
        let recomHTML = "";
        data.recomendaciones_texto.split("\n").forEach(line => {
            if (line.trim()) {
                const cleanLine = line.replace(/^[\s0-9•.\-CHECK✓]+/i, "").trim();
                if (cleanLine) {
                    recomHTML += `<p class="mb-2"><i class="fa-solid fa-check text-success me-2"></i>${cleanLine}</p>`;
                }
            }
        });
        document.getElementById("results-recommendations").innerHTML = recomHTML || "<p>Sin recomendaciones disponibles.</p>";
        
        // Dibujar los 4 gráficos de Chart.js
        dibujarGraficosResultados(data);
        
    } catch (err) {
        console.error(err);
        alert("Error al cargar reporte de resultados.");
    }
}

function dibujarGraficosResultados(data) {
    // Destruir gráficos anteriores si existen
    Object.values(chartInstances).forEach(chart => chart.destroy());
    
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const textStyleColor = isDark ? "#9ca3af" : "#64748b";
    const gridColor = isDark ? "#1f2937" : "#e2e8f0";
    
    // 1. Gráfico de Pastel: Distribución de Costos
    const ctx1 = document.getElementById("chart-distribucion").getContext("2d");
    chartInstances["chart-distribucion"] = new Chart(ctx1, {
        type: "pie",
        data: {
            labels: ["Materiales", "Mano de Obra", "Costos Indirectos"],
            datasets: [{
                data: [
                    parseFloat(data.resultados_json.originales.costo_materiales || 0),
                    parseFloat(data.resultados_json.originales.mano_obra || 0),
                    parseFloat(data.resultados_json.originales.costos_indirectos || 0)
                ],
                backgroundColor: ["#4f46e5", "#10b981", "#f59e0b"]
            }]
        },
        options: { responsive: true, plugins: { legend: { labels: { color: textStyleColor } } } }
    });

    // 2. Gráfico de Barras: Costos vs Utilidad
    const ctx2 = document.getElementById("chart-barras").getContext("2d");
    chartInstances["chart-barras"] = new Chart(ctx2, {
        type: "bar",
        data: {
            labels: ["Fijos", "Variables", "Ganancia Neta"],
            datasets: [{
                label: "Monto (Bs.)",
                data: [
                    parseFloat(data.costo_fijo),
                    parseFloat(data.costo_variable),
                    parseFloat(data.resultados_json.ganancia_neta)
                ],
                backgroundColor: ["#f59e0b", "#4f46e5", "#10b981"]
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: { ticks: { color: textStyleColor }, grid: { color: gridColor } },
                y: { ticks: { color: textStyleColor }, grid: { color: gridColor } }
            },
            plugins: { legend: { display: false } }
        }
    });

    // 3. Gráfico de Líneas: Curva del punto de equilibrio (Break Even)
    const ctx3 = document.getElementById("chart-lineas").getContext("2d");
    const limit = Math.ceil(data.pe_unidades * 1.8) || 10;
    const steps = 5;
    const labels = [];
    const ingresosData = [];
    const costosData = [];
    
    const costo_var_unitario = parseFloat(data.costo_variable) / parseFloat(data.resultados_json.originales.ventas_estimadas || 1);
    
    for (let i = 0; i <= steps; i++) {
        let x = Math.ceil((limit / steps) * i);
        labels.push(x + " uds");
        ingresosData.push(x * parseFloat(data.precio_sugerido));
        costosData.push(parseFloat(data.costo_fijo) + (x * costo_var_unitario));
    }
    
    chartInstances["chart-lineas"] = new Chart(ctx3, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Ingresos",
                    data: ingresosData,
                    borderColor: "#10b981",
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                    fill: true
                },
                {
                    label: "Costos Totales",
                    data: costosData,
                    borderColor: "#ef4444",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: { ticks: { color: textStyleColor }, grid: { color: gridColor } },
                y: { ticks: { color: textStyleColor }, grid: { color: gridColor } }
            },
            plugins: { legend: { labels: { color: textStyleColor } } }
        }
    });

    // 4. Gráfico Comparativo: Precio, Costo y Ganancia Unitaria
    const ctx4 = document.getElementById("chart-comparativo").getContext("2d");
    chartInstances["chart-comparativo"] = new Chart(ctx4, {
        type: "bar",
        data: {
            labels: ["Costo Unitario", "Precio de Venta", "Margen Unitario"],
            datasets: [{
                data: [
                    parseFloat(data.costo_unitario),
                    parseFloat(data.precio_sugerido),
                    parseFloat(data.precio_sugerido) - parseFloat(data.costo_unitario)
                ],
                backgroundColor: ["#ef4444", "#4f46e5", "#10b981"]
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            scales: {
                x: { ticks: { color: textStyleColor }, grid: { color: gridColor } },
                y: { ticks: { color: textStyleColor }, grid: { color: gridColor } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// --- ACCIONES Y EXPORTACIONES ---
function imprimirPantalla() {
    window.print();
}
window.imprimirPantalla = imprimirPantalla;

function exportarPDF() {
    window.print();
}
window.exportarPDF = exportarPDF;

function exportarExcel() {
    if (!activeCalculo) return;
    
    // Crear formato CSV
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ANALISIS FINANCIERO - CONTROLCOSTOS AI\r\n";
    csvContent += `Proyecto,${activeCalculo.nombre}\r\n`;
    csvContent += `Categoria,${activeCalculo.categoria}\r\n`;
    csvContent += `Fecha,${activeCalculo.fecha_formateada}\r\n\r\n`;
    csvContent += "Indicador,Valor (Bs.)\r\n";
    csvContent += `Costo Total,${activeCalculo.total_costo}\r\n`;
    csvContent += `Costo Fijo,${activeCalculo.costo_fijo}\r\n`;
    csvContent += `Costo Variable,${activeCalculo.costo_variable}\r\n`;
    csvContent += `Costo Unitario,${activeCalculo.costo_unitario}\r\n`;
    csvContent += `Precio Sugerido,${activeCalculo.precio_sugerido}\r\n`;
    csvContent += `Utilidad Neta,${activeCalculo.resultados_json.ganancia_neta}\r\n`;
    csvContent += `Margen %,${activeCalculo.resultados_json.porcentaje_utilidad}%\r\n`;
    csvContent += `ROI,${activeCalculo.roi}%\r\n`;
    csvContent += `Punto de Equilibrio (unidades),${activeCalculo.pe_unidades}\r\n`;
    csvContent += `Punto de Equilibrio (ventas),${activeCalculo.resultados_json.pe_ingresos}\r\n`;
    csvContent += `Impuestos IVA,${activeCalculo.resultados_json.impuestos}\r\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_${activeCalculo.nombre.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
window.exportarExcel = exportarExcel;

function descargarJSON() {
    if (!activeCalculo) return;
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeCalculo, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `Reporte_${activeCalculo.nombre.replace(/\s+/g, "_")}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
window.descargarJSON = descargarJSON;

function descargarGrafico(canvasId) {
    const canvas = document.getElementById(canvasId);
    const link = document.createElement("a");
    link.download = `${canvasId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
}
window.descargarGrafico = descargarGrafico;

// --- MODO ADMINISTRADOR (CREDENCIAles: admin123) ---
let isAdminMode = false;

function solicitarAccesoAdmin() {
    if (isAdminMode) {
        // Cerrar sesión
        isAdminMode = false;
        document.getElementById("tab-view-dashboard").classList.add("d-none");
        document.getElementById("tab-view-history").classList.add("d-none");
        document.getElementById("btn-admin-access").innerHTML = '<i class="fa-solid fa-lock me-1"></i> Admin';
        document.getElementById("btn-admin-access").className = "btn btn-outline-primary btn-sm rounded-pill px-3";
        alert("🔒 Sesión de Administrador cerrada. Dashboard e Historial ocultos.");
        navegarA("view-welcome");
    } else {
        const pass = prompt("🔑 Ingrese la contraseña de Administrador:");
        if (pass === "admin123") {
            isAdminMode = true;
            document.getElementById("tab-view-dashboard").classList.remove("d-none");
            document.getElementById("tab-view-history").classList.remove("d-none");
            document.getElementById("btn-admin-access").innerHTML = '<i class="fa-solid fa-lock-open me-1"></i> Admin (Salir)';
            document.getElementById("btn-admin-access").className = "btn btn-success btn-sm rounded-pill px-3";
            alert("🔓 Acceso de Administrador concedido. Ahora puede ver estadísticas y el historial completo.");
            navegarA("view-dashboard");
        } else if (pass !== null) {
            alert("❌ Contraseña incorrecta.");
        }
    }
}
window.solicitarAccesoAdmin = solicitarAccesoAdmin;

// --- VISTA: DASHBOARD GENERAL ---
async function cargarDashboardStats() {
    try {
        const response = await fetch(`api/index.php?route=dashboard/stats&session_id=${sessionId}&is_admin=${isAdminMode}`);
        const data = await response.json();
        
        document.getElementById("db-total-calculos").innerText = data.total_calculos;
        document.getElementById("db-avg-ganancia").innerText = `Bs. ${parseFloat(data.ganancia_promedio).toFixed(2)}`;
        document.getElementById("db-avg-costo").innerText = `Bs. ${parseFloat(data.costo_promedio).toFixed(2)}`;
        
        // Ranking
        const rankingList = document.getElementById("db-ranking-list");
        rankingList.innerHTML = "";
        if (data.ranking_rentabilidad.length === 0) {
            rankingList.innerHTML = `<li class="list-group-item text-muted text-center py-3">No hay datos de ranking disponibles.</li>`;
        } else {
            data.ranking_rentabilidad.forEach((item, index) => {
                rankingList.innerHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong class="me-2 text-primary">#${index+1}</strong> ${item.nombre} 
                            <span class="badge bg-secondary-subtle text-white ms-2" style="font-size:0.75rem;">${item.categoria}</span>
                        </div>
                        <span class="badge bg-success">${item.roi}% ROI</span>
                    </li>
                `;
            });
        }
        
        // Recientes
        const recentList = document.getElementById("db-recent-list");
        recentList.innerHTML = "";
        if (data.ultimos_calculos.length === 0) {
            recentList.innerHTML = `<li class="list-group-item text-muted text-center py-3">No hay cálculos recientes.</li>`;
        } else {
            data.ultimos_calculos.forEach(item => {
                recentList.innerHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${item.nombre}</strong> <span class="text-muted ms-2">${item.fecha_formateada}</span>
                        </div>
                        <button class="btn btn-outline-primary btn-sm rounded-pill" onclick="cargarResultadosPantalla(${item.id})">Abrir</button>
                    </li>
                `;
            });
        }
    } catch (err) {
        console.error(err);
    }
}

// --- VISTA: HISTORIAL COMPLETO ---
async function cargarHistorialCompleto() {
    try {
        const response = await fetch(`api/index.php?route=calculos/list&session_id=${sessionId}&is_admin=${isAdminMode}`);
        localHistoryList = await response.json();
        filtrarHistorial();
    } catch (err) {
        console.error(err);
    }
}

function filtrarHistorial() {
    const searchVal = document.getElementById("history-search").value.toLowerCase();
    const categoryFilter = document.getElementById("history-filter-category").value;
    const sortVal = document.getElementById("history-sort").value;
    
    let list = [...localHistoryList];
    
    // 1. Filtrar búsqueda
    if (searchVal) {
        list = list.filter(item => item.nombre.toLowerCase().includes(searchVal));
    }
    
    // 2. Filtrar categoría
    if (categoryFilter) {
        list = list.filter(item => item.categoria.includes(categoryFilter));
    }
    
    // 3. Ordenación
    if (sortVal === "reciente") {
        list.sort((a,b) => b.id - a.id);
    } else if (sortVal === "antiguo") {
        list.sort((a,b) => a.id - b.id);
    } else if (sortVal === "costo-alto") {
        list.sort((a,b) => parseFloat(b.total_costo) - parseFloat(a.total_costo));
    } else if (sortVal === "costo-bajo") {
        list.sort((a,b) => parseFloat(a.total_costo) - parseFloat(b.total_costo));
    } else if (sortVal === "roi-alto") {
        list.sort((a,b) => parseFloat(b.roi) - parseFloat(a.roi));
    }
    
    // 4. Pintar en el DOM
    const tbody = document.getElementById("history-table-body");
    tbody.innerHTML = "";
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No se encontraron resultados en el historial.</td></tr>`;
        return;
    }
    
    list.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td class="ps-4 fw-bold">${item.nombre}</td>
                <td><span class="badge bg-secondary-subtle text-white">${item.categoria}</span></td>
                <td class="text-danger fw-bold">Bs. ${parseFloat(item.total_costo).toFixed(2)}</td>
                <td class="text-success fw-bold">Bs. ${parseFloat(item.precio_sugerido).toFixed(2)}</td>
                <td><span class="text-primary fw-bold">${item.roi}%</span></td>
                <td>${item.pe_unidades} uds</td>
                <td>${item.fecha_formateada}</td>
                <td class="pe-4 text-end">
                    <button class="btn btn-outline-primary btn-sm me-1 rounded-pill" onclick="cargarResultadosPantalla(${item.id})">Abrir</button>
                    <button class="btn btn-outline-secondary btn-sm me-1 rounded-pill" onclick="duplicarCalculo(${item.id})"><i class="fa-solid fa-copy"></i></button>
                    <button class="btn btn-outline-danger btn-sm rounded-pill" onclick="eliminarCalculo(${item.id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}
window.filtrarHistorial = filtrarHistorial;

async function duplicarCalculo(id) {
    if (confirm("¿Deseas duplicar este cálculo?")) {
        try {
            const response = await fetch(`api/index.php?route=calculos/duplicate&id=${id}`, { method: "POST" });
            const res = await response.json();
            if (res.success) {
                cargarHistorialCompleto();
            } else {
                alert(res.error);
            }
        } catch (err) {
            console.error(err);
        }
    }
}
window.duplicarCalculo = duplicarCalculo;

async function eliminarCalculo(id) {
    if (confirm("¿Estás seguro de que deseas eliminar este cálculo definitivamente del historial?")) {
        try {
            const response = await fetch(`api/index.php?route=calculos/delete&id=${id}`, { method: "DELETE" });
            const res = await response.json();
            if (res.success) {
                cargarHistorialCompleto();
            } else {
                alert(res.error);
            }
        } catch (err) {
            console.error(err);
        }
    }
}
window.eliminarCalculo = eliminarCalculo;

// --- ACCIONES DE FORMULARIOS ---
document.getElementById("chat-form").onsubmit = function(e) {
    e.preventDefault();
    const input = document.getElementById("chat-input");
    const msg = input.value.trim();
    if (msg) {
        enviarMensajeUsuario(msg);
        input.value = "";
    }
};


// Carga Inicial
window.onload = function() {
    initTheme();
    navegarA("view-welcome");
};
