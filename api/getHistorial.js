// api/getHistorial.js
const { google } = require('googleapis');
const { auth } = require('google-auth-library');

// --- Autenticación (Solo necesita permisos de LECTURA) ---
async function getAuthenticatedClient() {
    const credentials = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    if (!credentials.client_email || !credentials.private_key) {
        throw new Error('Configuración: Faltan credenciales de Google.');
    }
    const clientAuth = auth.fromJSON(credentials);
    clientAuth.scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
    return clientAuth;
}

// --- Función Auxiliar para Formatear Fecha ---
// Devuelve YYYY-MM-DD o null si es inválido
function formatSheetDateToISO(rawValue) {
    if (rawValue == null || rawValue === '') return null;

    let dateAttempt;
    if (typeof rawValue === 'number') { // Número de serie de Excel/Sheets
        // Ajuste para la diferencia de días entre Excel y JS + epoch
        dateAttempt = new Date(Date.UTC(1900, 0, rawValue - 1));
    } else if (typeof rawValue === 'string') {
        if (rawValue.includes('T')) { // ISO con hora
            dateAttempt = new Date(rawValue);
        } else if (rawValue.match(/^\d{4}-\d{2}-\d{2}$/)) { // YYYY-MM-DD
            const [y, m, d] = rawValue.split('-').map(Number);
            dateAttempt = new Date(Date.UTC(y, m - 1, d));
        } else { // Otros formatos (menos fiable)
             dateAttempt = new Date(rawValue);
             // Podrías añadir lógica para DD/MM/YYYY si es común
             if (isNaN(dateAttempt) && rawValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                 const [d, m, y] = rawValue.split('/').map(Number);
                 dateAttempt = new Date(Date.UTC(y, m - 1, d));
             }
        }
    } else if (rawValue instanceof Date) { // Si ya es objeto Date
        dateAttempt = rawValue;
    } else {
        return null; // Tipo no reconocido
    }

    // Validar si la fecha es válida
    if (dateAttempt && !isNaN(dateAttempt.getTime())) {
        // Devolver en formato YYYY-MM-DD (UTC)
        return dateAttempt.toISOString().split('T')[0];
    }
    console.warn(`[formatSheetDateToISO] Valor no reconocido como fecha válida: ${rawValue}`);
    return null; // Fecha inválida
}

// --- Función Auxiliar para Parsear Monto ---
// Maneja puntos como separadores de miles y coma como decimal
const parseMonto = (value) => {
    if (value == null || value === '') return 0;
    // Convierte a string, quita puntos de miles, reemplaza coma decimal por punto
    const cleanedValue = String(value).replace(/\./g, '').replace(',', '.');
    const number = parseFloat(cleanedValue);
    return isNaN(number) ? 0 : number; // Devuelve 0 si no es un número válido
};


// --- Handler de la API ---
module.exports = async (req, res) => {
    // Permitir solo GET
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Método ${req.method} no permitido.` });
     }

    try {
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;
        if (!spreadsheetId) {
             return res.status(500).json({ error: 'Configuración: Falta GOOGLE_SHEET_ID.' });
        }

        const clientAuth = await getAuthenticatedClient();
        const sheets = google.sheets({ version: 'v4', auth: clientAuth });

        // Leer todas las hojas necesarias en paralelo
        console.log("Leyendo datos de Sheets...");
        // AJUSTA los rangos si tus hojas o columnas son diferentes
        const ranges = [
            'Rendiciones!A:I', // ID, Fecha, ID Chofer, ID Vehiculo, Tarifa, Efec, Transf, MP, DeudaAnt
            'Gastos!A:E',      // ID Gasto, Fecha, ID Rendicion, Concepto, Monto
            'Choferes!A:B',   // ID Chofer, Nombre
            'Vehiculos!A:C'       // ID Vehiculo, Nombre Visible, Patente
        ];
        const [rendicionesData, gastosData, choferesData, flotaData] = await Promise.all(
            ranges.map(range => sheets.spreadsheets.values.get({ spreadsheetId, range }))
        );

        const rendRows = rendicionesData.data.values || [];
        const gastoRows = gastosData.data.values || [];
        const choferRows = choferesData.data.values || [];
        const flotaRows = flotaData.data.values || [];

        console.log(`Filas leídas: Rendiciones=${rendRows.length-1}, Gastos=${gastoRows.length-1}, Choferes=${choferRows.length-1}, Flota=${flotaRows.length-1}`);

        // Crear mapas para búsqueda rápida de nombres
        const mapaChoferes = {}; // id -> nombre
        choferRows.slice(1).forEach(row => { if (row && row[0]) mapaChoferes[row[0]] = row[1] || `ID ${row[0]}`; });

        const mapaVehiculos = {}; // id -> nombre_visible + patente

        flotaRows.slice(1).forEach((row, i) => {
        if (!row || row.length < 1) {
            console.warn(`Fila ${i + 2} en Vehiculos vacía o incompleta:`, row);
            return;
        }

        const id = (row[0] || '').trim();
        const nombre = (row[1] || '').trim();
        const patente = (row[2] || '').trim();

        if (!id) {
            console.warn(`Fila ${i + 2} en Vehiculos sin ID válido:`, row);
            return;
        }

        if (!nombre && !patente) {
            console.warn(`Vehículo sin nombre/patente para ID=${id}`, row);
        }
        console.log("MapaVehiculos generado:", mapaVehiculos);


        // Formato: “Nombre (Patente)” si ambas existen
        const etiqueta =
            nombre && patente
            ? `${nombre} (${patente})`
            : nombre || patente || `Vehículo ${id}`;

        mapaVehiculos[id] = etiqueta;
        });


        // Crear mapa de gastos por ID de rendición
        const mapaGastosPorRendicion = {}; // id_rendicion -> suma_gastos
        gastoRows.slice(1).forEach(row => {
            // Asume ID Rendición en Col C (índice 2), Monto en Col E (índice 4)
            if (row && row[2]) {
                const rendicionId = row[2];
                const montoGasto = parseMonto(row[4]); // Usar parseMonto
                mapaGastosPorRendicion[rendicionId] = (mapaGastosPorRendicion[rendicionId] || 0) + montoGasto;
            }
        });

        console.log("Mapas creados. Procesando rendiciones para historial...");

        // Procesar cada rendición para crear un registro de historial
        const historial = rendRows.slice(1).map((row, index) => {
             // Validar fila básica
             if (!row || row.length === 0 || !row[0]) {
                  console.warn(`Rendición fila ${index + 2}: Fila vacía o sin ID (Col A). Saltando.`);
                  return null;
             }

            const rendicionId = row[0]; // Col A
            const fechaISO = formatSheetDateToISO(row[1]); // Col B
            const choferId = row[2]; // Col C
            const vehiculoId = row[3]; // Col D

            if (!fechaISO || !choferId || !vehiculoId) {
                console.warn(`Rendición fila ${index + 2} (ID: ${rendicionId}) saltada por falta de Fecha/Chofer/Vehiculo.`);
                return null;
            }

            const choferNombre = mapaChoferes[choferId] || `ID ${choferId}`;
            const vehiculoNombre = mapaVehiculos[vehiculoId] || `ID ${vehiculoId}`;

            // Calcular montos usando parseMonto
            const tarifa = parseMonto(row[4]);        // Col E: Tarifa
            const efectivo = parseMonto(row[5]);      // Col F: Efectivo
            const transferencia = parseMonto(row[6]); // Col G: Transferencia
            const mercadoPago = parseMonto(row[7]);   // Col H: MP (si existe)
            // ✨ LEER DEUDA ANTERIOR (Asumimos Col I, índice 8) ✨
            const deudaAnterior = parseMonto(row[8]); // Col I

            const totalPagado = efectivo + transferencia + mercadoPago;
            const gastos = mapaGastosPorRendicion[rendicionId] || 0;

            // Lógica de cálculo (¡REVISA ESTA FÓRMULA!)
            // Asume Monto a Pagar = Tarifa
            const montoPagar = tarifa;
            // DeudaFinal = (Deuda Anterior + Monto a Pagar) - Total Pagado - Gastos
            const deudaFinal = (deudaAnterior + montoPagar) - totalPagado - gastos;

            // Log detallado por fila para depurar cálculo
            // console.log(`Fila ${index + 2}: ID=${rendicionId}, DA=${deudaAnterior}, MP=${montoPagar}, TP=${totalPagado}, G=${gastos} -> DF=${deudaFinal}`);

            return {
                id: rendicionId,
                fecha: fechaISO,
                chofer: choferNombre,
                vehiculo: vehiculoNombre,
                montoPagar: montoPagar,
                totalPagado: totalPagado,
                gastos: gastos,
                deudaAnterior: deudaAnterior, // ✨ Incluir en el objeto devuelto
                deudaFinal: deudaFinal,
            };
        }).filter(Boolean); // Filtrar filas nulas

        console.log(`Historial procesado: ${historial.length} registros válidos.`);

        // Opcional: Ordenar el historial por fecha descendente antes de enviarlo
        historial.sort((a, b) => b.fecha.localeCompare(a.fecha));

        return res.status(200).json({ historial });

    } catch (error) {
        console.error('Error en GET /api/getHistorial:', error); // Log completo del error
        const status = error.message.includes('Configuración') || error.message.includes('permission') ? 500 : (error.code === 404 ? 404 : 500);
        res.status(status).json({ error: 'Error al obtener el historial.', details: error.message });
    }
};

