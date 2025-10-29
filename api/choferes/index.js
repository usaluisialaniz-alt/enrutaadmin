// api/choferes/index.js
const { google } = require('googleapis');
const { auth } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid'); // Para generar IDs únicos

// --- Autenticación (Asegúrate de tener permisos de ESCRITURA) ---
async function getAuthenticatedClient() {
    const credentials = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    if (!credentials.client_email || !credentials.private_key) {
        throw new Error('Configuración: Faltan credenciales de Google.');
    }
    const clientAuth = auth.fromJSON(credentials);
    // 🚨 ¡Necesitas el scope de escritura!
    clientAuth.scopes = ['https://www.googleapis.com/auth/spreadsheets'];
    return clientAuth;
}

// --- Handler de la API ---
module.exports = async (req, res) => {
    // Solo permitir método POST
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Método ${req.method} no permitido.` });
    }

    try {
        const { nombre_completo, telefono, deuda_actual, estado } = req.body;
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;

        // Validación básica de entrada
        if (!nombre_completo || !estado) {
            return res.status(400).json({ error: 'Faltan campos requeridos (nombre_completo, estado).' });
        }
        if (!['activo', 'inactivo'].includes(estado)) {
            return res.status(400).json({ error: 'El estado debe ser "activo" o "inactivo".' });
        }

        const clientAuth = await getAuthenticatedClient();
        const sheets = google.sheets({ version: 'v4', auth: clientAuth });

        // Generar un ID único para el nuevo chófer
        const nuevoId = uuidv4();

        // Preparar la fila a agregar (Asegúrate que el orden coincida con tus columnas en Sheets)
        // Col A: id_chofer, Col B: nombre_completo, Col C: telefono, Col D: vehiculo_asignado_id (null), Col E: deuda_actual, Col F: estado
        const nuevaFila = [
            nuevoId,
            nombre_completo,
            telefono || '', // Si no viene teléfono, poner vacío
            '', // Vehículo asignado (asumimos vacío por ahora)
            Number(deuda_actual) || 0, // Asegurar que sea número
            estado,
        ];

        console.log("Agregando nueva fila a Sheets:", nuevaFila);

        // Añadir la fila a la hoja 'Choferes'
        // IMPORTANTE: Asegúrate que 'Choferes!A:F' cubra todas las columnas que quieres escribir
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Choferes!A:F', // Ajusta el rango si tienes más columnas
            valueInputOption: 'USER_ENTERED', // Interpreta los valores como si los escribiera un usuario
            insertDataOption: 'INSERT_ROWS', // Inserta la fila al final
            resource: {
                values: [nuevaFila],
            },
        });

        console.log("Fila agregada con éxito.");

        // Devolver el nuevo chófer (con el ID generado)
        const nuevoChofer = {
            id_chofer: nuevoId,
            nombre_completo,
            telefono,
            deuda_actual: Number(deuda_actual) || 0,
            estado,
        };
        return res.status(201).json({ chofer: nuevoChofer }); // 201 Created

    } catch (error) {
        console.error('Error en POST /api/choferes:', error.message, error.stack);
        // Devolver un error genérico o más específico si es posible
        const status = error.message.includes('Configuración') ? 500 : 400;
        res.status(status).json({ error: 'Error al agregar el chófer.', details: error.message });
    }
};
