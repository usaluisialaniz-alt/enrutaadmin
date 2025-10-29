// api/choferes/[id].js
const { google } = require('googleapis');
const { auth } = require('google-auth-library');

// --- Autenticación (Necesita permisos de ESCRITURA) ---
async function getAuthenticatedClient() {
    // ... (igual que en el POST, con scope de escritura) ...
    const credentials = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    if (!credentials.client_email || !credentials.private_key) {
        throw new Error('Configuración: Faltan credenciales de Google.');
    }
    const clientAuth = auth.fromJSON(credentials);
    clientAuth.scopes = ['https://www.googleapis.com/auth/spreadsheets'];
    return clientAuth;
}

// --- Función para encontrar el número de fila por ID ---
async function findRowById(sheets, spreadsheetId, sheetName, idColumnIndex, targetId) {
    const range = `${sheetName}!A:A`; // Asumimos que el ID está en la columna A
    console.log(`Buscando ID '${targetId}' en ${range}`);
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
    });
    const rows = response.data.values;
    if (rows) {
        // +1 porque los índices de Sheets empiezan en 1
        const rowIndex = rows.findIndex(row => row[idColumnIndex] === targetId) + 1;
        console.log(`ID encontrado en fila: ${rowIndex > 0 ? rowIndex : 'No encontrado'}`);
        return rowIndex > 0 ? rowIndex : -1;
    }
    return -1;
}

// --- Handler de la API ---
module.exports = async (req, res) => {
    const { id } = req.query; // Obtiene el ID del chófer de la URL
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = 'Choferes'; // Nombre de la hoja
    const idColumnIndex = 0; // Índice de la columna 'id_chofer' (A=0)

    console.log(`Recibida solicitud ${req.method} para chofer ID: ${id}`);

    if (!id) {
        return res.status(400).json({ error: 'Falta el ID del chófer en la URL.' });
    }

    try {
        const clientAuth = await getAuthenticatedClient();
        const sheets = google.sheets({ version: 'v4', auth: clientAuth });

        // Encontrar la fila correspondiente al ID
        const rowIndex = await findRowById(sheets, spreadsheetId, sheetName, idColumnIndex, id);

        if (rowIndex === -1) {
            console.log(`Chofer con ID ${id} no encontrado.`);
            return res.status(404).json({ error: `Chofer con ID ${id} no encontrado.` });
        }

        // --- Lógica según el método HTTP ---
        if (req.method === 'PUT') {
            // --- Editar Chófer ---
            const { nombre_completo, telefono, deuda_actual, estado } = req.body;

            // Validación básica
            if (!nombre_completo || !estado) {
                return res.status(400).json({ error: 'Faltan campos requeridos para editar (nombre_completo, estado).' });
            }
             if (!['activo', 'inactivo'].includes(estado)) {
                return res.status(400).json({ error: 'El estado debe ser "activo" o "inactivo".' });
            }

            // Preparar los datos a actualizar (Asegúrate que el orden coincida)
            // Col A: ID (no se actualiza), B: Nombre, C: Tel, D: Vehículo (no se toca), E: Deuda, F: Estado
            const updatedRowData = [
                id, // Mantenemos el ID
                nombre_completo,
                telefono || '',
                null, // Dejamos la columna D intacta (o lee el valor actual si es necesario)
                Number(deuda_actual) || 0,
                estado,
            ];

            // Rango de la fila a actualizar (ej: 'Choferes!A5:F5')
            // Ajusta F si tienes más columnas
            const updateRange = `${sheetName}!A${rowIndex}:F${rowIndex}`;
            console.log(`Actualizando fila ${rowIndex} en rango ${updateRange} con datos:`, updatedRowData);

            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: updateRange,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [updatedRowData],
                },
            });

            console.log(`Chofer ID ${id} actualizado con éxito.`);
            // Devolver el chófer actualizado
            return res.status(200).json({ chofer: { id_chofer: id, ...req.body } });

        } else if (req.method === 'DELETE') {
            // --- Eliminar Chófer ---
            // ¡CUIDADO! Eliminar filas puede ser complejo si tienes fórmulas o referencias.
            // La forma más segura es "marcar como eliminado" (ej. cambiar estado a 'eliminado')
            // o realmente eliminar la fila. Aquí eliminaremos la fila.

            console.log(`Solicitando eliminación de fila ${rowIndex}`);

            // Google Sheets API usa "requests" para eliminar filas
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                resource: {
                    requests: [
                        {
                            deleteDimension: {
                                range: {
                                    sheetId: 1792617564, // Asume que 'Choferes' es la primera hoja (sheetId 0) - ¡Verifica esto!
                                    dimension: 'ROWS',
                                    // Los índices son 0-based para la API batchUpdate
                                    startIndex: rowIndex - 1,
                                    endIndex: rowIndex,
                                },
                            },
                        },
                    ],
                },
            });

            console.log(`Fila ${rowIndex} (Chofer ID ${id}) eliminada con éxito.`);
            return res.status(204).send(); // 204 No Content (éxito sin cuerpo)

        } else {
            // Método no soportado por este endpoint
            res.setHeader('Allow', ['PUT', 'DELETE']);
            return res.status(405).json({ error: `Método ${req.method} no permitido en esta ruta.` });
        }

    } catch (error) {
        console.error(`Error en ${req.method} /api/choferes/${id}:`, error.message, error.stack);
        const status = error.message.includes('Configuración') ? 500 : (error.message.includes('no encontrado') ? 404 : 400);
        res.status(status).json({ error: `Error al ${req.method === 'PUT' ? 'editar' : 'eliminar'} el chófer.`, details: error.message });
    }
};
