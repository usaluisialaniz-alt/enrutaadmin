// api/saveRendicion.js (Lógica de Calendario)
const { google } = require('googleapis');
const { auth } = require('google-auth-library');

// --- SIMULACIÓN DE FERIADOS (DEBE SER IGUAL QUE EN EL FRONTEND) ---
const FeriadosSimulados2025 = [
    '2025-10-13',
    '2025-11-20',
];

// --- Helpers de Autenticación y Fechas ---
async function getAuthenticatedClient() {
    const credentials = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    if (!credentials.client_email || !credentials.private_key) throw new Error('Configuración: Faltan credenciales.');
    const clientAuth = auth.fromJSON(credentials);
    clientAuth.scopes = ['https://www.googleapis.com/auth/spreadsheets'];
    return clientAuth;
}

const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Domingo (0) o Sábado (6)
};

const isFeriado = (date) => {
    const isoDate = date.toISOString().split('T')[0];
    return FeriadosSimulados2025.includes(isoDate);
};

// --- Función auxiliar para obtener tarifas de un vehículo ---
async function getTarifasVehiculo(sheets, spreadsheetId, vehiculoId) {
    // Asume ID en Col A, T.Normal en Col E, T.Especial en Col F
    const range = 'Vehiculos!A2:F'; 
    try {
        const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
        const rows = response.data.values || [];
        const targetIdString = String(vehiculoId);
        for (const row of rows) {
            // ¡CORRECCIÓN! Comparar como String
            if (row[0] && String(row[0]) === targetIdString) { // Compara ID en Col A
                return {
                    tarifaNormal: parseFloat(row[4]) || 0, // Lee T.Normal de Col E
                    tarifaEspecial: parseFloat(row[5]) || 0 // Lee T.Especial de Col F
                };
            }
        }
        console.warn(`Vehículo con ID ${vehiculoId} no encontrado al buscar tarifas.`);
        return { tarifaNormal: 0, tarifaEspecial: 0 };
    } catch (err) {
        console.error(`Error al obtener tarifas para ${vehiculoId}:`, err);
        throw new Error(`No se pudieron obtener las tarifas del vehículo ${vehiculoId}.`);
    }
}

// --- Handler Principal ---
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    console.log('[saveRendicion] Body Recibido:', JSON.stringify(req.body, null, 2));
    
    const { v4: uuidv4 } = await import('uuid');

    // 1. Obtener Datos del Body (AHORA RECIBIMOS 'diasRendidos' y 'status')
    const { choferId, vehiculoId, diasRendidos, pagos, gastos, status } = req.body;

    if (!choferId || !vehiculoId || !Array.isArray(diasRendidos) || !Array.isArray(pagos) || !status) {
      return res.status(400).json({ error: 'Faltan datos requeridos (choferId, vehiculoId, diasRendidos, pagos, status).' });
    }

    // 2. Autenticación y Cliente Sheets
    const clientAuth = await getAuthenticatedClient();
    const sheets = google.sheets({ version: 'v4', auth: clientAuth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) return res.status(500).json({ error: 'Configuración: Falta Sheet ID.' });

    // 3. Obtener Tarifas y Recalcular Monto (¡IMPORTANTE! Por seguridad)
    const { tarifaNormal, tarifaEspecial } = await getTarifasVehiculo(sheets, spreadsheetId, vehiculoId);
    if (tarifaNormal === 0 && tarifaEspecial === 0) {
        return res.status(404).json({ error: `Vehículo ${vehiculoId} no encontrado o sin tarifas.` });
    }

    let montoTotalJornadaCalculado = 0;
    const diasPagadosRows = []; // Array para la nueva hoja 'DiasPagados'
    const fechaActualISO = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString();

    for (const diaString of diasRendidos) {
        const fecha = new Date(diaString); 
        fecha.setMinutes(fecha.getMinutes() + fecha.getTimezoneOffset()); // Ajustar a UTC
        
        let tarifaAplicada = tarifaNormal;
        if (isWeekend(fecha) || isFeriado(fecha)) {
            tarifaAplicada = tarifaEspecial;
        }
        
        montoTotalJornadaCalculado += tarifaAplicada;
        
        // Preparamos la fila para la nueva hoja 'DiasPagados'
        diasPagadosRows.push([
            `DP-${uuidv4().substring(0, 6).toUpperCase()}`, // id_dia_pagado
            fechaActualISO, // fecha_rendicion
            diaString, // fecha_pagada (YYYY-MM-DD)
            choferId,
            vehiculoId,
            tarifaAplicada,
            status // ¡NUEVO! Guardamos 'paid' o 'partial'
        ]);
    }
    
    console.log(`[saveRendicion] Monto recalculado en backend: ${montoTotalJornadaCalculado}`);

    // --- ¡CAMBIO! CALCULAR TOTALES SEPARADOS ---
    const gastosArray = gastos || [];
    const totalGastos = gastosArray.reduce((sum, g) => sum + (parseFloat(g.monto) || 0), 0);
    
    let totalPagadoEfectivo = 0;
    let totalPagadoTransferencia = 0;
    const pagosValidos = pagos || [];

    pagosValidos.forEach(p => {
        const montoEntregado = parseFloat(p.monto) || 0;
        if (p.metodo?.toLowerCase() === 'efectivo') {
            totalPagadoEfectivo += montoEntregado;
        } else {
            // Asume que todo lo que no es "Efectivo" es transferencia/digital
            totalPagadoTransferencia += montoEntregado;
        }
    });
    const totalPagado = totalPagadoEfectivo + totalPagadoTransferencia;
    // --- FIN CAMBIO ---

    // 5. Obtener Deuda Anterior
    const rangeChofer = `Choferes!A:E`; // A=ID, E=Deuda (¡Ajusta si es otra columna!)
    const choferData = await sheets.spreadsheets.values.get({ spreadsheetId, range: rangeChofer });
    const choferRows = choferData.data.values || [];
    let deudaAnterior = 0;
    let rowIndexChofer = -1;
    for (let i = 1; i < choferRows.length; i++) { // Asume que la fila 1 es encabezado
        if (choferRows[i][0] && String(choferRows[i][0]) === String(choferId)) {
            deudaAnterior = parseFloat(choferRows[i][4]) || 0; // Col E
            rowIndexChofer = i + 1; // +1 porque el índice es base 0, pero las filas son base 1
            break;
        }
    }
    if (rowIndexChofer === -1) return res.status(404).json({ error: `Chofer ${choferId} no encontrado.` });

    // --- ¡CAMBIO! RE-AGREGAR TOTALPAGAR ---
    const totalpagar = montoTotalJornadaCalculado - totalGastos + deudaAnterior;
    
    // 6. Calcular Nuevo Saldo
    const nuevoSaldoDeudor = totalpagar - totalPagado;

    // 7. Preparar datos para escribir
    const idRendicion = `REN-${uuidv4().substring(0, 6).toUpperCase()}`;
    
    // --- ¡CAMBIO! Fila de 10 COLUMNAS para 'Rendiciones' ---
    const rendicionRow = [
        idRendicion,              // Col A
        fechaActualISO,           // Col B
        choferId,                 // Col C
        montoTotalJornadaCalculado, // Col D
        deudaAnterior,            // Col E
        totalpagar,               // Col F (Total a pagar = Jornada - Gastos + Deuda)
        totalPagadoEfectivo,      // Col G
        totalPagadoTransferencia, // Col H
        totalGastos,              // Col I
        nuevoSaldoDeudor          // Col J
    ];
    
    // Filas para 'Gastos'
    const gastosRows = gastosArray.map(g => {
        const idGasto = `GAS-${uuidv4().substring(0, 6).toUpperCase()}`;
        return [idGasto, fechaActualISO, idRendicion, g.concepto, parseFloat(g.monto) || 0];
    });

    // --- ¡¡CAMBIO!! Se separan las promesas para depuración ---
    
    // 8. Escribir en Google Sheets (¡Añadimos 'DiasPagados'!)
    // const requests = []; // Ya no se usa Promise.all

    try {
        // --- ¡CAMBIO! Rango actualizado a A:J (10 columnas) ---
        console.log(`[saveRendicion] PASO 8.A: Escribiendo en 'Rendiciones!A:J' la fila:`, rendicionRow);
        await sheets.spreadsheets.values.append({ spreadsheetId, range: 'Rendiciones!A:J', valueInputOption: 'USER_ENTERED', requestBody: { values: [rendicionRow] } });
        console.log(`[saveRendicion] PASO 8.A: Éxito.`);
    } catch (err) {
        console.error("[saveRendicion] ¡¡ERROR en PASO 8.A (Rendiciones)!!", err.message);
        throw new Error(`Error al guardar en 'Rendiciones': ${err.message}`);
    }

    try {
        if (gastosRows.length > 0) {
            console.log(`[saveRendicion] PASO 8.B: Escribiendo ${gastosRows.length} filas en 'Gastos!A:E'`);
            await sheets.spreadsheets.values.append({ spreadsheetId, range: 'Gastos!A:E', valueInputOption: 'USER_ENTERED', requestBody: { values: gastosRows } });
            console.log(`[saveRendicion] PASO 8.B: Éxito.`);
        }
    } catch (err) {
        console.error("[saveRendicion] ¡¡ERROR en PASO 8.B (Gastos)!!", err.message);
        throw new Error(`Error al guardar en 'Gastos': ${err.message}`);
    }

    try {
        if (diasPagadosRows.length > 0) {
            console.log(`[saveRendicion] PASO 8.C: Escribiendo ${diasPagadosRows.length} filas en 'DiasPagados!A:G'`);
            await sheets.spreadsheets.values.append({ spreadsheetId, range: 'DiasPagados!A:G', valueInputOption: 'USER_ENTERED', requestBody: { values: diasPagadosRows } });
            console.log(`[saveRendicion] PASO 8.C: Éxito.`);
        }
    } catch (err) {
        console.error("[saveRendicion] ¡¡ERROR en PASO 8.C (DiasPagados)!!", err.message);
        throw new Error(`Error al guardar en 'DiasPagados': ${err.message}`);
    }

    try {
        const updateRange = `Choferes!E${rowIndexChofer}`;
        console.log(`[saveRendicion] PASO 8.D: Actualizando deuda en '${updateRange}' con valor: ${nuevoSaldoDeudor}`);
        await sheets.spreadsheets.values.update({ spreadsheetId, range: updateRange, valueInputOption: 'USER_ENTERED', requestBody: { values: [[nuevoSaldoDeudor]] } });
        console.log(`[saveRendicion] PASO 8.D: Éxito.`);
    } catch (err) {
        console.error("[saveRendicion] ¡¡ERROR en PASO 8.D (Choferes)!!", err.message);
        throw new Error(`Error al actualizar deuda en 'Choferes': ${err.message}`);
    }
    
    // await Promise.all(requests); // Reemplazado por los bloques try/catch individuales

    // 9. Enviar Respuesta Exitosa
    res.status(200).json({ message: '¡Rendición guardada con éxito!' });

  } catch (error) {
        console.error('Error en api/saveRendicion:', error.response ? error.response.data : error.message, error.stack);
        res.status(500).json({ error: 'Error al guardar la rendición en Sheets.', details: error.message });
  }
};

