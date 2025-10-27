// api/getCajaDia.js (Con soporte para fecha)
const { google } = require('googleapis');
const { auth } = require('google-auth-library');

// Función auxiliar para obtener YYYY-MM-DD en zona horaria Argentina
function getTargetDate(fechaQuery) {
    let targetDate;
    // Valida si la fecha del query es YYYY-MM-DD
    if (fechaQuery && /^\d{4}-\d{2}-\d{2}$/.test(fechaQuery)) {
        console.log(`Usando fecha del query: ${fechaQuery}`);
        // Creamos la fecha asumiendo que la entrada es local de Argentina (UTC-3)
        // Ojo: Esto es una simplificación. Para precisión total se necesitaría Luxon/date-fns-tz
        targetDate = new Date(`${fechaQuery}T00:00:00-03:00`);
    } else {
        console.log("No hay fecha válida en query, usando fecha actual de Argentina.");
        targetDate = new Date(); // Usa la fecha actual del servidor
    }

    // Formatea a YYYY-MM-DD usando zona horaria Argentina
    try {
        return new Intl.DateTimeFormat('sv-SE', { // sv-SE da YYYY-MM-DD
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(targetDate);
    } catch (e) {
        // Fallback (menos preciso)
        console.warn("Error formateando fecha con Intl, usando fallback:", e);
        const offset = -3 * 60; // Offset UTC-3
        const localDate = new Date(targetDate.getTime() + offset * 60 * 1000);
        return localDate.toISOString().split('T')[0];
    }
}

module.exports = async (req, res) => {
  try {
    // 1. Autenticación y Cliente Sheets (Sin Cambios)
    const credentials = { /* ... */
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    if (!credentials.client_email || !credentials.private_key) return res.status(500).json({ error: 'Config: Credenciales.' });
    const clientAuth = auth.fromJSON(credentials);
    clientAuth.scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
    const sheets = google.sheets({ version: 'v4', auth: clientAuth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) return res.status(500).json({ error: 'Config: Sheet ID.' });

    // 2. Fecha a Consultar (¡AHORA USA EL QUERY!)
    const targetDateStr = getTargetDate(req.query.fecha); // Obtiene de ?fecha=YYYY-MM-DD o usa hoy
    console.log("Buscando transacciones para fecha:", targetDateStr);

    // 3. Leer Hojas (Sin Cambios)
    const [rendicionesData, gastosData, choferesData] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId, range: 'Rendiciones!A:I' }),
        sheets.spreadsheets.values.get({ spreadsheetId, range: 'Gastos!A:E' }),
        sheets.spreadsheets.values.get({ spreadsheetId, range: 'Choferes!A:B' })
    ]);

    // 4. Procesar Datos (Sin Cambios Lógicos, pero usa targetDateStr para filtrar)
    const rendRows = rendicionesData.data.values || [];
    const gastoRows = gastosData.data.values || [];
    const choferRows = choferesData.data.values || [];
    const mapaChoferes = {};
    choferRows.slice(1).forEach(row => { if (row[0]) mapaChoferes[row[0]] = row[1] || 'ND'; });

    const transacciones = [];
    let totalEfectivo = 0, totalTransferencia = 0, totalMercadoPago = 0, totalGastos = 0;

    // a) Procesar Pagos
    rendRows.slice(1).forEach((row, index) => {
        try {
            let fechaRowStr = null; // Compararemos YYYY-MM-DD
            if (row[1]) {
                 if (row[1] instanceof Date) { fechaRowStr = row[1].toISOString().split('T')[0]; }
                 else if (typeof row[1] === 'string') {
                     const dateAttempt = new Date(row[1]);
                     if (!isNaN(dateAttempt)) fechaRowStr = dateAttempt.toISOString().split('T')[0];
                 } else if (typeof row[1] === 'number') {
                     const dateAttempt = new Date(Math.round((row[1] - 25569) * 86400 * 1000));
                     if (!isNaN(dateAttempt)) fechaRowStr = dateAttempt.toISOString().split('T')[0];
                 }
            }
            // ¡FILTRO POR FECHA!
            if (fechaRowStr === targetDateStr) {
                // ... (resto del procesamiento de pagos sin cambios) ...
                 const choferId = row[2];
                const choferNombre = mapaChoferes[choferId] || choferId || 'Desconocido';
                const hora = row[1] ? new Date(row[1]).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) : '--:--';
                const efectivo = parseFloat(row[5]) || 0;
                const transferencia = parseFloat(row[6]) || 0;
                if (efectivo > 0) {
                    transacciones.push({ id: `p-ef-${row[0] || index}`, hora, chofer: choferNombre, tipo: 'pago', metodo: 'Efectivo', monto: efectivo });
                    totalEfectivo += efectivo;
                }
                if (transferencia > 0) {
                    transacciones.push({ id: `p-tr-${row[0] || index}`, hora, chofer: choferNombre, tipo: 'pago', metodo: 'Transferencia', monto: transferencia });
                    totalTransferencia += transferencia;
                }
            }
        } catch (e) { console.warn(`Error procesando fila rendición ${index + 2}:`, e.message); }
    });

     // b) Procesar Gastos
     gastoRows.slice(1).forEach((row, index) => {
         try {
             let fechaRowStr = null;
              if (row[1]) { // Asume Fecha está en col B (índice 1)
                 if (row[1] instanceof Date) { fechaRowStr = row[1].toISOString().split('T')[0]; }
                 else if (typeof row[1] === 'string') {
                     const dateAttempt = new Date(row[1]);
                     if (!isNaN(dateAttempt)) fechaRowStr = dateAttempt.toISOString().split('T')[0];
                 } else if (typeof row[1] === 'number') {
                     const dateAttempt = new Date(Math.round((row[1] - 25569) * 86400 * 1000));
                     if (!isNaN(dateAttempt)) fechaRowStr = dateAttempt.toISOString().split('T')[0];
                 }
            }
            // ¡FILTRO POR FECHA!
            if (fechaRowStr === targetDateStr) {
                // ... (resto del procesamiento de gastos sin cambios) ...
                const hora = row[1] ? new Date(row[1]).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) : '--:--';
                const concepto = row[3] || 'Gasto s/d'; // Asume Concepto col D (índice 3)
                const monto = parseFloat(row[4]) || 0; // Asume Monto col E (índice 4)
                let choferNombreGasto = 'N/A';
                const idRendicionAsociada = row[2]; // Asume ID Rendicion col C (índice 2)
                 if (idRendicionAsociada) {
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
         } catch (e) { console.warn(`Error procesando fila gasto ${index + 2}:`, e.message); }
     });

    // Ordenar transacciones por hora (Sin Cambios)
    transacciones.sort((a, b) => a.hora.localeCompare(b.hora));

    // 5. Calcular Totales Finales (Sin Cambios)
    const totalPagos = totalEfectivo + totalTransferencia + totalMercadoPago;
    const totalNeto = totalPagos - totalGastos;

    // 6. Enviar Respuesta (Sin Cambios)
    res.status(200).json({
        fecha: targetDateStr, // La fecha que se consultó
        transacciones,
        totales: { /* ... */
            efectivo: totalEfectivo,
            transferencia: totalTransferencia,
            mercadoPago: totalMercadoPago,
            gastos: totalGastos,
            pagos: totalPagos,
            neto: totalNeto
         }
    });

  } catch (error) { /* ... manejo de error sin cambios ... */
    console.error('Error en api/getCajaDia:', error.response ? error.response.data : error.message, error.stack);
    res.status(500).json({ error: 'Error al obtener datos de caja.', details: error.message });
  }
};