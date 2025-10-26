// api/getChoferes.js
const { google } = require('googleapis');
const { auth } = require('google-auth-library'); // Se instala junto con googleapis

// Función principal que Vercel ejecutará
module.exports = async (req, res) => {
  try {
    // 1. Autenticación (¡Usa Variables de Entorno!)
    const credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      // La clave privada necesita reemplazo de saltos de línea
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    const clientAuth = auth.fromJSON(credentials);
    clientAuth.scopes = ['https://www.googleapis.com/auth/spreadsheets']; // Permiso para Sheets

    // 2. Cliente de Google Sheets
    const sheets = google.sheets({ version: 'v4', auth: clientAuth });

    // 3. ID de tu Hoja y Rango a Leer (¡Usa Variables de Entorno!)
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const range = 'Choferes!A2:F'; // Lee desde A2 hasta la última fila de la columna F en la hoja "Choferes"

    // 4. Leer los Datos
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    // 5. Procesar y Enviar Respuesta
    const rows = response.data.values || [];

    // Convertimos el array de arrays en array de objetos (similar a lo que hicimos en Apps Script)
    const headers = ["id_chofer", "nombre_completo", "telefono", "vehiculo_asignado_id", "deuda_actual", "estado"]; // Asume este orden de columnas
    const choferes = rows.map(row => {
        let obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index];
        });
        return obj;
    });

    res.status(200).json({ choferes }); // Envía los datos como JSON

  } catch (error) {
    console.error('Error al obtener datos de Sheets:', error);
    res.status(500).json({ error: 'Error al conectar con Google Sheets', details: error.message });
  }
};