// api/saveRendicion.js (Opción B)
const { google } = require('googleapis');
const { auth } = require('google-auth-library');

// Función auxiliar para obtener tarifas de un vehículo (cacheable si es necesario)
async function getTarifasVehiculo(sheets, spreadsheetId, vehiculoId) {
    // Asume ID en Col A, T.Normal en Col E, T.Especial en Col F
    const range = 'Vehiculos!A2:F';
    try {
        const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
        const rows = response.data.values || [];
        for (const row of rows) {
            if (row[0] === vehiculoId) { // Compara ID en Col A
                return {
                    tarifaNormal: parseFloat(row[4]) || 0, // Lee T.Normal de Col E
                    tarifaEspecial: parseFloat(row[5]) || 0 // Lee T.Especial de Col F
                };
            }
        }
        console.warn(`Vehículo con ID ${vehiculoId} no encontrado al buscar tarifas.`);
        return { tarifaNormal: 0, tarifaEspecial: 0 }; // Devuelve 0 si no se encuentra
    } catch (err) {
        console.error(`Error al obtener tarifas para ${vehiculoId}:`, err);
        throw new Error(`No se pudieron obtener las tarifas del vehículo ${vehiculoId}.`); // Lanza error para detener
    }
}


module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    console.log('--- PASO 1: req.body COMPLETO RECIBIDO ---');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('-------------------------------------------');
    // --- ¡NUEVO! Importación dinámica de uuid ---
    const { v4: uuidv4 } = await import('uuid');

    // 1. Obtener Datos del Body (Ahora 'pagos' contiene los días)
    const { choferId, vehiculoId, montoAPagar, pagos, gastos } = req.body;
    console.log(`--- PASO 2: Valor de 'montoAPagar' LEÍDO del body: [${montoAPagar}] (Tipo: ${typeof montoAPagar}) ---`);


    if (!choferId || !vehiculoId || !Array.isArray(pagos)) {
      return res.status(400).json({ error: 'Faltan datos requeridos (choferId, vehiculoId, pagos).' });
    }

    // 2. Autenticación y Cliente Sheets (Sin Cambios)
    const credentials = { /* ... credenciales ... */
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    if (!credentials.client_email || !credentials.private_key) return res.status(500).json({ error: 'Configuración: Faltan credenciales.' });
    const clientAuth = auth.fromJSON(credentials);
    clientAuth.scopes = ['https://www.googleapis.com/auth/spreadsheets'];
    const sheets = google.sheets({ version: 'v4', auth: clientAuth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) return res.status(500).json({ error: 'Configuración: Falta Sheet ID.' });


    let montoTotalAPagarCalculado = parseFloat(montoAPagar) || 0;
    let totalPagadoEfectivo = 0;
    let totalPagadoTransferencia = 0;
    const pagosValidos = pagos || []; // Asegura que sea un array

    pagosValidos.forEach(p => {
        const dn = Number(p.diasNormalesPagados) || 0;
        const de = Number(p.diasEspecialesPagados) || 0;

        const montoEntregado = parseFloat(p.monto) || 0;
        if (p.metodo?.toLowerCase() === 'efectivo') {
            totalPagadoEfectivo += montoEntregado;
        } else {
            totalPagadoTransferencia += montoEntregado;
        }
    });

    const gastosArray = gastos || [];
    const totalGastos = gastosArray.reduce((sum, g) => sum + (parseFloat(g.monto) || 0), 0);
    const totalPagado = totalPagadoEfectivo + totalPagadoTransferencia;

    // 4. Obtener Deuda Anterior (Sin Cambios Lógicos)
    const rangeChofer = `Choferes!A:F`; // A=ID, E=Deuda
    const choferData = await sheets.spreadsheets.values.get({ spreadsheetId, range: rangeChofer });
    const choferRows = choferData.data.values || [];
    let deudaAnterior = 0;
    let rowIndexChofer = -1;
    for (let i = 1; i < choferRows.length; i++) {
        if (choferRows[i][0] === choferId) {
            deudaAnterior = parseFloat(choferRows[i][4]) || 0; // Col E
            rowIndexChofer = i + 1;
            break;
        }
    }
    if (rowIndexChofer === -1) return res.status(404).json({ error: `Chofer ${choferId} no encontrado.` });
    const totalpagar = montoTotalAPagarCalculado-totalGastos+deudaAnterior
    // 5. Calcular Nuevo Saldo
    const nuevoSaldoDeudor = (totalpagar) - totalPagado ;

    // 6. Preparar datos para escribir (Usamos los totales calculados)
    const idRendicion = `REN-${uuidv4().substring(0, 6).toUpperCase()}`;
    const fechaActual = new Date();
    const fechaLocal = new Date(fechaActual.getTime() - (fechaActual.getTimezoneOffset() * 60000));
    const fechaLocalISO = fechaLocal.toISOString().slice(0, -1); // "2025-10-30T12:04:00.123"

    // ID_Rendicion, Fecha, ID_Chofer, Monto_a_Pagar(CALCULADO), Deuda_Anterior, Pago_Efectivo, Pago_Transferencia, Gastos_del_Dia, Saldo_Final
    const rendicionRow = [
        idRendicion, fechaLocalISO, choferId,
        montoTotalAPagarCalculado, 
        deudaAnterior, // Usamos el calculado
        totalpagar,
        totalPagadoEfectivo, 
        totalPagadoTransferencia, // Usamos los totales
        totalGastos, 
        nuevoSaldoDeudor
    ];
    const gastosRows = gastosArray.map(g => { /* ... sin cambios ... */
        const idGasto = `GAS-${uuidv4().substring(0, 6).toUpperCase()}`;
        return [idGasto, fechaLocalISO, idRendicion, g.concepto, parseFloat(g.monto) || 0];
    });
    console.log('PASO 2: FILA PREPARADA PARA GOOGLE SHEETS (rendicionRow):');
    console.log(rendicionRow);

    // 7. Escribir en Google Sheets (Sin Cambios Lógicos)
    const requests = [];
    requests.push(sheets.spreadsheets.values.append({ spreadsheetId, range: 'Rendiciones!A:L', valueInputOption: 'USER_ENTERED', requestBody: { values: [rendicionRow] } }));
    if (gastosRows.length > 0) requests.push(sheets.spreadsheets.values.append({ spreadsheetId, range: 'Gastos!A:D', valueInputOption: 'USER_ENTERED', requestBody: { values: gastosRows } }));
    requests.push(sheets.spreadsheets.values.update({ spreadsheetId, range: `Choferes!E${rowIndexChofer}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[nuevoSaldoDeudor]] } }));
    await Promise.all(requests);

    // 8. Enviar Respuesta Exitosa
    res.status(200).json({ message: '¡Rendición guardada con éxito!' });

  } catch (error) { /* ... manejo de error sin cambios ... */
        console.error('Error en api/saveRendicion:', error.response ? error.response.data : error.message, error.stack);
        res.status(500).json({ error: 'Error al guardar la rendición en Sheets.', details: error.message });
  }
};