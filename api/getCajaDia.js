// api/getCajaDia.js (Con soporte para fecha)
const { google } = require('googleapis');
const { auth } = require('google-auth-library');

// Función auxiliar: Devuelve la cadena YYYY-MM-DD.
// Usa la fecha del query si es válida, o la fecha local de Argentina hoy.
function getTargetDate(fechaQuery) {
    // 1. Si el front-end envía YYYY-MM-DD, ÚSALA DIRECTAMENTE.
    if (fechaQuery && /^\d{4}-\d{2}-\d{2}$/.test(fechaQuery)) {
        console.log(`Usando fecha del query (string): ${fechaQuery}`);
        return fechaQuery; // Devuelve la cadena "2025-10-26" sin tocarla.
    } 
    
    // 2. Si no hay query (o es inválido), calcula la fecha de Argentina (Hoy).
    console.log("No hay fecha válida en query, usando fecha actual de Argentina.");
    
    try {
        // Usa Intl.DateTimeFormat para obtener YYYY-MM-DD de la zona horaria de Argentina.
        return new Intl.DateTimeFormat('sv-SE', {
            timeZone: 'America/Argentina/Buenos_Aires',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date());
    } catch (e) {
        // Fallback menos preciso (si Intl falla)
        console.warn("Error formateando fecha con Intl, usando fallback (menos preciso):", e);
        const date = new Date();
        const offset = -3 * 60; 
        const localDate = new Date(date.getTime() + offset * 60 * 1000);
        return localDate.toISOString().split('T')[0];
    }
}

// -------------------------------------------------------------
// Función auxiliar para convertir el número de serie de Sheets/Excel
function sheetSerialToLocalDate(serialNumber) {
    const MS_PER_DAY = 86400 * 1000;
    const utcValue = (serialNumber - 25569) * MS_PER_DAY;
    return new Date(utcValue);
}
// -------------------------------------------------------------


module.exports = async (req, res) => {
  try {
    // 1. Autenticación y Cliente Sheets (Sin Cambios)
    const credentials = { 
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    if (!credentials.client_email || !credentials.private_key) return res.status(500).json({ error: 'Config: Credenciales.' });
    const clientAuth = auth.fromJSON(credentials);
    clientAuth.scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
    const sheets = google.sheets({ version: 'v4', auth: clientAuth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) return res.status(500).json({ error: 'Config: Sheet ID.' });

    // 2. Fecha a Consultar (USANDO LA CADENA DIRECTA)
    const targetDateStr = getTargetDate(req.query.fecha); // Obtiene de ?fecha=YYYY-MM-DD o usa hoy
    console.log("Buscando transacciones para fecha:", targetDateStr); // Ej: "2025-10-26"

    // 3. Leer Hojas (Sin Cambios)
    const [rendicionesData, gastosData, choferesData] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId, range: 'Rendiciones!A:I' }),
        sheets.spreadsheets.values.get({ spreadsheetId, range: 'Gastos!A:E' }),
        sheets.spreadsheets.values.get({ spreadsheetId, range: 'Choferes!A:B' })
    ]);

    // 4. Procesar Datos y FILTRAR
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
            console.log(`[DEBUG RENDEROW ${index}] Tipo y Valor Original: ${typeof row[1]} -> ${row[1]}`); 

            // 🚨 ARREGLO CLAVE EN LA CONVERSIÓN DE FECHA DE GOOGLE SHEETS
            if (row[1]) {
                const rawValue = row[1];
                let dateAttempt = null;

                if (typeof rawValue === 'number') {
                    dateAttempt = sheetSerialToLocalDate(rawValue);
                } else if (typeof rawValue === 'string') {
                    // 💡 MEJORA: Distinguir entre fecha plana y fecha ISO
                    // Esto evita que '2025-10-26' (que es 00:00 UTC) se corra al 25 en Argentina.
                    if (rawValue.length === 10 && rawValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        // Forzar creación local (new Date(Y, M, D))
                        const [y, m, d] = rawValue.split('-').map(Number);
                        dateAttempt = new Date(y, m - 1, d);
                    } else {
                        // Asumir cadena ISO (con hora y/o Z)
                        dateAttempt = new Date(rawValue);
                    }
                }
                
                // Usa Intl.DateTimeFormat para forzar la conversión a YYYY-MM-DD en zona Argentina
                if (dateAttempt && !isNaN(dateAttempt.getTime())) {
                    // Esto es la clave: toma la hora del Date object, y la convierte
                    // a la cadena YYYY-MM-DD según la zona horaria de Argentina.
                    fechaRowStr = new Intl.DateTimeFormat('sv-SE', {
                        timeZone: 'America/Argentina/Buenos_Aires',
                        year: 'numeric', month: '2-digit', day: '2-digit'
                    }).format(dateAttempt);
                }
            }

            // ¡FILTRO POR FECHA! (Comparación de cadenas simples YYYY-MM-DD)
            if (fechaRowStr === targetDateStr) {
                const choferId = row[2];
                const choferNombre = mapaChoferes[choferId] || choferId || 'Desconocido';
                // La hora se sigue formateando correctamente
                const hora = row[1] ? new Date(row[1]).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) : '--:--';
                const efectivo = parseFloat(row[5]) || 0;
                const transferencia = parseFloat(row[6]) || 0;
                
                if (efectivo > 0) {
                    totalEfectivo += efectivo;
                    transacciones.push({ id: `p-ef-${row[0] || index}`, hora, chofer: choferNombre, tipo: 'pago', metodo: 'Efectivo', monto: efectivo });
                }
                if (transferencia > 0) {
                    totalTransferencia += transferencia;
                    transacciones.push({ id: `p-tr-${row[0] || index}`, hora, chofer: choferNombre, tipo: 'pago', metodo: 'Transferencia', monto: transferencia });
                }
            }
        } catch (e) { console.warn(`Error procesando fila rendición ${index + 2}:`, e.message); }
    });

     // b) Procesar Gastos
     gastoRows.slice(1).forEach((row, index) => {
         try {
             let fechaRowStr = null;
              // Asume Fecha está en col B (índice 1)
              if (row[1]) { 
                const rawValue = row[1];
                let dateAttempt = null;

                if (typeof rawValue === 'number') {
                    dateAttempt = sheetSerialToLocalDate(rawValue);
                } else if (typeof rawValue === 'string') {
                    // 💡 MEJORA: Distinguir entre fecha plana y fecha ISO
                    if (rawValue.length === 10 && rawValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        console.log(`[DEBUG RENDEROW ${index}] Date Objeto Node: ${dateAttempt.toISOString()} | Hora Local Servidor: ${dateAttempt.toString()}`);

                        // Forzar creación local (new Date(Y, M, D))
                        const [y, m, d] = rawValue.split('-').map(Number);
                        dateAttempt = new Date(y, m - 1, d);
                    } else {
                        // Asumir cadena ISO (con hora y/o Z)
                        dateAttempt = new Date(rawValue);
                    }
                }
                
                // Forzar la conversión a YYYY-MM-DD en zona Argentina
                if (dateAttempt && !isNaN(dateAttempt.getTime())) {
                    fechaRowStr = new Intl.DateTimeFormat('sv-SE', {
                        timeZone: 'America/Argentina/Buenos_Aires',
                        year: 'numeric', month: '2-digit', day: '2-digit'
                    }).format(dateAttempt);
                }
            }

            // ¡FILTRO POR FECHA! (Comparación de cadenas simples)
            if (fechaRowStr === targetDateStr) {
                const hora = row[1] ? new Date(row[1]).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) : '--:--';
                const concepto = row[3] || 'Gasto s/d'; 
                const monto = parseFloat(row[4]) || 0; 
                let choferNombreGasto = 'N/A';
                const idRendicionAsociada = row[2]; 

                if (idRendicionAsociada) {
                    const rendicionPadre = rendRows.find(r => r[0] === idRendicionAsociada);
                    if (rendicionPadre && rendicionPadre[2]) {
                        choferNombreGasto = mapaChoferes[rendicionPadre[2]] || rendicionPadre[2];
                    }
                }
                if (monto > 0) {
                    totalGastos += monto;
                    transacciones.push({ id: `g-${row[0] || index}`, hora, chofer: choferNombreGasto, tipo: 'gasto', concepto: concepto, monto: monto });
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
