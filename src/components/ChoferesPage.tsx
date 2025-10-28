// src/pages/ChoferesPage.tsx
import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Asume que tienes estos componentes Shadcn/UI
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import ActionModal from '@/components/ui/ActionModal'; // Importamos el modal de acción

// Definimos un tipo para los datos que esperamos de la API
interface Chofer {
  id_chofer: string; // Nota: la API devuelve snake_case
  nombre_completo: string;
  telefono?: string; // Opcional
  vehiculo_asignado_id?: string; // Opcional
  deuda_actual: string | number; // Puede llegar como string o número
  estado: string;
}

// Tipo de estado para el modal de acción
interface ModalState {
    isOpen: boolean;
    type: 'add' | 'edit' | 'delete';
    chofer: Chofer | null;
}

export function ChoferesPage() {
  // Estado para guardar los chóferes, el estado de carga y errores
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false); // Estado para recargar
  
  // Estado para controlar el Modal
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    type: 'add',
    chofer: null,
  });

  // --- Lógica de Comunicación con API ---
  const fetchChoferes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/getChoferes');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); 
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
      }
      const data = await response.json();

      if (Array.isArray(data.choferes)) {
        setChoferes(data.choferes);
      } else {
        console.error("La respuesta de la API no contiene un array 'choferes':", data);
        throw new Error("Formato de respuesta inesperado de la API.");
      }
    } catch (e) {
      console.error("Error al obtener chóferes:", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setIsRefreshing(false); // Detener el indicador de recarga
    }
  };

  // Carga inicial
  useEffect(() => {
    fetchChoferes();
  }, []); 

  // Función de recarga para usar después de una acción (Ej. Añadir)
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchChoferes();
  };


  // --- Handlers de Botones (Lógica de Apertura de Modal) ---
  const handleAdd = () => {
    // Abrir modal para agregar (chofer: null)
    setModalState({ isOpen: true, type: 'add', chofer: null });
  };

  const handleEdit = (chofer: Chofer) => {
    // Abrir modal para editar (pasa los datos del chofer)
    setModalState({ isOpen: true, type: 'edit', chofer });
  };

  const handleDelete = (chofer: Chofer) => {
    // Abrir modal para eliminar (pasa los datos del chofer)
    setModalState({ isOpen: true, type: 'delete', chofer });
  };
  
  const handleCloseModal = () => {
    // Cerrar y resetear el estado del modal
    setModalState({ isOpen: false, type: 'add', chofer: null });
  };

  // --- Handlers de Acción (Lógica del Botón Confirmar) ---
  const confirmAction = async () => {
    if (modalState.type !== 'add' && !modalState.chofer) return;
    
    // 1. Cerramos el modal
    handleCloseModal();
    // 2. Activamos el spinner de recarga (para feedback visual)
    setIsRefreshing(true); 

    try {
      let apiEndpoint = '';
      let method = '';
      let bodyData = {};

      switch (modalState.type) {
        case 'add':
          // Lógica de Añadir (Normalmente usaría datos de un formulario)
          console.log("Simulando: Creación de nuevo chófer");
          apiEndpoint = '/api/choferes'; // Ejemplo de endpoint
          method = 'POST';
          // bodyData = { /* Datos del formulario */ };
          break;
        case 'edit':
          // Lógica de Edición
          console.log(`Simulando: Edición del chófer ID: ${modalState.chofer!.id_chofer}`);
          apiEndpoint = `/api/choferes/${modalState.chofer!.id_chofer}`;
          method = 'PUT';
          // bodyData = { /* Datos actualizados del formulario */ };
          break;
        case 'delete':
          // Lógica de Eliminación
          console.log(`Simulando: Eliminación del chófer ID: ${modalState.chofer!.id_chofer}`);
          apiEndpoint = `/api/choferes/${modalState.chofer!.id_chofer}`;
          method = 'DELETE';
          break;
      }

      // 🚨 NOTA: Aquí se haría la llamada real al backend (ej: fetch(apiEndpoint, { method, body: JSON.stringify(bodyData) }))

      // 3. Recargamos los datos desde el servidor
      await fetchChoferes();
      
    } catch (e) {
      console.error("Error en la acción:", e);
      setError("Error al ejecutar la acción. Por favor, intente de nuevo.");
      setIsRefreshing(false);
    }
  };


  // --- Renderizado de Contenido de la Tabla ---
  let tableContent;
  if (loading || isRefreshing) {
    tableContent = (
      <TableRow>
        <TableCell colSpan={5} className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin inline-block mr-2 text-blue-500" />
          Cargando chóferes...
        </TableCell>
      </TableRow>
    );
  } else if (error) {
    tableContent = (
      <TableRow>
        <TableCell colSpan={5} className="text-center text-red-600 py-8">
          <strong>Error al cargar:</strong> {error}
        </TableCell>
      </TableRow>
    );
  } else if (choferes.length === 0) {
    tableContent = (
      <TableRow>
        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
          No hay chóferes registrados.
        </TableCell>
      </TableRow>
    );
  } else {
    // Si hay datos, mapeamos sobre ellos
    tableContent = choferes.map((chofer) => {
      // Convertimos deuda a número y manejamos errores
      const deudaNum = parseFloat(String(chofer.deuda_actual)) || 0;
      // Convertimos estado a minúsculas para comparar de forma segura
      const estadoLower = String(chofer.estado || '').toLowerCase();

      return (
        <TableRow key={chofer.id_chofer}>
          <TableCell>{chofer.nombre_completo || '-'}</TableCell>
          <TableCell className="text-right">
            <span
              className={
                deudaNum > 0
                  ? 'text-red-600 font-semibold' // Más énfasis
                  : deudaNum < 0
                  ? 'text-green-600 font-semibold'
                  : 'text-gray-900'
              }
            >
              ${deudaNum.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </TableCell>
          <TableCell>
            {deudaNum > 0 ? (
              <div className="flex items-center space-x-1 text-red-600"> {/* Menos espacio */}
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs">Debe</span> {/* Texto más pequeño */}
              </div>
            ) : deudaNum < 0 ? (
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs">A favor</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-gray-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs">Al día</span>
              </div>
            )}
          </TableCell>
          <TableCell>
            <Badge
              className={
                estadoLower === 'activo'
                  ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300' // Estilo más claro
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300' // Estilo inactivo
              }
            >
              {/* Capitalizamos el estado */}
              {estadoLower.charAt(0).toUpperCase() + estadoLower.slice(1) || 'N/A'}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end space-x-1"> {/* Menos espacio */}
              {/* Botón Editar ACTIVO */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => handleEdit(chofer)} 
              >
                <Edit className="w-4 h-4 text-blue-600" />
              </Button>
              {/* Botón Eliminar ACTIVO */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => handleDelete(chofer)}
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
    });
  }


  // --- JSX Final ---
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6"> 
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0"> 
            <div className="flex items-center space-x-2"> 
              <Users className="w-5 h-5 text-blue-600" /> 
              <CardTitle className="text-xl">Gestión de Chóferes</CardTitle> 
            </div>
            {/* Botón Agregar ACTIVO */}
            <div className="flex space-x-2">
              <Button 
                className={`bg-blue-600 hover:bg-blue-700 text-sm h-9 ${isRefreshing ? 'opacity-70 cursor-not-allowed' : ''}`}
                onClick={handleAdd} 
                disabled={isRefreshing || loading}
              > 
                <Plus className="w-4 h-4 mr-1" />
                Agregar Chofer
              </Button>
              {/* Botón de Recarga ACTIVO */}
              <Button
                  variant="outline"
                  size="sm"
                  className={`h-9 w-9 p-0 ${isRefreshing ? 'animate-spin' : ''}`}
                  onClick={handleRefresh}
                  disabled={isRefreshing || loading}
                  title="Recargar datos"
              >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'opacity-0' : ''}`} /> 
                  {/* El spinner ya está en el contenedor de loading, pero RefreshCw es más claro */}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto"> 
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead className="text-right">Deuda Actual</TableHead>
                  <TableHead>Estado Deuda</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableContent}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

    {/* MODAL DE ACCIÓN GLOBAL */}
    <ActionModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        onConfirm={confirmAction}
        type={modalState.type}
        title={
            modalState.type === 'add' 
                ? 'Agregar Nuevo Chofer' 
                : modalState.type === 'edit' 
                ? `Editar Chofer: ${modalState.chofer?.nombre_completo}`
                : 'Confirmar Eliminación'
        }
        description={
            modalState.type === 'delete' 
                ? `¿Está seguro de que desea eliminar al chófer ${modalState.chofer?.nombre_completo}? Esta acción es irreversible.`
                : modalState.type === 'add' 
                ? 'Ingrese los detalles del nuevo chófer.'
                : 'Modifique los campos necesarios para el chófer.'
        }
        confirmLabel={
            modalState.type === 'delete' 
                ? 'Eliminar' 
                : modalState.type === 'add' 
                ? 'Guardar Chofer' 
                : 'Guardar Cambios'
        }
    >
        {/* Aquí iría el formulario de entrada o edición (simulado por ahora) */}
        {modalState.type !== 'delete' && (
            <div className="text-sm text-gray-500">
                [Formulario de Creación/Edición aquí]
                <p className="mt-2 p-3 bg-gray-50 border rounded-md">
                    Chofer ID: {modalState.chofer?.id_chofer || 'Nuevo'}
                </p>
            </div>
        )}
    </ActionModal>
    </div>
  );
}
