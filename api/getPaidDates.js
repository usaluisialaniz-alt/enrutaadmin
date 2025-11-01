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

    // Asume: Hoja 'DiasPagados'
    // Col C = fecha_pagada (YYYY-MM-DD)
    // Col D = choferId
    // Col F = tarifaAplicada
    // Col G = totalPagado (en esa transacción)
    // Col H = status ('paid' o 'partial')
    // ¡Leemos el rango completo C:H!
    const range = 'DiasPagados!C:H'; 

    console.log(`[getPaidDates] Buscando historial para choferId: ${choferId}`);
    
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = response.data.values || [];
    
    // 2. Crear el "mapa" de historial (como espera el frontend)
    // Ej: { '2025-10-10': { status: 'paid' }, '2025-10-11': { status: 'partial', tarifa: 5000, pagado: 2000 } }
    const paidDatesMap = {};
    
    if (rows.length > 0) {
        for (let i = 0; i < rows.length; i++) { 
            const row = rows[i];
            // El rango C:H tiene 6 columnas (C,D,E,F,G,H). Índices 0 a 5.
            const fecha = row[0]; // Col C
            const id = row[1];    // Col D
            const tarifa = parseFloat(row[3]) || 0; // Col F
            const pagado = parseFloat(row[4]) || 0; // Col G
            const status = row[5]; // Col H
            
            // Comparamos el ID de la Col D con el choferId
            if (id && fecha && String(id).trim() === String(choferId).trim()) {
                
                // Si el día es 'partial', guardamos todos los detalles
                if (status === 'partial') {
                    paidDatesMap[fecha] = {
                        status: 'partial',
                        tarifa: tarifa,
                        pagado: pagado
                    };
                } else {
                    // Si es 'paid', solo necesitamos saber el estado
                    paidDatesMap[fecha] = { status: 'paid' };
                }
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

