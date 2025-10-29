// api/vehiculos/[id].js
const { google } = require('googleapis');
const { auth } = require('google-auth-library');

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
    clientAuth.scopes = ['https://www.googleapis.com/auth/spreadsheets']; // Asegura scope de escritura
    return clientAuth;
}

// --- Función para encontrar el número de fila por ID ---
async function findRowById(sheets, spreadsheetId, sheetName, idColumnIndex, targetId) {
    const range = `${sheetName}!A:A`;
    console.log(`[findRowById] Buscando ID '${targetId}' en ${range}`);
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = response.data.values;
    if (rows) {
        const rowIndex = rows.findIndex(row => row && row[idColumnIndex] === targetId) + 1;
        console.log(`[findRowById] ID encontrado en fila: ${rowIndex > 0 ? rowIndex : 'No encontrado'}`);
        return rowIndex > 0 ? rowIndex : -1;
    }
    console.log(`[findRowById] No se encontraron filas en ${range}`);
    return -1;
}

// --- Función para obtener el sheetId por nombre ---
async function getSheetIdByName(sheets, spreadsheetId, sheetName) {
    console.log(`[getSheetIdByName] Buscando sheetId para "${sheetName}"`);
    const response = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets(properties(sheetId,title))' });
    const sheet = response.data.sheets.find(s => s.properties.title === sheetName);
    if (sheet && sheet.properties.sheetId != null) {
        console.log(`[getSheetIdByName] SheetId encontrado: ${sheet.properties.sheetId}`);
        return sheet.properties.sheetId;
    } else {
        throw new Error(`Configuración: No se encontró la hoja "${sheetName}" o su ID.`);
    }
}

// --- Handler de la API ---
module.exports = async (req, res) => {
    const { id } = req.query;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = 'Vehiculos'; // ¡Ajusta si es necesario!
    const idColumnIndex = 0; // Columna A
    const totalColumns = 7; // A=ID, B=Nombre, C=Patente, D=Chofer, E=TN, F=TE, G=Estado
    const choferColumnIndex = 3; // Columna D

    console.log(`[Handler] Recibida solicitud ${req.method} para vehiculo ID: ${id}`);
    if (!id) return res.status(400).json({ error: 'Falta ID del vehículo.' });

    try {
        const clientAuth = await getAuthenticatedClient();
        const sheets = google.sheets({ version: 'v4', auth: clientAuth });

        const rowIndex = await findRowById(sheets, spreadsheetId, sheetName, idColumnIndex, id);
        if (rowIndex === -1) return res.status(404).json({ error: `Vehículo con ID ${id} no encontrado.` });

        // --- Lógica según el método HTTP ---
        if (req.method === 'PUT') {
            // ✨ LOG 1: VER DATOS RECIBIDOS DEL FORMULARIO ✨
            console.log('[PUT] Datos recibidos en req.body:', req.body);

            const { nombre_visible, patente, tarifa_normal, tarifa_especial, estado } = req.body;
            if (!nombre_visible || !patente || !estado || !['activo', 'mantenimiento', 'inactivo'].includes(estado)) {
                console.error('[PUT] Error: Faltan campos requeridos o estado inválido en req.body.', req.body);
                return res.status(400).json({ error: 'Faltan campos requeridos o estado inválido.' });
            }

            // LEER LA FILA ACTUAL
            const readRange = `${sheetName}!A${rowIndex}:${String.fromCharCode(64 + totalColumns)}${rowIndex}`;
            console.log(`[PUT] Leyendo datos actuales de la fila ${rowIndex} en rango ${readRange}`);
            const currentRowResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: readRange });
            const currentRowData = currentRowResponse.data.values ? currentRowResponse.data.values[0] : [];

            // ✨ LOG 2: VER DATOS ACTUALES DE LA FILA ✨
            console.log(`[PUT] Datos actuales leídos de la fila ${rowIndex}:`, currentRowData);

            const currentChoferAsignado = currentRowData[choferColumnIndex] || '';
            console.log(`[PUT] Valor actual de Chofer Asignado (Col D): "${currentChoferAsignado}"`);

            // PREPARAR DATOS ACTUALIZADOS
            const updatedRowData = [
                id, nombre_visible, patente.toUpperCase(),
                currentChoferAsignado, // Conserva chofer
                Number(tarifa_normal) || 0, Number(tarifa_especial) || 0, estado
            ];
            while (updatedRowData.length < totalColumns) updatedRowData.push('');
            if (updatedRowData.length > totalColumns) updatedRowData.length = totalColumns;

            // ✨ LOG 3: VER DATOS PREPARADOS PARA ESCRIBIR ✨
            console.log(`[PUT] Datos preparados para actualizar fila ${rowIndex}:`, updatedRowData);

            const updateRange = readRange; // Usar el mismo rango de lectura
            console.log(`[PUT] Ejecutando actualización en rango ${updateRange}`);

            // EJECUTAR ACTUALIZACIÓN
            const updateResponse = await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: updateRange,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [updatedRowData] },
            });

             // ✨ LOG 4: VER RESPUESTA DE LA ACTUALIZACIÓN ✨
            console.log('[PUT] Respuesta de sheets.spreadsheets.values.update:', updateResponse.data);

            console.log(`[PUT] Vehículo ID ${id} actualizado con éxito.`);
            return res.status(200).json({ vehiculo: { id_vehiculo: id, ...req.body } });

        } else if (req.method === 'DELETE') {
            // ... (Lógica DELETE sin cambios, asumimos que funciona) ...
             console.log(`[DELETE] Solicitando eliminación de fila ${rowIndex}`);
             const targetSheetId = await getSheetIdByName(sheets, spreadsheetId, sheetName);
             await sheets.spreadsheets.batchUpdate({ spreadsheetId, resource: { requests: [{ deleteDimension: { range: { sheetId: targetSheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex }}}]}});
             console.log(`[DELETE] Fila ${rowIndex} (Vehículo ID ${id}) eliminada.`);
             return res.status(204).send();

        } else {
            res.setHeader('Allow', ['PUT', 'DELETE']);
            return res.status(405).json({ error: `Método ${req.method} no permitido.` });
        }

    } catch (error) {
        console.error(`[Handler Error] Error en ${req.method} /api/vehiculos/${id}:`, error.message, error.stack);
        // Devolver detalles del error de Google si están disponibles
        const details = error.response?.data?.error?.message || error.message;
        let status = 500;
        if (details.includes('PERMISSION_DENIED')) status = 403; // Error de permisos
        else if (error.message.includes('Configuración')) status = 500;
        else if (error.message.includes('no encontrado')) status = 404;
        else if (error.code === 400 || details.includes('INVALID_ARGUMENT') || details.includes('Unable to parse range')) status = 400; // Error de formato/rango
        res.status(status).json({ error: `Error al procesar la solicitud del vehículo.`, details });
    }
};

