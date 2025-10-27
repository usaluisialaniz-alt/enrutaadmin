// api/getCajaDia.js
const { google } = require('googleapis');
const { auth } = require('google-auth-library');

// Función auxiliar para obtener YYYY-MM-DD en zona horaria Argentina
// Considera usar una librería como date-fns-tz o luxon para manejo preciso de DST si es necesario.
function getTargetDate(fechaQuery) {
    let targetDate;
    if (fechaQuery && /^\d{4}-\d{2}-\d{2}$/.test(fechaQuery)) {
        // Usa la fecha del query si es válida y está en formato YYYY-MM-DD
        targetDate = new Date(`${fechaQuery}T00:00:00-03:00`); // Asume UTC-3
    } else {
        // Usa la fecha actual en Argentina
        targetDate = new Date();
    }
    // Formatea a YYYY-MM-DD usando Intl.DateTimeFormat para mayor precisión de zona horaria
    try {
        return new Intl.DateTimeFormat('sv-SE', { // sv-SE da YYYY-MM-DD
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(targetDate);
    } catch (e) {
        console.warn("Error formateando fecha, usando método fallback:", e);
        // Fallback simple (menos preciso con zonas horarias extremas)
        const offset = -3 * 60; // Offset UTC-3
        const localDate = new Date(targetDate.getTime() + offset * 60 * 1000);
        return localDate.toISOString().split('T')[0];
    }
}

module.exports = async (req, res) => {
  try {
    // 1. Autenticación y Cliente Sheets
    const credentials = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    if (!credentials.client_email || !credentials.private_key) return res.status(500).json({ error: 'Config: Credenciales.' });
    const clientAuth = auth.fromJSON(credentials);
    clientAuth.scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly']; // Solo lectura
    const sheets = google.sheets({ version: 'v4', auth: clientAuth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) return res.status(500).json({ error: 'Config: Sheet ID.' });

    // 2. Fecha a Consultar (del query o hoy)
    const targetDateStr = getTargetDate(req.query.fecha); // YYYY-MM-DD
    console.log("Buscando transacciones para fecha:", targetDateStr);

    // 3. Leer Hojas (Rendiciones, Gastos, Choferes) - Ajusta rangos si es necesario
    const [rendicionesData, gastosData, choferesData] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId, range: 'Rendiciones!A:I' }), // ID, Fecha, ID_Chofer, _, _, Pago_Efectivo, Pago_Transferencia, _, _
        sheets.spreadsheets.values.get({ spreadsheetId, range: 'Gastos!A:E' }),      // ID_Gasto, Fecha, ID_Rendicion, Concepto, Monto
        sheets.spreadsheets.values.get({ spreadsheetId, range: 'Choferes!A:B' })     // ID_Chofer, Nombre_Completo
    ]);

    // 4. Procesar Datos
    const rendRows = rendicionesData.data.values || [];
    const gastoRows = gastosData.data.values || [];
    const choferRows = choferesData.data.values || [];

    const mapaChoferes = {};
    choferRows.slice(1).forEach(row => { // slice(1) para saltar encabezado
        if (row[0]) mapaChoferes[row[0]] = row[1] || 'Nombre Desconocido';
    });

    const transacciones = [];
    let totalEfectivo = 0, totalTransferencia = 0, totalMercadoPago = 0, totalGastos = 0;

    // a) Procesar Pagos desde Rendiciones
    // Columnas: 0=ID_Rend, 1=Fecha, 2=ID_Chofer, 5=Pago_Efectivo, 6=Pago_Transferencia
    rendRows.slice(1).forEach((row, index) => {
        try {
            // Intenta convertir la fecha de forma segura y comparar YYYY-MM-DD
            let fechaRowStr = null;
            if (row[1]) {
                 if (row[1] instanceof Date) {
                     fechaRowStr = row[1].toISOString().split('T')[0];
                 } else if (typeof row[1] === 'string') {
                     // Intenta parsear como ISO o formatos comunes
                     const dateAttempt = new Date(row[1]);
                     if (!isNaN(dateAttempt)) fechaRowStr = dateAttempt.toISOString().split('T')[0];
                     else console.warn(`Formato fecha rendición ${index+2} no reconocido:`, row[1]);
                 } else if (typeof row[1] === 'number') { // Número serial Sheets
                     const dateAttempt = new Date(Math.round((row[1] - 25569) * 86400 * 1000));
                     if (!isNaN(dateAttempt)) fechaRowStr = dateAttempt.toISOString().split('T')[0];
                 }
            }

            if (fechaRowStr === targetDateStr) {
                const choferId = row[2];
                const choferNombre = mapaChoferes[choferId] || choferId || 'Desconocido';
                const hora = row[1] ? new Date(row[1]).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) : '--:--';

                const efectivo = parseFloat(row[5]) || 0;
                const transferencia = parseFloat(row[6]) || 0; // Incluye MP aquí por ahora

                if (efectivo > 0) {
                    transacciones.push({ id: `p-ef-${row[0] || index}`, hora, chofer: choferNombre, tipo: 'pago', metodo: 'Efectivo', monto: efectivo });
                    totalEfectivo += efectivo;
                }
                if (transferencia > 0) {
                     // TODO: Diferenciar Transferencia y MP si la hoja o saveRendicion lo permiten
                    transacciones.push({ id: `p-tr-${row[0] || index}`, hora, chofer: choferNombre, tipo: 'pago', metodo: 'Transferencia', monto: transferencia });
                    totalTransferencia += transferencia;
                }
            }
        } catch (e) {
            console.warn(`Error procesando fila de rendición ${index + 2}:`, e.message, row);
        }
    });

     // b) Procesar Gastos
     // Columnas: 0=ID_Gasto, 1=Fecha, 2=ID_Rendicion, 3=Concepto, 4=Monto
     gastoRows.slice(1).forEach((row, index) => {
         try {
             let fechaRowStr = null;
             if (row[1]) {
                 if (row[1] instanceof Date) {
                     fechaRowStr = row[1].toISOString().split('T')[0];
                 } else if (typeof row[1] === 'string') {
                     const dateAttempt = new Date(row[1]);
                     if (!isNaN(dateAttempt)) fechaRowStr = dateAttempt.toISOString().split('T')[0];
                     else console.warn(`Formato fecha gasto ${index+2} no reconocido:`, row[1]);
                 } else if (typeof row[1] === 'number') {
                     const dateAttempt = new Date(Math.round((row[1] - 25569) * 86400 * 1000));
                     if (!isNaN(dateAttempt)) fechaRowStr = dateAttempt.toISOString().split('T')[0];
                 }
            }

            if (fechaRowStr === targetDateStr) {
                const hora = row[1] ? new Date(row[1]).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) : '--:--';
                const concepto = row[3] || 'Gasto s/d';
                const monto = parseFloat(row[4]) || 0;
                let choferNombreGasto = 'N/A';
                const idRendicionAsociada = row[2];
                 if (idRendicionAsociada) { // Intentamos buscar el chofer por la rendición asociada
                     const rendicionPadre = rendRows.find(r => r[0] === idRendicionAsociada);
                     if (rendicionPadre && rendicionPadre[2]) {
                         choferNombreGasto = mapaChoferes[rendicionPadre[2]] || rendicionPadre[2];
                     }
                 }

                if (monto > 0) {
                    transacciones.push({ id: `g-${row[0] || index}`, hora, chofer: choferNombreGasto, tipo: 'gasto', concepto: concepto, monto: monto });
                    totalGastos += monto;
                }
            }
         } catch (e) {
             console.warn(`Error procesando fila de gasto ${index + 2}:`, e.message, row);
         }
     });

    // Ordenar transacciones por hora
    transacciones.sort((a, b) => a.hora.localeCompare(b.hora));

    // 5. Calcular Totales Finales
    const totalPagos = totalEfectivo + totalTransferencia + totalMercadoPago; // MP es 0
    const totalNeto = totalPagos - totalGastos;

    // 6. Enviar Respuesta
    res.status(200).json({
        fecha: targetDateStr,
        transacciones,
        totales: {
            efectivo: totalEfectivo,
            transferencia: totalTransferencia,
            mercadoPago: totalMercadoPago,
            gastos: totalGastos,
            pagos: totalPagos,
            neto: totalNeto
        }
    });

  } catch (error) {
    console.error('Error en api/getCajaDia:', error.response ? error.response.data : error.message, error.stack);
    res.status(500).json({ error: 'Error al obtener datos de caja.', details: error.message });
  }
};