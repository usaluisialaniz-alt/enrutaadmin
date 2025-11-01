// api/saveRendicion.js (Lógica de Cascada)
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

// --- ¡¡FUNCIÓN DE AYUDA MODIFICADA!! ---
// Busca la FILA y los DATOS de un día pagado específico
async function findDiasPagadosRow(sheets, spreadsheetId, choferId, fechaPagada) {
    // Asume: Hoja 'DiasPagados'
    // Col C = fecha_pagada (YYYY-MM-DD)
    // Col D = choferId
    // Col F = tarifaAplicada
    // Col G = totalPagado (de esa fila)
    const range = 'DiasPagados!C:G'; // Leemos C, D, E, F, G
    console.log(`[findDiasPagadosRow] Buscando día ${fechaPagada} para chofer ${choferId} en ${range}`);
    
    try {
        const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
        const rows = response.data.values || [];
        
        // Asume que la Fila 1 (índice 0) puede ser encabezado, empezamos en 1
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const fecha = row[0]; // Col C (índice 0 en el array 'row')
            const id = row[1];    // Col D (índice 1 en el array 'row')
            
            if (fecha && id && String(id).trim() === String(choferId).trim() && fecha === fechaPagada) {
                // El rango C:G empieza en la fila 1, pero 'rows' es base 0
                // Empezamos i=1, así que la fila de GSheets es (i + 1)
                const rowIndex = i + 1;
                const info = {
                    rowIndex: rowIndex,
                    tarifa: parseFloat(row[3]) || 0, // Col F (índice 3)
                    pagado: parseFloat(row[4]) || 0, // Col G (índice 4)
                };
                console.log(`[findDiasPagadosRow] Encontrado en fila ${rowIndex}:`, info);
                return info;
            }
        }
    } catch (err) {
        console.error(`[findDiasPagadosRow] Error: ${err.message}`);
    }
    
    console.log(`[findDiasPagadosRow] No se encontró un día 'partial' existente.`);
    return null; // No encontrado
}

// --- ¡NUEVA FUNCIÓN DE AYUDA! ---
// Actualiza una celda específica (necesaria para el UPDATE)
async function updateCell(sheets, spreadsheetId, sheetName, rowIndex, colIndex, value) {
    const range = `${sheetName}!${String.fromCharCode(65 + colIndex)}${rowIndex}`;
    console.log(`[updateCell] Escribiendo '${value}' en la celda ${range}`);
    try {
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[value || ""]] },
        });
        console.log(`[updateCell] Celda ${range} actualizada.`);
    } catch (e) {
        console.error(`[updateCell] Error actualizando celda ${range}: ${e.message}`);
        throw new Error(`Error al actualizar la celda: ${e.message}`);
    }
}

// --- Handler Principal ---
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    console.log('[saveRendicion] Body Recibido:', JSON.stringify(req.body, null, 2));
    
    const { v4: uuidv4 } = await import('uuid');

    // 1. Obtener Datos del Body
    // ¡Ignoramos el 'status' global que envía el frontend!
    const { choferId, vehiculoId, diasRendidos, pagos, gastos } = req.body;

    if (!choferId || !vehiculoId || !Array.isArray(diasRendidos) || !Array.isArray(pagos)) {
      return res.status(400).json({ error: 'Faltan datos requeridos (choferId, vehiculoId, diasRendidos, pagos).' });
    }

    // 2. Autenticación y Cliente Sheets
    const clientAuth = await getAuthenticatedClient();
    const sheets = google.sheets({ version: 'v4', auth: clientAuth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) return res.status(500).json({ error: 'Configuración: Falta Sheet ID.' });

    // 3. Obtener Tarifas (¡IMPORTANTE! Por seguridad)
    const { tarifaNormal, tarifaEspecial } = await getTarifasVehiculo(sheets, spreadsheetId, vehiculoId);
    if (tarifaNormal === 0 && tarifaEspecial === 0) {
        return res.status(404).json({ error: `Vehículo ${vehiculoId} no encontrado o sin tarifas.` });
    }
    
    // --- ¡CAMBIO! CALCULAR TOTALES PRIMERO ---
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
            totalPagadoTransferencia += montoEntregado;
        }
    });
    // --- ¡¡ESTA ES LA LÓGICA EN CASCADA!! ---
    // 'pagoRestante' es el "pool" de dinero (ej: 120) que distribuiremos.
    let pagoRestante = totalPagadoEfectivo + totalPagadoTransferencia;
    // --- FIN CAMBIO ---

    let montoTotalJornadaSaldado = 0; // Lo que realmente se pagó de la jornada
    const diasPagadosNuevos = []; // Array para los días NUEVOS
    const diasPagadosUpdate = []; // Array para los días a ACTUALIZAR
    const fechaActualISO = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString();

    // --- ¡¡LÓGICA EN CASCADA (TU IDEA)!! ---
    for (const diaString of diasRendidos) {
        
        let tarifaRequerida = 0; // Lo que se *necesita* para este día
        let tarifaCompleta = 0; // La tarifa total de este día
        let pagadoAnteriormente = 0;
        let montoAplicado = 0; // Lo que *realmente* se paga en esta transacción
        let nuevoStatus = 'partial';
        let nuevoMontoTotalPagado = 0;
        
        const existingDayInfo = await findDiasPagadosRow(sheets, spreadsheetId, choferId, diaString);
        
        if (existingDayInfo) {
            // --- CASO A: ACTUALIZAR UN DÍA 'partial' ---
            tarifaCompleta = existingDayInfo.tarifa;
            pagadoAnteriormente = existingDayInfo.pagado;
            tarifaRequerida = tarifaCompleta - pagadoAnteriormente;
            
        } else {
            // --- CASO B: PAGAR UN DÍA NUEVO ---
            const fecha = new Date(diaString); 
            fecha.setMinutes(fecha.getMinutes() + fecha.getTimezoneOffset()); // Ajustar a UTC
            tarifaCompleta = (isWeekend(fecha) || isFeriado(fecha)) ? tarifaEspecial : tarifaNormal;
            pagadoAnteriormente = 0;
            tarifaRequerida = tarifaCompleta;
        }

        // Ahora distribuimos el pago
        if (pagoRestante >= tarifaRequerida) {
            // El pago CUBRE este día (o saldo)
            montoAplicado = tarifaRequerida;
            pagoRestante = pagoRestante - tarifaRequerida; // Resta del "pool"
            nuevoStatus = 'paid';
        } else {
            // El pago NO CUBRE este día
            montoAplicado = pagoRestante; // Se aplica todo lo que queda
            pagoRestante = 0; // El "pool" se agota
            nuevoStatus = 'partial';
        }
        
        // Sumamos solo lo que se aplicó a la jornada
        montoTotalJornadaSaldado += montoAplicado;
        
        // Calculamos el nuevo total para la celda
        nuevoMontoTotalPagado = pagadoAnteriormente + montoAplicado;
        
        // Guardamos la operación (UPDATE o APPEND)
        if (existingDayInfo) {
            diasPagadosUpdate.push({
                rowIndex: existingDayInfo.rowIndex,
                pagado: nuevoMontoTotalPagado,
                status: nuevoStatus
            });
        } else {
            diasPagadosNuevos.push([
                `DP-${uuidv4().substring(0, 6).toUpperCase()}`, // A
                fechaActualISO, // B
                diaString, // C
                choferId, // D
                vehiculoId, // E
                tarifaCompleta, // F
                nuevoMontoTotalPagado, // G (Lo que se pagó en esta transacción)
                nuevoStatus // H
            ]);
        }
    }
    // --- FIN LÓGICA EN CASCADA ---
    
    console.log(`[saveRendicion] Monto total de jornada saldado: ${montoTotalJornadaSaldado}`);


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
    // El 'totalpagar' es el monto de la jornada saldado (NO el total pagado) - gastos + deuda
    const totalpagar = montoTotalJornadaSaldado - totalGastos + deudaAnterior;
    
    // 6. Calcular Nuevo Saldo
    const totalPagado = totalPagadoEfectivo + totalPagadoTransferencia;
    const nuevoSaldoDeudor = totalpagar - totalPagado;

    // 7. Preparar datos para escribir
    const idRendicion = `REN-${uuidv4().substring(0, 6).toUpperCase()}`;
    
    // --- ¡CAMBIO! Fila de 10 COLUMNAS para 'Rendiciones' ---
    const rendicionRow = [
        idRendicion,              // Col A
        fechaActualISO,           // Col B
        choferId,                 // Col C
        montoTotalJornadaSaldado, // Col D (Lo que se saldó de la jornada)
        deudaAnterior,            // Col E
        totalpagar,               // Col F (Total a pagar = Jornada Saldada - Gastos + Deuda)
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

    // --- ¡¡LÓGICA DE ESCRITURA ACTUALIZADA!! ---
    
    // 8. Escribir en Google Sheets
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

    // --- ¡¡NUEVA LÓGICA DE UPDATE/APPEND!! ---
    try {
        // C.1. Añadir los días NUEVOS
        if (diasPagadosNuevos.length > 0) {
            // --- ¡CAMBIO! Rango actualizado a A:H (8 columnas) ---
            console.log(`[saveRendicion] PASO 8.C (Nuevos): Escribiendo ${diasPagadosNuevos.length} filas en 'DiasPagados!A:H'`);
            await sheets.spreadsheets.values.append({ spreadsheetId, range: 'DiasPagados!A:H', valueInputOption: 'USER_ENTERED', requestBody: { values: diasPagadosNuevos } });
            console.log(`[saveRendicion] PASO 8.C (Nuevos): Éxito.`);
        }
        
        // C.2. Actualizar los días 'partial' existentes
        if (diasPagadosUpdate.length > 0) {
             console.log(`[saveRendicion] PASO 8.C (Actualizar): Actualizando ${diasPagadosUpdate.length} filas...`);
             for (const dia of diasPagadosUpdate) {
                // --- ¡CAMBIO! Actualizamos Col G (Pagado) y Col H (Status) ---
                // Asume Col G (índice 6) es 'totalPagado'
                await updateCell(sheets, spreadsheetId, 'DiasPagados', dia.rowIndex, 6, dia.pagado);
                // Asume Col H (índice 7) es 'status'
                await updateCell(sheets, spreadsheetId, 'DiasPagados', dia.rowIndex, 7, dia.status);
             }
            console.log(`[saveRendicion] PASO 8.C (Actualizar): Éxito.`);
        }
        
    } catch (err) {
        console.error("[saveRendicion] ¡¡ERROR en PASO 8.C (DiasPagados)!!", err.message);
        throw new Error(`Error al guardar en 'DiasPagados': ${err.message}`);
    }
    // --- FIN NUEVA LÓGICA ---

    try {
        const updateRange = `Choferes!E${rowIndexChofer}`;
        console.log(`[saveRendicion] PASO 8.D: Actualizando deuda en '${updateRange}' con valor: ${nuevoSaldoDeudor}`);
        await sheets.spreadsheets.values.update({ spreadsheetId, range: updateRange, valueInputOption: 'USER_ENTERED', requestBody: { values: [[nuevoSaldoDeudor]] } });
        console.log(`[saveRendicion] PASO 8.D: Éxito.`);
    } catch (err) {
        console.error("[saveRendicion] ¡¡ERROR en PASO 8.D (Choferes)!!", err.message);
        throw new Error(`Error al actualizar deuda en 'Choferes': ${err.message}`);
    }
    
    // 9. Enviar Respuesta Exitosa
    res.status(200).json({ message: '¡Rendición guardada con éxito!' });

  } catch (error) {
        console.error('Error en api/saveRendicion:', error.response ? error.response.data : error.message, error.stack);
        res.status(500).json({ error: 'Error al guardar la rendición en Sheets.', details: error.message });
  }
};

