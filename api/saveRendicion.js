// api/saveRendicion.js
const { google } = require('googleapis');
const { auth } = require('google-auth-library');
// const { v4: uuidv4 } = require('uuid'); // <-- LÍNEA ANTIGUA COMENTADA

module.exports = async (req, res) => {
  // Solo permitir método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // --- ¡NUEVO! Importación dinámica de uuid ---
    const { v4: uuidv4 } = await import('uuid');
    // --- FIN Importación ---

    // 1. Obtener Datos del Body de la Petición
    const { choferId, vehiculoId, montoAPagar, pagos, gastos } = req.body;

    if (!choferId || !vehiculoId || typeof montoAPagar === 'undefined') {
      return res.status(400).json({ error: 'Faltan datos requeridos (choferId, vehiculoId, montoAPagar).' });
    }

    // 2. Autenticación
    const credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
     if (!credentials.client_email || !credentials.private_key) {
      return res.status(500).json({ error: 'Configuración incompleta: Faltan credenciales.' });
    }
    const clientAuth = auth.fromJSON(credentials);
    clientAuth.scopes = ['https://www.googleapis.com/auth/spreadsheets'];

    // 3. Cliente de Sheets
    const sheets = google.sheets({ version: 'v4', auth: clientAuth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
     if (!spreadsheetId) {
      return res.status(500).json({ error: 'Configuración incompleta: Falta Sheet ID.' });
    }

    // 4. Procesar Pagos y Gastos
    const montoJornadaNum = parseFloat(montoAPagar) || 0;
    const gastosArray = gastos || [];
    const totalGastos = gastosArray.reduce((sum, g) => sum + (parseFloat(g.monto) || 0), 0);
    const pagosArray = pagos || [];
    const pagoEfectivoNum = pagosArray.filter(p => p.metodo.toLowerCase() === 'efectivo').reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
    const pagoTransferenciaNum = pagosArray.filter(p => p.metodo.toLowerCase() !== 'efectivo').reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
    const totalPagado = pagoEfectivoNum + pagoTransferenciaNum;

    // 5. Obtener Deuda Anterior
    const rangeChofer = `Choferes!A:F`; // Asume A=ID, E=Deuda_Actual (col 5)
    const choferData = await sheets.spreadsheets.values.get({ spreadsheetId, range: rangeChofer });
    const choferRows = choferData.data.values || [];
    let deudaAnterior = 0;
    let rowIndexChofer = -1;

    for (let i = 1; i < choferRows.length; i++) { // Empieza en 1 para saltar header
        if (choferRows[i][0] === choferId) {
            deudaAnterior = parseFloat(choferRows[i][4]) || 0; // Lee deuda de columna E
            rowIndexChofer = i + 1; // Índice de fila en Sheets (base 1)
            break;
        }
    }

    if (rowIndexChofer === -1) {
      return res.status(404).json({ error: `Chofer con ID ${choferId} no encontrado en la hoja.` });
    }

    // 6. Calcular Nuevo Saldo
    const nuevoSaldoDeudor = (deudaAnterior + montoJornadaNum) - totalPagado - totalGastos;

    // 7. Preparar datos para escribir
    // ¡uuidv4 ahora está disponible aquí gracias al import dinámico!
    const idRendicion = `REN-${uuidv4().substring(0, 6).toUpperCase()}`;
    const fechaActual = new Date();

    const rendicionRow = [
        idRendicion, fechaActual.toISOString(), choferId,
        montoJornadaNum, deudaAnterior,
        pagoEfectivoNum, pagoTransferenciaNum,
        totalGastos, nuevoSaldoDeudor
    ];

    const gastosRows = gastosArray.map(g => {
        const idGasto = `GAS-${uuidv4().substring(0, 6).toUpperCase()}`;
        return [idGasto, idRendicion, g.concepto, parseFloat(g.monto) || 0];
    });

    // 8. Escribir en Google Sheets
    const requests = [];
    requests.push(sheets.spreadsheets.values.append({
      spreadsheetId, range: 'Rendiciones!A:I', valueInputOption: 'USER_ENTERED',
      requestBody: { values: [rendicionRow] }
    }));
    if (gastosRows.length > 0) {
      requests.push(sheets.spreadsheets.values.append({
        spreadsheetId, range: 'Gastos!A:D', valueInputOption: 'USER_ENTERED',
        requestBody: { values: gastosRows }
      }));
    }
    requests.push(sheets.spreadsheets.values.update({
        spreadsheetId, range: `Choferes!E${rowIndexChofer}`, valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[nuevoSaldoDeudor]] }
    }));

    await Promise.all(requests);

    // 9. Enviar Respuesta Exitosa
    res.status(200).json({ message: '¡Rendición guardada con éxito!' });

  } catch (error) {
    console.error('Error en api/saveRendicion:', error.response ? error.response.data : error.message, error.stack);
    res.status(500).json({ error: 'Error al guardar la rendición en Sheets.', details: error.message });
  }
};