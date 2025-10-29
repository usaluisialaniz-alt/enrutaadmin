// api/vehiculos/index.js
const { google } = require('googleapis');
const { auth } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid'); // Para IDs únicos

// --- Autenticación (Necesita permisos de ESCRITURA) ---
async function getAuthenticatedClient() {
    const credentials = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    if (!credentials.client_email || !credentials.private_key) {
        throw new Error('Configuración: Faltan credenciales de Google.');
    }
    const clientAuth = auth.fromJSON(credentials);
    clientAuth.scopes = ['https://www.googleapis.com/auth/spreadsheets']; // Scope de escritura
    return clientAuth;
}

// --- Handler de la API ---
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Método ${req.method} no permitido.` });
    }

    try {
        const { nombre_visible, patente, tarifa_normal, tarifa_especial, estado } = req.body;
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;
        const sheetName = 'Vehiculos'; // ¡Asegúrate que este sea el nombre correcto!

        // Validación de entrada
        if (!nombre_visible || !patente || !estado) {
            return res.status(400).json({ error: 'Faltan campos requeridos (nombre_visible, patente, estado).' });
        }
        if (!['activo', 'mantenimiento', 'inactivo'].includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido.' });
        }
        // Puedes añadir más validaciones (ej. formato de patente)

        const clientAuth = await getAuthenticatedClient();
        const sheets = google.sheets({ version: 'v4', auth: clientAuth });

        const nuevoId = uuidv4(); // Genera ID único

        // Prepara la fila (Orden: A=ID, B=Nombre, C=Patente, D=T.Normal, E=T.Especial, F=Estado)
        // ¡Verifica que este orden coincida EXACTAMENTE con tu hoja!
        const nuevaFila = [
            nuevoId,
            nombre_visible,
            patente.toUpperCase(), // Guardar patente en mayúsculas
            Number(tarifa_normal) || 0,
            Number(tarifa_especial) || 0,
            estado,
        ];

        console.log(`Agregando nueva fila a ${sheetName}:`, nuevaFila);

        // Añadir la fila
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${sheetName}!A:G`, // Asegúrate que el rango cubra todas las columnas
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [nuevaFila],
            },
        });

        console.log("Fila de vehículo agregada con éxito.");

        // Devuelve el objeto creado
        const nuevoVehiculo = {
            id_vehiculo: nuevoId,
            nombre_visible,
            patente: patente.toUpperCase(),
            tarifa_normal: Number(tarifa_normal) || 0,
            tarifa_especial: Number(tarifa_especial) || 0,
            estado,
        };
        return res.status(201).json({ vehiculo: nuevoVehiculo });

    } catch (error) {
        console.error('Error en POST /api/vehiculos:', error.message, error.stack);
        const status = error.message.includes('Configuración') ? 500 : 400;
        res.status(status).json({ error: 'Error al agregar el vehículo.', details: error.message });
    }
};
