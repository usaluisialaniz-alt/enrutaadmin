// api/getVehiculos.js
const { google } = require('googleapis');
const { auth } = require('google-auth-library');

// --- Autenticación (Solo necesita permisos de LECTURA) ---
async function getAuthenticatedClient() {
    const credentials = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    if (!credentials.client_email || !credentials.private_key) {
        throw new Error('Configuración: Faltan credenciales de Google.');
    }
    const clientAuth = auth.fromJSON(credentials);
    clientAuth.scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
    return clientAuth;
}

// --- Handler de la API ---
module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Método ${req.method} no permitido.` });
    }

    try {
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;
        if (!spreadsheetId) {
             return res.status(500).json({ error: 'Configuración: Falta GOOGLE_SHEET_ID.' });
        }

        const clientAuth = await getAuthenticatedClient();
        const sheets = google.sheets({ version: 'v4', auth: clientAuth });

        // ¡AJUSTA ESTOS VALORES SI TU HOJA ES DIFERENTE!
        const sheetName = 'Vehiculos';
        // Asegúrate que el rango cubra TODAS las columnas necesarias (A hasta G en este caso)
        const range = `${sheetName}!A:G`;
        const idColIndex = 0;       // Columna A
        const nombreColIndex = 1;   // Columna B
        const patenteColIndex = 2;  // Columna C
        const choferColIndex = 3;   // Columna D (Chofer) ✨
        const tnColIndex = 4;       // Columna E (Tarifa Normal)
        const teColIndex = 5;       // Columna F (Tarifa Especial)
        const estadoColIndex = 6;   // Columna G (Estado) ✨

        console.log(`Leyendo datos de: ${range}`);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            // valueRenderOption: 'UNFORMATTED_VALUE', // Podría ayudar si las tarifas son números
            // dateTimeRenderOption: 'SERIAL_NUMBER' // Podría ayudar si las fechas son números
        });

        const rows = response.data.values || [];
        console.log(`Filas obtenidas de Sheets: ${rows.length}`);

        // Mapear filas a objetos Vehiculo (saltando la cabecera)
        const vehiculos = rows.slice(1).map((row, index) => {
             // Validación básica (ID, Nombre, Patente)
            if (!row || !row[idColIndex] || !row[nombreColIndex] || !row[patenteColIndex]) {
                 console.warn(`Fila ${index + 2} incompleta o sin ID/Nombre/Patente, saltando.`);
                 return null; // Saltar fila incompleta
            }

            // Extraer y limpiar datos
            const id_vehiculo = row[idColIndex];
            const nombre_visible = row[nombreColIndex];
            const patente = row[patenteColIndex];
            // Leer la columna del chófer (índice 3), default a null si está vacía
            const chofer = row[choferColIndex] || null;
            // Leer tarifas, default a 0
            const tarifa_normal = row[tnColIndex] || 0;
            const tarifa_especial = row[teColIndex] || 0;
            // Leer estado (índice 6), limpiar y default a 'inactivo'
            const estadoRaw = row[estadoColIndex];
            let estado = 'inactivo'; // Default state
            if (typeof estadoRaw === 'string') {
                const estadoTrimmedLower = estadoRaw.trim().toLowerCase();
                if (['activo', 'mantenimiento', 'inactivo'].includes(estadoTrimmedLower)) {
                    estado = estadoTrimmedLower;
                } else {
                     console.warn(`Fila ${index + 2}: Estado "${estadoRaw}" no reconocido, usando "inactivo".`);
                }
            } else if (estadoRaw != null) { // Si no es string pero tampoco es null/undefined
                 console.warn(`Fila ${index + 2}: Estado "${estadoRaw}" (tipo ${typeof estadoRaw}) no es string, usando "inactivo".`);
            }


            // Log detallado por fila para depuración
            // console.log(`Procesando Fila ${index + 2}: ID=${id_vehiculo}, Nombre=${nombre_visible}, Patente=${patente}, ChoferRaw=${row[choferColIndex]}, EstadoRaw=${estadoRaw} -> Estado=${estado}`);

            return {
                id_vehiculo,
                nombre_visible,
                patente,
                chofer,             // ✨ Usar el valor leído de la columna D
                tarifa_normal,
                tarifa_especial,
                estado,             // ✨ Usar el valor limpio de la columna G
            };
        }).filter(vehiculo => vehiculo !== null); // Filtrar filas nulas (saltadas)

        console.log(`Vehículos procesados válidos: ${vehiculos.length}`);

        return res.status(200).json({ vehiculos }); // Devuelve el array dentro de un objeto

    } catch (error) {
        console.error('Error en GET /api/getVehiculos:', error.message, error.stack);
        const status = error.message.includes('Configuración') || error.message.includes('permission') ? 500 : 404;
        res.status(status).json({ error: 'Error al obtener los vehículos.', details: error.message });
    }
};

