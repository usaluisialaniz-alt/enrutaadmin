const { google } = require('googleapis');
const { auth } = require('google-auth-library');

// --- Autenticación (Necesita permisos de ESCRITURA) ---
async function getAuthenticatedClient() {
// ... (código existente sin cambios) ...
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

// --- Función para encontrar el número de fila por ID (para Vehiculos Y Choferes) ---
async function findRowById(sheets, spreadsheetId, sheetName, idColumnIndex, targetId) {
// ... (código existente sin cambios) ...
    const range = `${sheetName}!A:A`; // Asume que el ID siempre está en la Columna A
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

// --- CAMBIO 1 (EXISTENTE): Nueva función para buscar el NOMBRE de un chofer por su ID ---
/**
 * Busca el nombre de un chofer en la hoja "Choferes".
 * Asume: Columna A = ID del Chofer, Columna B = Nombre Completo.
 */
async function findChoferNameById(sheets, spreadsheetId, sheetName, idColumnIndex, nameColumnIndex, targetId) {
// ... (código existente sin cambios) ...
    // Rango de búsqueda, ej: "Choferes!A:B"
    const range = `${sheetName}!${String.fromCharCode(65 + idColumnIndex)}:${String.fromCharCode(65 + nameColumnIndex)}`;
    console.log(`[findChoferNameById] Buscando nombre para chofer ID '${targetId}' en ${range}`);
    
    try {
        const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
        const rows = response.data.values;
        if (rows) {
            // Busca la fila donde la columna de ID (índice 0 en el array de la fila) coincide
            const foundRow = rows.find(row => row && row[0] === targetId); 
            if (foundRow) {
                // Devuelve el nombre (índice 1 en el array de la fila)
                const name = foundRow[nameColumnIndex - idColumnIndex];
                console.log(`[findChoferNameById] Encontrado: ${name}`);
                return name;
            }
        }
        console.log(`[findChoferNameById] No se encontró el nombre para el ID '${targetId}'.`);
        return null;
    } catch (e) {
        console.error(`[findChoferNameById] Error al leer la hoja de choferes: ${e.message}`);
        throw new Error(`Error al buscar nombre de chofer: ${e.message}`);
    }
}

// --- CAMBIO 2 (NUEVO): Función para buscar el ID de un chofer por su NOMBRE ---
/**
 * Busca el ID de un chofer en la hoja "Choferes" usando su nombre.
 * Asume: Columna A = ID del Chofer, Columna B = Nombre Completo.
 */
async function findChoferIdByName(sheets, spreadsheetId, sheetName, idColumnIndex, nameColumnIndex, targetName) {
    const range = `${sheetName}!${String.fromCharCode(65 + idColumnIndex)}:${String.fromCharCode(65 + nameColumnIndex)}`;
    console.log(`[findChoferIdByName] Buscando ID para el nombre '${targetName}' en ${range}`);
    
    try {
        const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
        const rows = response.data.values;
        if (rows) {
            // Busca la fila donde la columna de Nombre (índice 1) coincide
            const foundRow = rows.find(row => row && row[nameColumnIndex - idColumnIndex] === targetName);
            if (foundRow) {
                // Devuelve el ID (índice 0)
                const id = foundRow[0];
                console.log(`[findChoferIdByName] Encontrado: ${id}`);
                return id;
            }
        }
        console.log(`[findChoferIdByName] No se encontró el ID para el nombre '${targetName}'.`);
        return null;
    } catch (e) {
        console.error(`[findChoferIdByName] Error al leer la hoja de choferes: ${e.message}`);
        throw new Error(`Error al buscar ID de chofer: ${e.message}`);
    }
}

// --- CAMBIO 3 (NUEVO): Función de ayuda para actualizar una celda específica ---
/**
 * Actualiza el valor de una única celda en Google Sheets.
 */
async function updateCell(sheets, spreadsheetId, sheetName, rowIndex, colIndex, value) {
    const range = `${sheetName}!${String.fromCharCode(65 + colIndex)}${rowIndex}`;
    console.log(`[updateCell] Escribiendo '${value}' en la celda ${range}`);
    try {
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[value || ""]] }, // [[...]] para una sola celda
        });
        console.log(`[updateCell] Celda ${range} actualizada.`);
    } catch (e) {
        console.error(`[updateCell] Error actualizando celda ${range}: ${e.message}`);
        throw new Error(`Error al actualizar la celda del chofer: ${e.message}`);
    }
}


// --- FIN CAMBIOS NUEVOS ---

// --- Función para obtener el sheetId por nombre (para DELETE) ---
async function getSheetIdByName(sheets, spreadsheetId, sheetName) {
// ... (código existente sin cambios) ...
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
    const { id } = req.query; // ID del Vehículo a modificar
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // --- Configuración Hoja "Vehiculos" ---
    const vehiculosSheetName = 'Vehiculos';
    const vehiculoIdColumnIndex = 0; // Columna A (ID Vehiculo)
    const choferNameColumnIndex = 3; // Columna D (Nombre Chofer)
    const totalVehiculoColumns = 7; // A(ID), B(Nombre), C(Patente), D(Chofer), E(TN), F(TE), G(Estado)

    // --- Configuración Hoja "Choferes" ---
    const choferesSheetName = 'Choferes';
    const choferIdColumnIndex = 0; // Columna A (ID Chofer)
    const choferFullNameColumnIndex = 1; // Columna B (Nombre Completo)
    // --- CAMBIO 4 (NUEVO): Columna de asignación en la hoja "Choferes" ---
    const choferVehicleColumnIndex = 3; // Columna D (Vehículo Asignado ID)

    console.log(`[Handler] Recibida solicitud ${req.method} para vehiculo ID: ${id}`);
    if (!id) return res.status(400).json({ error: 'Falta ID del vehículo.' });

    try {
        const clientAuth = await getAuthenticatedClient();
        const sheets = google.sheets({ version: 'v4', auth: clientAuth });

        // 1. Encontrar la fila del vehículo a modificar
        const vehiculoRowIndex = await findRowById(sheets, spreadsheetId, vehiculosSheetName, vehiculoIdColumnIndex, id);
        if (vehiculoRowIndex === -1) return res.status(404).json({ error: `Vehículo con ID ${id} no encontrado.` });

        // --- Lógica según el método HTTP ---
        if (req.method === 'PUT') {
            
            console.log('[PUT] Datos recibidos en req.body:', req.body);
            
            // --- CAMBIO 5 (MODIFICADO): Renombrar para claridad ---
            const { nombre_visible, patente, tarifa_normal, tarifa_especial, estado, choferId: newChoferId } = req.body;
            
            if (!nombre_visible || !patente || !estado) {
                console.error('[PUT] Error: Faltan campos requeridos.', req.body);
                return res.status(400).json({ error: 'Faltan campos requeridos (nombre, patente, estado).' });
            }

            // --- CAMBIO 6 (NUEVO): Lógica de Sincronización de Choferes ---
            
            // 6.1. LEER el nombre del chofer actual de la hoja 'Vehiculos'
            const readRange = `${vehiculosSheetName}!${String.fromCharCode(65 + choferNameColumnIndex)}${vehiculoRowIndex}`;
            console.log(`[PUT] Leyendo nombre de chofer actual de ${readRange}`);
            const currentRowResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: readRange });
            const oldChoferName = currentRowResponse.data.values ? currentRowResponse.data.values[0][0] : null;
            console.log(`[PUT] Nombre de chofer actual: "${oldChoferName || 'N/A'}"`);

            // 6.2. BUSCAR el ID de ese chofer
            let oldChoferId = null;
            if (oldChoferName) {
                oldChoferId = await findChoferIdByName(
                    sheets, spreadsheetId, choferesSheetName, 
                    choferIdColumnIndex, choferFullNameColumnIndex, oldChoferName
                );
            }
            console.log(`[PUT] oldChoferId: "${oldChoferId || 'N/A'}", newChoferId: "${newChoferId || 'N/A'}"`);

            // 6.3. COMPARAR y ACTUALIZAR la hoja 'Choferes' si han cambiado
            if (oldChoferId !== newChoferId) {
                console.log("[PUT] El chofer ha cambiado. Actualizando hoja 'Choferes'...");

                // A. Limpiar la asignación del chofer ANTIGUO (si existía)
                if (oldChoferId) {
                    const oldChoferRowIndex = await findRowById(sheets, spreadsheetId, choferesSheetName, choferIdColumnIndex, oldChoferId);
                    if (oldChoferRowIndex > 0) {
                        await updateCell(sheets, spreadsheetId, choferesSheetName, 
                            oldChoferRowIndex, choferVehicleColumnIndex, "" // Escribir celda vacía
                        );
                    } else {
                        console.warn(`[PUT] No se encontró la fila del chofer anterior (ID: ${oldChoferId}) para limpiar la asignación.`);
                    }
                }

                // B. Establecer la asignación del chofer NUEVO (si existe)
                if (newChoferId) {
                    const newChoferRowIndex = await findRowById(sheets, spreadsheetId, choferesSheetName, choferIdColumnIndex, newChoferId);
                    if (newChoferRowIndex > 0) {
                        await updateCell(sheets, spreadsheetId, choferesSheetName, 
                            newChoferRowIndex, choferVehicleColumnIndex, id // Escribir el ID del Vehículo
                        );
                    } else {
                        // Error grave: el frontend envió un ID que no existe en la hoja Choferes
                        console.error(`[PUT] Error: El newChoferId "${newChoferId}" no se encontró en la hoja 'Choferes'.`);
                        return res.status(400).json({ error: `El ID de chofer ${newChoferId} no es válido.` });
                    }
                }
            } else {
                console.log("[PUT] El chofer no ha cambiado. No se requieren actualizaciones en la hoja 'Choferes'.");
            }
            // --- FIN CAMBIO 6 ---

            // --- CAMBIO 7 (MODIFICADO): Determinar el NOMBRE del chofer para escribir en 'Vehiculos' ---
            let newChoferNameParaEscribir = ""; // Por defecto "Sin Asignar"
            if (newChoferId) {
                // Buscar el nombre correspondiente al newChoferId
                const foundName = await findChoferNameById(
                    sheets, spreadsheetId, choferesSheetName, 
                    choferIdColumnIndex, choferFullNameColumnIndex, newChoferId
                );
                // Si lo encontramos (deberíamos, ya que lo validamos en el paso 6.3.B), lo usamos.
                if (foundName) {
                    newChoferNameParaEscribir = foundName;
                }
                // Si no lo encontramos, newChoferNameParaEscribir se queda como ""
            }
            
            // --- CAMBIO 8: Preparar la fila de 'Vehiculos' con el nombre del NUEVO chofer ---
            const updatedRowData = [
                id, // Col A
                nombre_visible, // Col B
                patente.toUpperCase(), // Col C
                newChoferNameParaEscribir, // Col D (El nombre encontrado)
                Number(tarifa_normal) || 0, // Col E
                Number(tarifa_especial) || 0, // Col F
                estado // Col G
            ];
            
            while (updatedRowData.length < totalVehiculoColumns) updatedRowData.push('');
            if (updatedRowData.length > totalVehiculoColumns) updatedRowData.length = totalVehiculoColumns;

            console.log(`[PUT] Datos preparados para actualizar fila ${vehiculoRowIndex} de 'Vehiculos':`, updatedRowData);

            const updateRange = `${vehiculosSheetName}!A${vehiculoRowIndex}:${String.fromCharCode(64 + totalVehiculoColumns)}${vehiculoRowIndex}`;
            console.log(`[PUT] Ejecutando actualización en 'Vehiculos' en rango ${updateRange}`);

            // EJECUTAR ACTUALIZACIÓN de 'Vehiculos'
            const updateResponse = await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: updateRange,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [updatedRowData] },
            });

            console.log('[PUT] Respuesta de sheets.spreadsheets.values.update:', updateResponse.data);
            console.log(`[PUT] Vehículo ID ${id} actualizado con éxito.`);
            
            return res.status(200).json({ vehiculo: { id_vehiculo: id, ...req.body } });

        } else if (req.method === 'DELETE') {
            // --- Lógica DELETE (¡Importante!) ---
            // También deberíamos limpiar la asignación del chofer si el vehículo se elimina.

            // D.1. Leer el nombre del chofer actual
            const readRange = `${vehiculosSheetName}!${String.fromCharCode(65 + choferNameColumnIndex)}${vehiculoRowIndex}`;
            const currentRowResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: readRange });
            const oldChoferName = currentRowResponse.data.values ? currentRowResponse.data.values[0][0] : null;

            // D.2. Buscar el ID de ese chofer
            if (oldChoferName) {
                const oldChoferId = await findChoferIdByName(
                    sheets, spreadsheetId, choferesSheetName, 
                    choferIdColumnIndex, choferFullNameColumnIndex, oldChoferName
                );
                // D.3. Limpiar la asignación de ese chofer
                if (oldChoferId) {
                    const oldChoferRowIndex = await findRowById(sheets, spreadsheetId, choferesSheetName, choferIdColumnIndex, oldChoferId);
                    if (oldChoferRowIndex > 0) {
                        console.log(`[DELETE] Limpiando asignación del chofer ${oldChoferId} antes de eliminar el vehículo.`);
                        await updateCell(sheets, spreadsheetId, choferesSheetName, 
                            oldChoferRowIndex, choferVehicleColumnIndex, "" // Escribir celda vacía
                        );
                    }
                }
            }
            
            // D.4. Eliminar la fila del vehículo
            console.log(`[DELETE] Solicitando eliminación de fila ${vehiculoRowIndex}`);
            const targetSheetId = await getSheetIdByName(sheets, spreadsheetId, vehiculosSheetName);
            await sheets.spreadsheets.batchUpdate({ spreadsheetId, resource: { requests: [{ deleteDimension: { range: { sheetId: targetSheetId, dimension: 'ROWS', startIndex: vehiculoRowIndex - 1, endIndex: vehiculoRowIndex }}}]}});
            console.log(`[DELETE] Fila ${vehiculoRowIndex} (Vehículo ID ${id}) eliminada.`);
            return res.status(204).send();

        } else {
            res.setHeader('Allow', ['PUT', 'DELETE']);
            return res.status(405).json({ error: `Método ${req.method} no permitido.` });
        }

    } catch (error) {
        console.error(`[Handler Error] Error en ${req.method} /api/vehiculos/${id}:`, error.message, error.stack);
        const details = error.response?.data?.error?.message || error.message;
        let status = 500;
        if (details.includes('PERMISSION_DENIED')) status = 403;
        else if (error.message.includes('Configuración')) status = 500;
        else if (error.message.includes('no encontrado')) status = 404;
        else if (error.code === 400 || details.includes('INVALID_ARGUMENT')) status = 400;
        res.status(status).json({ error: `Error al procesar la solicitud del vehículo.`, details });
    }
};

