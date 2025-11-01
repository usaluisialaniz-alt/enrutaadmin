import React, { useState, useEffect, useRef } from 'react';
import { Car, Plus, Edit, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import ActionModal from '../components/ui/ActionModal';
import VehiculoForm, { VehiculoFormData, VehiculoFormHandle } from '../components/forms/VehiculoForm';


interface Vehiculo {
id_vehiculo: string;
nombre_visible: string;
patente: string;
chofer: string | null;
tarifa_normal: string | number;
tarifa_especial: string | number;
estado: string;
chofer_id:string;
}
interface Chofer {
  id_chofer: string;
  nombre_completo: string;
  telefono?: string;
  vehiculo_asignado_id?: string;
  deuda_actual: string | number;
  estado: string;
}

interface ModalState {
isOpen: boolean;
type: 'add' | 'edit' | 'delete';
vehiculo: Vehiculo | null;
}

export function FlotaPage() {
const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [isRefreshing, setIsRefreshing] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);
const [modalState, setModalState] = useState<ModalState>({ isOpen: false, type: 'add', vehiculo: null });
const formRef = useRef<VehiculoFormHandle>(null);
const [listaChoferes, setListaChoferes] = useState<Chofer[]>([]);

const fetchVehiculos = async () => {
setError(null);
try {
    const response = await fetch('/api/getVehiculos');
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    const data = await response.json();
    setVehiculos(Array.isArray(data.vehiculos) ? data.vehiculos : []);
} catch (e) {
    setError(e instanceof Error ? e.message : String(e));
} finally {
    setLoading(false);
    setIsRefreshing(false);
}
};
const fetchChoferes = async () => {
  try {
    console.log("Fetching choferes...")
    const response = await fetch('/api/getChoferes'); 
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    const data = await response.json();
    setListaChoferes(Array.isArray(data.choferes) ? data.choferes : []);
    console.log('LOG 1 - Datos de choferes recibidos:', data);
  } catch (e) {
    // Opcional: manejar el error de carga de choferes
    console.error("Error al cargar choferes:", e);
  }
};
useEffect(() => {
setLoading(true);
fetchVehiculos();
fetchChoferes();
}, []);

const handleRefresh = () => {
if (!isRefreshing) {
setIsRefreshing(true);
fetchVehiculos();
fetchChoferes();
}
};

const handleAdd = () => setModalState({ isOpen: true, type: 'add', vehiculo: null });
const handleEdit = (vehiculo: Vehiculo) => setModalState({ isOpen: true, type: 'edit', vehiculo });
const handleDelete = (vehiculo: Vehiculo) => setModalState({ isOpen: true, type: 'delete', vehiculo });
const handleCloseModal = () => setModalState({ isOpen: false, type: 'add', vehiculo: null });

// ✅ LLAMADAS REALES A LA API
const handleFormSubmit = async (formData: VehiculoFormData) => {
setIsSubmitting(true);
setError(null);


const dataToSend = {
  nombre_visible: formData.nombre_visible,
  patente: formData.patente.toUpperCase(),
  tarifa_normal: Number(formData.tarifa_normal) || 0,
  tarifa_especial: Number(formData.tarifa_especial) || 0,
  estado: formData.estado,
  choferId: formData.choferId || null
};

try {
  let response;
  if (modalState.type === 'add') {
    response = await fetch('/api/vehiculos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSend),
    });
  } else if (modalState.type === 'edit' && modalState.vehiculo) {
    response = await fetch(`/api/vehiculos/${modalState.vehiculo.id_vehiculo}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSend),
    });
  } else {
    throw new Error('Acción inválida.');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Error HTTP ${response.status}`);
  }

  await fetchVehiculos();
  handleCloseModal();
} catch (e) {
  setError(e instanceof Error ? e.message : 'Error desconocido al guardar.');
} finally {
  setIsSubmitting(false);
}


};

const handleDeleteConfirm = async () => {
if (!modalState.vehiculo) return;
setIsSubmitting(true);
setError(null);
try {
const response = await fetch(`/api/vehiculos/${modalState.vehiculo.id_vehiculo}`, { method: 'DELETE' });
if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
await fetchVehiculos();
handleCloseModal();
} catch (e) {
setError(e instanceof Error ? e.message : 'Error al eliminar vehículo.');
} finally {
setIsSubmitting(false);
}
};

const handleModalConfirm = () => {
if (modalState.type === 'delete') handleDeleteConfirm();
else if (formRef.current) formRef.current.submit();
};

const tableContent =
loading && vehiculos.length === 0 ? ( <TableRow> <TableCell colSpan={7} className="text-center py-8"> <Loader2 className="h-6 w-6 animate-spin inline-block mr-2 text-blue-500" /> Cargando... </TableCell> </TableRow>
) : error && vehiculos.length === 0 ? ( <TableRow> <TableCell colSpan={7} className="text-center text-red-600 py-8"> <strong>Error:</strong> {error} </TableCell> </TableRow>
) : vehiculos.length === 0 ? ( <TableRow> <TableCell colSpan={7} className="text-center py-8 text-gray-500">
No hay vehículos. </TableCell> </TableRow>
) : (
vehiculos.map((v) => ( <TableRow key={v.id_vehiculo}> <TableCell>{v.nombre_visible}</TableCell> <TableCell>{v.patente}</TableCell> <TableCell>{v.chofer}</TableCell> <TableCell className="text-right">${v.tarifa_normal}</TableCell> <TableCell className="text-right">${v.tarifa_especial}</TableCell> <TableCell>
<Badge
className={
v.estado === 'activo'
? 'bg-green-100 text-green-800'
: v.estado === 'mantenimiento'
? 'bg-yellow-100 text-yellow-800'
: 'bg-gray-100 text-gray-800'
}
>
{v.estado} </Badge> </TableCell> <TableCell className="text-right"> <div className="flex justify-end space-x-1">
<Button variant="ghost" size="icon" onClick={() => handleEdit(v)} disabled={isSubmitting}> <Edit className="w-4 h-4 text-blue-600" /> </Button>
<Button variant="ghost" size="icon" onClick={() => handleDelete(v)} disabled={isSubmitting}> <Trash2 className="w-4 h-4 text-red-600" /> </Button> </div> </TableCell> </TableRow>
))
);

return ( <div className="max-w-7xl mx-auto p-4 md:p-6"> <Card> <CardHeader> <div className="flex justify-between items-center"> <div className="flex items-center space-x-2"> <Car className="w-5 h-5 text-blue-600" /> <CardTitle>Gestión de Flota</CardTitle> </div> <div className="flex space-x-2"> <Button className="bg-blue-600 text-white" onClick={handleAdd} disabled={isSubmitting}> <Plus className="w-4 h-4 mr-1" /> Agregar Vehículo </Button>
<Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing || isSubmitting}>
{isRefreshing ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <RefreshCw className="w-4 h-4" />} </Button> </div> </div> </CardHeader>
    <CardContent>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre Visible</TableHead>
              <TableHead>Patente</TableHead>
              <TableHead>Chofer</TableHead>
              <TableHead className="text-right">T. Normal</TableHead>
              <TableHead className="text-right">T. Especial</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{tableContent}</TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>

  <ActionModal
    isOpen={modalState.isOpen}
    onClose={handleCloseModal}
    onConfirm={handleModalConfirm}
    isConfirming={isSubmitting}
    type={modalState.type}
    title={
      modalState.type === 'add'
        ? 'Agregar Nuevo Vehículo'
        : modalState.type === 'edit'
        ? `Editar Vehículo: ${modalState.vehiculo?.nombre_visible}`
        : 'Confirmar Eliminación'
    }
    confirmLabel={
      modalState.type === 'delete'
        ? 'Eliminar'
        : modalState.type === 'add'
        ? 'Guardar Vehículo'
        : 'Guardar Cambios'
    }
  >
    {modalState.type !== 'delete' ? (
      <VehiculoForm
        ref={formRef}
        onSubmit={handleFormSubmit}
        choferes={listaChoferes}
        
        defaultValues={
          modalState.vehiculo
            ? {
                id_vehiculo: modalState.vehiculo.id_vehiculo,
                nombre_visible:  modalState.vehiculo.nombre_visible,
                patente: modalState.vehiculo.patente,
                tarifa_normal: Number(modalState.vehiculo.tarifa_normal),
                tarifa_especial: Number(modalState.vehiculo.tarifa_especial),
                estado: modalState.vehiculo.estado as 'activo' | 'mantenimiento' | 'inactivo',
                choferId: modalState.vehiculo.chofer_id || null,
              }
            : { nombre_visible: '', patente: '', tarifa_normal: 0, tarifa_especial: 0, estado: 'activo' , choferId: null }
        }
        isLoading={isSubmitting}
      />
    ) : (
      <p className="text-sm text-gray-700">
        ¿Está seguro de que desea eliminar el vehículo {modalState.vehiculo?.nombre_visible} (
        {modalState.vehiculo?.patente})?
      </p>
    )}
  </ActionModal>
</div>
);
}
