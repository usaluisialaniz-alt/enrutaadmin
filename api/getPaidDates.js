const { google } = require('googleapis');
const { auth } = require('google-auth-library');

// (Puedes reusar la función getAuthenticatedClient)
async function getAuthenticatedClient() {
    const credentials = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    if (!credentials.client_email || !credentials.private_key) throw new Error('Configuración: Faltan credenciales.');
    const clientAuth = auth.fromJSON(credentials);
    clientAuth.scopes = ['https://www.googleapis.com/auth/spreadsheets']; // Solo se necesita leer
    return clientAuth;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  // 1. Obtener el choferId de la URL (ej: ?choferId=c1)
  const { choferId } = req.query;
  if (!choferId) return res.status(400).json({ error: 'Falta choferId' });

  try {
    const clientAuth = await getAuthenticatedClient();
    const sheets = google.sheets({ version: 'v4', auth: clientAuth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Asume:
    // Hoja 'DiasPagados'
    // Columna C (índice 2) = fecha_pagada (YYYY-MM-DD)
    // Columna D (índice 3) = choferId
    // Columna G (índice 6) = status ('paid' o 'partial')
    // Leemos el rango C:G
    const range = 'DiasPagados!C:G'; 

    console.log(`[getPaidDates] Buscando historial para choferId: ${choferId}`);
    
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = response.data.values || [];
    
    // 2. Crear el "mapa" de historial (como espera el frontend)
    // Ej: { '2025-10-10': 'paid', '2025-10-11': 'partial' }
    const paidDatesMap = {};
    
    if (rows.length > 0) {
        // Itera y filtra las fechas que coinciden con el choferId
        // Asume que la Fila 1 (índice 0) NO es encabezado, o filtra si lo es.
        // Empezamos en 0 (si no hay encabezado) o 1 (si sí lo hay)
        for (let i = 0; i < rows.length; i++) { 
            const row = rows[i];
            
            // Índices basados en el rango C:G
            const fecha = row[0]; // Col C (índice 0 en el array 'row')
            const id = row[1];    // Col D (índice 1 en el array 'row')
            const status = row[4]; // Col G (índice 4 en el array 'row')
            
            // Comparamos el ID de la Col D con el choferId
            if (id && fecha && String(id).trim() === String(choferId).trim()) {
                paidDatesMap[fecha] = status || 'paid'; // Guarda el status ('paid' o 'partial')
            }
        }
    }

    console.log(`[getPaidDates] Encontradas ${Object.keys(paidDatesMap).length} fechas pagadas.`);
    // 3. Devolver el objeto
    res.status(200).json({ paidDates: paidDatesMap });

  } catch (error) {
        console.error('Error en api/getPaidDates:', error.message, error.stack);
        res.status(500).json({ error: 'Error al obtener historial.', details: error.message });
  }
};

