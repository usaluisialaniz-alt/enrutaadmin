// src/pages/ChoferesPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Users, Plus, Edit, Trash2, AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import ActionModal from '@/components/ui/ActionModal'; // Corregido: Importar desde ui
import ChoferForm, { ChoferFormData, ChoferFormHandle } from '@/components/forms/ChoferForm'; // Corregido: Importar desde components

// Definimos un tipo para los datos que esperamos de la API
interface Chofer {
  id_chofer: string;
  nombre_completo: string;
  telefono?: string;
  vehiculo_asignado_id?: string;
  deuda_actual: string | number;
  estado: string;
}

// Tipo de estado para el modal de acción
interface ModalState {
    isOpen: boolean;
    type: 'add' | 'edit' | 'delete';
    chofer: Chofer | null;
}

export function ChoferesPage() {
  // Estados
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    type: 'add',
    chofer: null,
  });

  // Ref ahora usa el tipo ChoferFormHandle
  const formRef = useRef<ChoferFormHandle>(null);


  // --- Lógica de Comunicación con API ---
  const fetchChoferes = async () => {
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
        throw new Error("Formato de respuesta inesperado de la API.");
      }
    } catch (e) {
      console.error("Error al obtener chóferes:", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchChoferes();
  }, []);

  const handleRefresh = () => {
    if (!isRefreshing) {
        setIsRefreshing(true);
        fetchChoferes();
    }
  };


  // --- Handlers de Apertura de Modal ---
  const handleAdd = () => setModalState({ isOpen: true, type: 'add', chofer: null });
  const handleEdit = (chofer: Chofer) => setModalState({ isOpen: true, type: 'edit', chofer });
  const handleDelete = (chofer: Chofer) => setModalState({ isOpen: true, type: 'delete', chofer });
  const handleCloseModal = () => {
      setModalState({ isOpen: false, type: 'add', chofer: null });
      setError(null);
  }


  // --- Handler Principal de Acciones (Add/Edit/Delete) ---
  const handleFormSubmit = async (formData: ChoferFormData) => {
    setIsSubmitting(true);
    setError(null);
    let apiEndpoint = '';
    let method = '';

    const dataToSend = {
      nombre_completo: formData.nombre_completo,
      telefono: formData.telefono || null,
      deuda_actual: Number(formData.deuda_actual) || 0,
      estado: formData.estado,
    };

    try {
      if (modalState.type === 'add') {
        console.log("Enviando (Add):", dataToSend);
        apiEndpoint = '/api/choferes';
        method = 'POST';
      } else if (modalState.type === 'edit' && modalState.chofer) {
        console.log(`Enviando (Edit ID: ${modalState.chofer.id_chofer}):`, dataToSend);
        apiEndpoint = `/api/choferes/${modalState.chofer.id_chofer}`;
        method = 'PUT';
      } else {
        throw new Error("Acción de formulario no válida.");
      }

      const response = await fetch(apiEndpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        let errorMessage = `Error ${method} ${response.status}`;
        try { const errorData = await response.json(); errorMessage = errorData.error || errorMessage; } catch (jsonError) { /* Ignorar */ }
        throw new Error(errorMessage);
      }

      handleCloseModal();
      handleRefresh();

    } catch (e) {
      console.error(`Error al ${modalState.type === 'add' ? 'agregar' : 'editar'} chófer:`, e);
      setError(e instanceof Error ? e.message : "Error al guardar los datos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (modalState.type !== 'delete' || !modalState.chofer) return;
    setIsSubmitting(true);
    setError(null);
    const choferId = modalState.chofer.id_chofer;
    try {
      console.log(`Enviando (Delete ID: ${choferId})`);
      const apiEndpoint = `/api/choferes/${choferId}`;
      const method = 'DELETE';
      const response = await fetch(apiEndpoint, { method });
      if (!response.ok) {
        let errorMessage = `Error ${method} ${response.status}`;
         try { const errorData = await response.json(); errorMessage = errorData.error || errorMessage; } catch (jsonError) { /* Ignorar */ }
        throw new Error(errorMessage);
      }
      handleCloseModal();
      handleRefresh();
    } catch (e) {
      console.error(`Error al eliminar chófer ${choferId}:`, e);
      setError(e instanceof Error ? e.message : "Error al eliminar el chófer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalConfirm = () => {
    setError(null);
    if (modalState.type === 'delete') {
      handleDeleteConfirm();
    } else if (formRef.current) {
        formRef.current.submit();
    } else {
        console.error("Referencia al formulario no encontrada o no expone 'submit'");
        setError("Error interno del formulario. Intente recargar.");
    }
  };


  // --- Renderizado de Contenido de la Tabla ---
  let tableContent;
  if (loading && choferes.length === 0 && !isRefreshing) {
     tableContent = ( <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin inline-block mr-2 text-blue-500" /> Cargando chóferes...</TableCell></TableRow> );
  } else if (error && !modalState.isOpen && choferes.length === 0) {
     tableContent = ( <TableRow><TableCell colSpan={5} className="text-center text-red-600 py-8"><strong>Error al cargar:</strong> {error} <Button variant="link" onClick={handleRefresh}>Reintentar</Button></TableCell></TableRow> );
  } else if (choferes.length === 0 && !loading && !error) {
    tableContent = ( <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No hay chóferes registrados.</TableCell></TableRow> );
  } else {
    tableContent = choferes.map((chofer) => {
      const deudaNum = parseFloat(String(chofer.deuda_actual)) || 0;
      const estadoLower = String(chofer.estado || '').toLowerCase();
       return (
        <TableRow key={chofer.id_chofer}>
          <TableCell>{chofer.nombre_completo || '-'}</TableCell>
          <TableCell className="text-right"><span className={deudaNum > 0 ? 'text-red-600 font-semibold' : deudaNum < 0 ? 'text-green-600 font-semibold' : 'text-gray-900'}>${deudaNum.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></TableCell>
          <TableCell>{deudaNum > 0 ? (<div className="flex items-center space-x-1 text-red-600"><AlertCircle className="w-4 h-4" /><span className="text-xs">Debe</span></div>) : deudaNum < 0 ? (<div className="flex items-center space-x-1 text-green-600"><CheckCircle className="w-4 h-4" /><span className="text-xs">A favor</span></div>) : (<div className="flex items-center space-x-1 text-gray-600"><CheckCircle className="w-4 h-4" /><span className="text-xs">Al día</span></div>)}</TableCell>
          <TableCell><Badge className={estadoLower === 'activo' ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300' : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300'}>{estadoLower.charAt(0).toUpperCase() + estadoLower.slice(1) || 'N/A'}</Badge></TableCell>
          <TableCell className="text-right"><div className="flex justify-end space-x-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(chofer)} disabled={isRefreshing || isSubmitting}><Edit className="w-4 h-4 text-blue-600" /></Button><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(chofer)} disabled={isRefreshing || isSubmitting}><Trash2 className="w-4 h-4 text-red-600" /></Button></div></TableCell>
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
            <div className="flex items-center space-x-2"><Users className="w-5 h-5 text-blue-600" /><CardTitle className="text-xl">Gestión de Chóferes</CardTitle></div>
            <div className="flex space-x-2">
              <Button className={`bg-blue-600 hover:bg-blue-700 text-white text-sm h-9 ${isRefreshing || isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`} onClick={handleAdd} disabled={isRefreshing || loading || isSubmitting}><Plus className="w-4 h-4 mr-1" /> Agregar Chofer</Button>
              <Button variant="outline" size="icon" className={`h-9 w-9 p-0 relative ${isRefreshing ? 'cursor-not-allowed' : ''}`} onClick={handleRefresh} disabled={isRefreshing || loading || isSubmitting} title="Recargar datos">{isRefreshing ? (<Loader2 className="w-4 h-4 animate-spin absolute inset-0 m-auto text-blue-500" />) : (<RefreshCw className="w-4 h-4" />)}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && !modalState.isOpen && choferes.length === 0 && ( <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm"><strong>Error:</strong> {error}</div> )}
          <div className="rounded-md border overflow-x-auto relative"> {/* Añadido relative para el spinner */}
            <Table>
              <TableHeader><TableRow><TableHead>Nombre Completo</TableHead><TableHead className="text-right">Deuda Actual</TableHead><TableHead>Estado Deuda</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>{tableContent}</TableBody>
            </Table>
            {/* Indicador de recarga sutil */}
            {isRefreshing && choferes.length > 0 && ( <div className="absolute bottom-2 right-2 p-1 bg-white rounded-full shadow"><Loader2 className="w-4 h-4 animate-spin text-blue-500" /></div> )}
          </div>
        </CardContent>
      </Card>

    {/* MODAL DE ACCIÓN GLOBAL */}
    <ActionModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        onConfirm={handleModalConfirm}
        isConfirming={isSubmitting}
        type={modalState.type}
        title={ modalState.type === 'add' ? 'Agregar Nuevo Chofer' : modalState.type === 'edit' ? `Editar Chofer: ${modalState.chofer?.nombre_completo || '...'}` : 'Confirmar Eliminación' }
        confirmLabel={ modalState.type === 'delete' ? 'Eliminar' : modalState.type === 'add' ? 'Guardar Chofer' : 'Guardar Cambios' }
    >
        {error && modalState.isOpen && ( <div className="mb-4 p-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs"><strong>Error:</strong> {error}</div> )}
        {modalState.type !== 'delete' ? (
            <ChoferForm
                 ref={formRef}
                 onSubmit={handleFormSubmit}
                 // ✨ CORRECCIÓN AQUÍ ✨
                 defaultValues={modalState.chofer ? {
                     // Caso EDITAR: Mapea los datos del chofer existente
                     id_chofer: modalState.chofer.id_chofer,
                     nombre_completo: modalState.chofer.nombre_completo || '',
                     telefono: modalState.chofer.telefono || '',
                     deuda_actual: parseFloat(String(modalState.chofer.deuda_actual)) || 0,
                     estado: ['activo', 'inactivo'].includes(String(modalState.chofer.estado).toLowerCase())
                             ? String(modalState.chofer.estado).toLowerCase() as 'activo' | 'inactivo'
                             : 'activo',
                 } : {
                     // Caso AGREGAR: Proporciona TODOS los campos esperados
                     id_chofer: undefined, // Opcional, así que undefined está bien
                     nombre_completo: '',  // <-- Asegura que esté presente
                     telefono: '',        // <-- Asegura que esté presente
                     deuda_actual: 0,
                     estado: 'activo'
                 }}
                 isLoading={isSubmitting}
            />
        ) : modalState.chofer && (
             <p className="text-sm text-gray-700">{`¿Está seguro de que desea eliminar al chófer ${modalState.chofer.nombre_completo}? Esta acción es irreversible.`}</p>
        )}
    </ActionModal>
    </div>
  );
}

