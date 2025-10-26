// api/getVehiculos.js
const { google } = require('googleapis');
const { auth } = require('google-auth-library');

module.exports = async (req, res) => {
  try {
    // 1. Autenticación (Reutiliza las mismas variables de entorno)
    const credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    if (!credentials.client_email || !credentials.private_key) {
      return res.status(500).json({ error: 'Configuración incompleta: Faltan credenciales.' });
    }
    const clientAuth = auth.fromJSON(credentials);
    clientAuth.scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

    // 2. Cliente de Sheets
    const sheets = google.sheets({ version: 'v4', auth: clientAuth });

    // 3. Hoja y Rango (Asegúrate que el nombre 'Vehiculos' y el rango sean correctos)
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const range = 'Vehiculos!A2:F'; // Asume columnas A hasta F (ID, Nombre, Patente, Chofer?, T.Normal, T.Especial)
     if (!spreadsheetId) {
      return res.status(500).json({ error: 'Configuración incompleta: Falta Sheet ID.' });
    }

    // 4. Leer Datos
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = response.data.values || [];

    // 5. Procesar y Enviar
    // Ajusta los nombres si tus encabezados normalizados son diferentes
    const headers = ["id_vehiculo", "nombre_visible", "patente", "chofer_asignado", "tarifa_normal", "tarifa_especial"];
    const vehiculos = rows.map(row => {
        let obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] !== undefined ? row[index] : null;
        });
        return obj;
    }).filter(v => v.id_vehiculo); // Filtra filas sin ID

    res.status(200).json({ vehiculos });

  } catch (error) {
    console.error('Error en api/getVehiculos:', error.response ? error.response.data : error.message, error.stack);
    res.status(500).json({ error: 'Error al obtener vehículos de Sheets.', details: error.message });
  }
};