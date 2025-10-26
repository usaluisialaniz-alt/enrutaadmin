// src/pages/OperacionesPage.tsx (o donde esté tu componente)

import React, { useState, useEffect } from 'react'; // Añadido React si no estaba
import { Plus, X, DollarSign, Loader2 } from 'lucide-react'; // Añadido Loader2
import { Button } from '@/components/ui/button'; // Ajusta la ruta si es necesario
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Añadido AlertTitle
import { Badge } from '@/components/ui/badge';

// Tipos de datos (igual que antes)
interface Chofer {
  id_chofer: string;
  nombre_completo: string;
  deuda_actual: string | number;
  estado: string;
  // Añade otras props si las necesitas/devuelve la API
}

interface Vehiculo {
    id_vehiculo: string;
    nombre_visible: string;
    tarifa_normal: string | number;
    tarifa_especial: string | number;
    // Añade otras props si las necesitas/devuelve la API
}

type Pago = {
  id: string; // ID temporal para el frontend
  monto: string;
  metodo: string;
};

type Gasto = {
  id: string; // ID temporal para el frontend
  concepto: string;
  monto: string;
};

export function OperacionesPage() {
  // Estados para datos de la API
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loadingChoferes, setLoadingChoferes] = useState(true);
  const [loadingVehiculos, setLoadingVehiculos] = useState(true);

  // Estados del formulario
  const [choferId, setChoferId] = useState('');
  const [vehiculoId, setVehiculoId] = useState(''); // Ahora necesitamos el ID del vehículo
  const [montoPagar, setMontoPagar] = useState('');
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);

  // Estados para UI y feedback
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // Para deshabilitar botón al guardar

  // --- Carga de Datos Inicial ---
  useEffect(() => {
    // Cargar Choferes
    const fetchChoferes = async () => {
      setLoadingChoferes(true);
      try {
        const response = await fetch('/api/getChoferes');
        if (!response.ok) throw new Error('Error al cargar chóferes');
        const data = await response.json();
        if (Array.isArray(data.choferes)) {
          setChoferes(data.choferes.filter(c => c.estado?.toLowerCase() === 'activo')); // Filtra activos aquí
        } else { throw new Error('Formato de chóferes inesperado'); }
      } catch (err) {
        setMensaje({ tipo: 'error', texto: err instanceof Error ? err.message : 'Error desconocido' });
      } finally {
        setLoadingChoferes(false);
      }
    };

    // Cargar Vehículos
    const fetchVehiculos = async () => {
        setLoadingVehiculos(true);
         try {
            const response = await fetch('/api/getVehiculos');
            if (!response.ok) throw new Error('Error al cargar vehículos');
            const data = await response.json();
             if (Array.isArray(data.vehiculos)) {
                setVehiculos(data.vehiculos);
            } else { throw new Error('Formato de vehículos inesperado'); }
        } catch (err) {
             setMensaje({ tipo: 'error', texto: err instanceof Error ? err.message : 'Error desconocido' });
        } finally {
            setLoadingVehiculos(false);
        }
    };

    fetchChoferes();
    fetchVehiculos();
  }, []); // Cargar solo una vez

  // --- Selección y Cálculos ---
  const choferSeleccionado = choferes.find((c) => c.id_chofer === choferId);
  // Encuentra el vehículo asociado al chofer O el seleccionado manualmente
  // (Idealmente, la API debería devolver el vehículo del chofer,
  // pero por ahora buscamos en la lista completa)
   const vehiculoDelChofer = vehiculos.find((v) => v.id_vehiculo === choferSeleccionado?.vehiculo_asignado_id);
   const vehiculoSeleccionadoManualmente = vehiculos.find((v) => v.id_vehiculo === vehiculoId);
   // Prioriza el seleccionado manualmente si existe, sino el asociado al chofer
   const vehiculoActivo = vehiculoSeleccionadoManualmente || vehiculoDelChofer;


  // --- Handlers para Pagos y Gastos (sin cambios lógicos) ---
  const handleAgregarPago = (montoInicial = '') => {
    setPagos([...pagos, { id: Date.now().toString(), monto: montoInicial, metodo: 'Efectivo' }]); // Cambiado a 'Efectivo'
  };
  const handleEliminarPago = (id: string) => setPagos(pagos.filter((p) => p.id !== id));
  const handleActualizarPago = (id: string, campo: 'monto' | 'metodo', valor: string) => {
    setPagos(pagos.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));
  };
  const handleAgregarGasto = () => setGastos([...gastos, { id: Date.now().toString(), concepto: '', monto: '' }]);
  const handleEliminarGasto = (id: string) => setGastos(gastos.filter((g) => g.id !== id));
  const handleActualizarGasto = (id: string, campo: 'concepto' | 'monto', valor: string) => {
    setGastos(gastos.map((g) => (g.id === id ? { ...g, [campo]: valor } : g)));
  };

  // --- Handlers para Botones de Tarifa ---
   const handleTarifaNormal = () => {
    if (vehiculoActivo) setMontoPagar(String(vehiculoActivo.tarifa_normal || 0));
  };
  const handleTarifaEspecial = () => {
    if (vehiculoActivo) setMontoPagar(String(vehiculoActivo.tarifa_especial || 0));
  };
  const handlePagarDeuda = () => {
    if (choferSeleccionado) {
        const deudaNum = parseFloat(String(choferSeleccionado.deuda_actual)) || 0;
        const montoDeuda = deudaNum > 0 ? deudaNum.toFixed(2) : '';
        handleAgregarPago(montoDeuda); // Llama a la función unificada
    }
    setMontoPagar('0');
  };

  // --- Handler para Guardar Rendición ---
  const handleGuardarRendicion = async () => {
    setMensaje(null); // Limpia mensajes previos
    if (!choferId) {
      setMensaje({ tipo: 'error', texto: 'Error: Debe seleccionar un chofer' });
      return;
    }
    // Usamos vehiculoActivo que ya tiene la lógica de selección
    if (!vehiculoActivo) {
       setMensaje({ tipo: 'error', texto: 'Error: No se pudo determinar el vehículo (selecciónelo o asógnelo al chofer)' });
       return;
    }
    if (montoPagar === '' || isNaN(parseFloat(montoPagar))) { // Verifica que sea un número válido
      setMensaje({ tipo: 'error', texto: 'Error: El monto a pagar debe ser un número válido' });
      return;
    }

    setIsSubmitting(true); // Deshabilita botón

    // Prepara los datos para enviar
    const datosParaApi = {
        choferId: choferId,
        vehiculoId: vehiculoActivo.id_vehiculo, // Enviamos el ID del vehículo activo
        montoAPagar: parseFloat(montoPagar) || 0,
        // Filtramos pagos/gastos vacíos antes de enviar
        pagos: pagos
                .filter(p => p.monto && parseFloat(p.monto) > 0)
                .map(({id, ...rest}) => rest), // Quitamos ID temporal del frontend
        gastos: gastos
                .filter(g => g.concepto && g.monto && parseFloat(g.monto) > 0)
                .map(({id, ...rest}) => rest), // Quitamos ID temporal
    };

    console.log("Enviando a /api/saveRendicion:", datosParaApi);

    try {
        const response = await fetch('/api/saveRendicion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosParaApi),
        });

        const result = await response.json(); // Intentamos leer la respuesta

        if (!response.ok) {
            // Si la respuesta no es OK, lanzamos el error que viene del backend
            throw new Error(result.error || `Error ${response.status}`);
        }

        setMensaje({ tipo: 'success', texto: result.message || 'Rendición guardada con éxito' });

        // Limpiar formulario después de un pequeño retraso
        setTimeout(() => {
          setChoferId('');
          setVehiculoId(''); // Limpia también el vehículo manual
          setMontoPagar('');
          setPagos([]);
          setGastos([]);
          setMensaje(null);
          // Opcional: Recargar datos de choferes para ver deuda actualizada
          // fetchChoferes();
        }, 2500);

    } catch (err) {
        console.error("Error al guardar rendición:", err);
        setMensaje({ tipo: 'error', texto: err instanceof Error ? err.message : 'Error desconocido al guardar' });
    } finally {
        setIsSubmitting(false); // Rehabilita botón
    }
  };

  // --- Cálculos para Resumen (sin cambios lógicos) ---
  const totalPagos = pagos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
  const totalGastos = gastos.reduce((sum, g) => sum + (parseFloat(g.monto) || 0), 0);
  const deudaActual = parseFloat(String(choferSeleccionado?.deuda_actual)) || 0;
  const deudaFinal = deudaActual + (parseFloat(montoPagar) || 0) - totalPagos - totalGastos;

  // --- JSX ---
  return (
    <div className="max-w-5xl mx-auto space-y-4 p-4 md:p-6"> {/* Ajustado space y padding */}
      {/* Mensaje de Alerta */}
      {mensaje && (
        <Alert variant={mensaje.tipo === 'error' ? 'destructive' : 'default'} className="mb-4">
           {/* <Terminal className="h-4 w-4" /> // Opcional: Icono */}
           <AlertTitle>{mensaje.tipo === 'error' ? 'Error' : 'Éxito'}</AlertTitle>
          <AlertDescription>{mensaje.texto}</AlertDescription>
        </Alert>
      )}

      {/* Card Principal: Chofer, Vehículo, Monto */}
      <Card>
        <CardHeader><CardTitle>Información de la Jornada</CardTitle></CardHeader>
        <CardContent className="space-y-4"> {/* Ajustado space */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Ajustado gap */}
            {/* Selector de Chofer */}
            <div className="space-y-1">
              <Label htmlFor="chofer">Chofer</Label>
              {loadingChoferes ? (<p className="text-sm text-gray-500">Cargando...</p>) : (
                <Select value={choferId} onValueChange={setChoferId} disabled={isSubmitting}>
                  <SelectTrigger id="chofer"><SelectValue placeholder="Seleccionar chofer" /></SelectTrigger>
                  <SelectContent>
                    {choferes.map((chofer) => (
                      <SelectItem key={chofer.id_chofer} value={chofer.id_chofer}>
                        {chofer.nombre_completo} (Deuda: ${ (parseFloat(String(chofer.deuda_actual))||0).toLocaleString('es-AR', {minimumFractionDigits: 2})})
                      </SelectItem>
                    ))}
                    {choferes.length === 0 && <SelectItem value="" disabled>No hay chóferes activos</SelectItem>}
                  </SelectContent>
                </Select>
               )}
               {choferSeleccionado && !loadingChoferes && (
                 <div className="flex items-center space-x-2 pt-1">
                   <span className="text-xs text-gray-600">Deuda actual:</span>
                   <Badge variant={deudaActual > 0 ? 'destructive' : deudaActual < 0 ? 'default' : 'secondary'} className={deudaActual < 0 ? 'bg-green-100 text-green-800' : ''}>
                     ${deudaActual.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                   </Badge>
                 </div>
               )}
            </div>

            {/* Selector de Vehículo (Opcional si siempre es el del chofer) */}
             <div className="space-y-1">
               <Label htmlFor="vehiculo">Vehículo Asignado</Label>
                {loadingVehiculos ? (<p className="text-sm text-gray-500">Cargando...</p>) : (
                <Input
                    id="vehiculo-asignado"
                    value={vehiculoActivo?.nombre_visible || (choferId ? 'Cargando/No asignado...' : 'Seleccione chofer')}
                    readOnly
                    className="bg-gray-100"
                 />
                )}
                 {/* Podrías añadir un Select aquí si quieres permitir cambiar el vehículo manualmente */}
                 {/* <Select value={vehiculoId} onValueChange={setVehiculoId} disabled={isSubmitting}>...</Select> */}
             </div>
          </div>

          {/* Monto a Pagar y Botones de Tarifa */}
          {choferId && !loadingVehiculos && ( // Muestra solo si hay chofer y vehículos cargados
            <>
                <div className="space-y-1">
                    <Label htmlFor="monto">Monto a Pagar (Jornada)</Label>
                    <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input id="monto" type="number" step="0.01" value={montoPagar}
                        onChange={(e) => setMontoPagar(e.target.value)} placeholder="0.00"
                        className="pl-8" disabled={isSubmitting}/>
                    </div>
                    </div>
                </div>

                {/* Botones de Tarifa */}
                {vehiculoActivo && (
                    <div className="flex flex-wrap gap-2 pt-1"> {/* Ajustado gap */}
                    <Button type="button" variant="outline" size="sm" onClick={handleTarifaNormal} disabled={isSubmitting}>
                        Día Normal (${ (parseFloat(String(vehiculoActivo.tarifa_normal))||0).toLocaleString('es-AR')})
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleTarifaEspecial} disabled={isSubmitting}>
                        Día Especial (${ (parseFloat(String(vehiculoActivo.tarifa_especial))||0).toLocaleString('es-AR')})
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handlePagarDeuda} disabled={isSubmitting || deudaActual <= 0}> {/* Deshabilita si no hay deuda */}
                        Pagar Deuda ($0)
                    </Button>
                    </div>
                )}
            </>
          )}

        </CardContent>
      </Card>

      {/* Sección de Pagos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Pagos</CardTitle> {/* Tamaño ajustado */}
            <Button onClick={()=>handleAgregarPago()} size="sm" variant="outline" disabled={isSubmitting}>
              <Plus className="w-4 h-4 mr-1" /> Agregar Pago
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pagos.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-3">No hay pagos registrados.</p>
          ) : (
            <div className="space-y-2">
              {pagos.map((pago, index) => (
                <div key={pago.id} className="flex items-center space-x-2 dynamic-row">
                  <div className="flex-1 relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <Input type="number" step="0.01" value={pago.monto} placeholder="Monto" disabled={isSubmitting}
                           onChange={(e) => handleActualizarPago(pago.id, 'monto', e.target.value)} className="pl-7"/>
                  </div>
                  <div className="flex-1">
                    <Select value={pago.metodo} disabled={isSubmitting}
                            onValueChange={(valor) => handleActualizarPago(pago.id, 'metodo', valor)}>
                      <SelectTrigger className="h-9 text-xs"> {/* Ajuste altura y texto */}
                         <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Efectivo">Efectivo</SelectItem>
                        <SelectItem value="Transferencia">Transferencia</SelectItem>
                        <SelectItem value="Mercado Pago">Mercado Pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleEliminarPago(pago.id)} className="h-8 w-8 text-red-500 hover:bg-red-50" disabled={isSubmitting}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-end pt-2 border-t">
                <div className="text-right text-sm">
                  <span className="text-gray-600">Total Pagos: </span>
                  <span className="font-medium text-green-600">${totalPagos.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sección de Gastos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Gastos</CardTitle>
             <Button onClick={handleAgregarGasto} size="sm" variant="outline" disabled={isSubmitting}>
              <Plus className="w-4 h-4 mr-1" /> Agregar Gasto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
           {gastos.length === 0 ? (
             <p className="text-sm text-gray-500 text-center py-3">No hay gastos registrados.</p>
          ) : (
            <div className="space-y-2">
              {gastos.map((gasto, index) => (
                <div key={gasto.id} className="flex items-center space-x-2 dynamic-row">
                   <div className="flex-1">
                    <Input type="text" value={gasto.concepto} placeholder="Concepto" disabled={isSubmitting}
                           onChange={(e) => handleActualizarGasto(gasto.id, 'concepto', e.target.value)} />
                  </div>
                  <div className="flex-1 relative">
                     <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <Input type="number" step="0.01" value={gasto.monto} placeholder="Monto" disabled={isSubmitting}
                           onChange={(e) => handleActualizarGasto(gasto.id, 'monto', e.target.value)} className="pl-7"/>
                  </div>
                   <Button variant="ghost" size="icon" onClick={() => handleEliminarGasto(gasto.id)} className="h-8 w-8 text-red-500 hover:bg-red-50" disabled={isSubmitting}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-end pt-2 border-t">
                <div className="text-right text-sm">
                  <span className="text-gray-600">Total Gastos: </span>
                  <span className="font-medium text-red-600">${totalGastos.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumen y Botón Guardar */}
      <Card className="bg-gray-50"> {/* Fondo sutil */}
        <CardContent className="pt-4 space-y-2"> {/* Ajustado padding y space */}
          {/* Mostramos resumen solo si hay chofer seleccionado */}
          {choferId && (
            <>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Deuda Anterior:</span>
                    <span className={deudaActual > 0 ? 'text-red-600' : deudaActual < 0 ? 'text-green-600' : 'text-gray-700'}>
                    ${deudaActual.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                    </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Monto Jornada:</span>
                    <span>+ ${(parseFloat(montoPagar) || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Total Pagos:</span>
                    <span className="text-green-600">- ${totalPagos.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Total Gastos:</span>
                    <span className="text-red-600">- ${totalGastos.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between items-center font-semibold">
                    <span className="text-gray-800">Deuda Final Estimada:</span>
                    <span className={`${deudaFinal > 0 ? 'text-red-600' : deudaFinal < 0 ? 'text-green-600' : 'text-gray-800'}`}>
                    ${deudaFinal.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                    </span>
                </div>
            </>
          )}
          <Button onClick={handleGuardarRendicion} className="w-full mt-4 bg-blue-600 hover:bg-blue-700" disabled={isSubmitting || !choferId || loadingChoferes || loadingVehiculos}>
             {isSubmitting ? (
                <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando... </>
             ) : ( 'Guardar Rendición' )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}