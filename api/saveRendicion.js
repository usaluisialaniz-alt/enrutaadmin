// api/saveRendicion.js
const { google } = require('googleapis');
const { auth } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid'); // Necesitarás instalar uuid: npm install uuid

module.exports = async (req, res) => {
  // Solo permitir método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // 1. Obtener Datos del Body de la Petición
    const { choferId, vehiculoId, montoAPagar, pagos, gastos } = req.body;

    // Validación básica de datos recibidos
    if (!choferId || !vehiculoId || typeof montoAPagar === 'undefined') {
      return res.status(400).json({ error: 'Faltan datos requeridos (choferId, vehiculoId, montoAPagar).' });
    }

    // 2. Autenticación (necesita permisos de escritura ahora)
    const credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
     if (!credentials.client_email || !credentials.private_key) {
      return res.status(500).json({ error: 'Configuración incompleta: Faltan credenciales.' });
    }
    const clientAuth = auth.fromJSON(credentials);
    // ¡IMPORTANTE! Cambiar el scope para permitir escritura
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
    const pagoTransferenciaNum = pagosArray.filter(p => p.metodo.toLowerCase() !== 'efectivo').reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0); // Agrupa Transferencia, MP, etc.
    const totalPagado = pagoEfectivoNum + pagoTransferenciaNum;

    // 5. Obtener Deuda Anterior (¡Requiere leer la hoja Choferes!)
    const rangeChofer = `Choferes!A:F`; // Asume A=ID, E=Deuda_Actual (col 5)
    const choferData = await sheets.spreadsheets.values.get({ spreadsheetId, range: rangeChofer });
    const choferRows = choferData.data.values || [];
    let deudaAnterior = 0;
    let rowIndexChofer = -1;

    // Buscamos la fila del chofer para obtener deuda y rowIndex
    // Empezamos en 1 para saltar encabezado, rowIndex será +2 al final
    for (let i = 1; i < choferRows.length; i++) {
        if (choferRows[i][0] === choferId) { // Compara ID en columna A
            deudaAnterior = parseFloat(choferRows[i][4]) || 0; // Lee deuda de columna E
            rowIndexChofer = i + 1; // El índice + 1 (porque Sheets empieza en 1)
            break;
        }
    }

    if (rowIndexChofer === -1) {
      return res.status(404).json({ error: `Chofer con ID ${choferId} no encontrado en la hoja.` });
    }

    // 6. Calcular Nuevo Saldo
    const nuevoSaldoDeudor = (deudaAnterior + montoJornadaNum) - totalPagado - totalGastos;

    // 7. Preparar datos para escribir
    const idRendicion = `REN-${uuidv4().substring(0, 6).toUpperCase()}`;
    const fechaActual = new Date(); // Fecha/hora del servidor Vercel

    // Fila para hoja "Rendiciones" - Ajusta el orden según tus columnas
    // ID_Rendicion, Fecha, ID_Chofer, Monto_a_Pagar, Deuda_Anterior, Pago_Efectivo, Pago_Transferencia, Gastos_del_Dia, Saldo_Final
    const rendicionRow = [
        idRendicion, fechaActual.toISOString(), choferId,
        montoJornadaNum, deudaAnterior,
        pagoEfectivoNum, pagoTransferenciaNum,
        totalGastos, nuevoSaldoDeudor
    ];

    // Filas para hoja "Gastos" (si hay)
    const gastosRows = gastosArray.map(g => {
        const idGasto = `GAS-${uuidv4().substring(0, 6).toUpperCase()}`;
        // ID_Gasto, ID_Rendicion, Concepto, Monto
        return [idGasto, idRendicion, g.concepto, parseFloat(g.monto) || 0];
    });

    // 8. Escribir en Google Sheets (usando append y update)
    const requests = [];

    // a) Añadir rendición
    requests.push(sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Rendiciones!A:I', // Ajusta el rango si tienes más columnas
      valueInputOption: 'USER_ENTERED', // Permite que Sheets interprete formatos
      requestBody: { values: [rendicionRow] }
    }));

    // b) Añadir gastos (si hay)
    if (gastosRows.length > 0) {
      requests.push(sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Gastos!A:D', // Ajusta el rango
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: gastosRows }
      }));
    }

    // c) Actualizar deuda del chofer (usando update)
    requests.push(sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Choferes!E${rowIndexChofer}`, // Celda E (col 5) de la fila encontrada
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[nuevoSaldoDeudor]] } // Doble array para una sola celda
    }));

    // Ejecutar todas las escrituras en paralelo
    await Promise.all(requests);

    // 9. Enviar Respuesta Exitosa
    res.status(200).json({ message: '¡Rendición guardada con éxito!' });

  } catch (error) {
    console.error('Error en api/saveRendicion:', error.response ? error.response.data : error.message, error.stack);
    res.status(500).json({ error: 'Error al guardar la rendición en Sheets.', details: error.message });
  }
};