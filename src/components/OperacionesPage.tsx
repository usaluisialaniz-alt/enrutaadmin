// src/pages/OperacionesPage.tsx (o donde esté tu componente)

import React, { useState, useEffect, useMemo } from 'react'; // Añadido useMemo
import { Plus, X, DollarSign, Loader2, CalendarDays } from 'lucide-react'; // Añadido CalendarDays
import { Button } from '@/components/ui/button';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

// --- Tipos de Datos (Sin Cambios) ---
interface Chofer { /* ... */
  id_chofer: string;
  nombre_completo: string;
  deuda_actual: string | number;
  estado: string;
  vehiculo_asignado_id?: string;
}
interface Vehiculo { /* ... */
    id_vehiculo: string;
    nombre_visible: string;
    tarifa_normal: string | number;
    tarifa_especial: string | number;
}
type Pago = { id: string; monto: string; metodo: string; };
type Gasto = { id: string; concepto: string; monto: string; };


export function OperacionesPage() {
  // --- Estados para datos de la API ---
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loadingChoferes, setLoadingChoferes] = useState(true);
  const [loadingVehiculos, setLoadingVehiculos] = useState(true);

  // --- Estados del formulario ---
  const [choferId, setChoferId] = useState('');
  // const [montoPagar, setMontoPagar] = useState(''); // <-- ELIMINADO
  const [diasNormales, setDiasNormales] = useState<number | '' >(''); // <-- NUEVO ESTADO
  const [diasEspeciales, setDiasEspeciales] = useState<number | ''>(''); // <-- NUEVO ESTADO
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);

  // --- Estados para UI y feedback ---
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Carga de Datos Inicial (Sin Cambios) ---
  useEffect(() => {
    const fetchChoferes = async () => { /* ... código sin cambios ... */ };
    const fetchVehiculos = async () => { /* ... código sin cambios ... */ };
    // --- Pegar aquí las funciones fetchChoferes y fetchVehiculos de la respuesta #58 ---
     // Cargar Choferes
    const fetchChoferes = async () => {
      setLoadingChoferes(true);
      try {
        const response = await fetch('/api/getChoferes');
        if (!response.ok) throw new Error('Error al cargar chóferes');
        const data = await response.json();
        if (Array.isArray(data.choferes)) {
          // Filtramos activos aquí O podríamos hacerlo en el Select si queremos mostrar inactivos con deuda
          setChoferes(data.choferes);
        } else { throw new Error('Formato de chóferes inesperado'); }
      } catch (err) {
        setMensaje({ tipo: 'error', texto: err instanceof Error ? err.message : 'Error desconocido al cargar chóferes' });
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
             setMensaje({ tipo: 'error', texto: err instanceof Error ? err.message : 'Error desconocido al cargar vehículos' });
        } finally {
            setLoadingVehiculos(false);
        }
    };

    fetchChoferes();
    fetchVehiculos();
  }, []);

  // --- Selección y Cálculos ---
  const choferSeleccionado = choferes.find((c) => c.id_chofer === choferId);
  const vehiculoActivo = useMemo(() => {
      if (!choferSeleccionado?.vehiculo_asignado_id) return null;
      return vehiculos.find((v) => v.id_vehiculo === choferSeleccionado.vehiculo_asignado_id);
  }, [choferId, choferes, vehiculos]); // Recalcula solo si cambian estas dependencias


  // --- ¡NUEVO! Cálculo Automático del Monto a Pagar ---
  const montoCalculadoJornada = useMemo(() => {
    if (!vehiculoActivo) return 0;
    const tarifaN = parseFloat(String(vehiculoActivo.tarifa_normal)) || 0;
    const tarifaE = parseFloat(String(vehiculoActivo.tarifa_especial)) || 0;
    const dNormales = Number(diasNormales) || 0; // Convierte '' o NaN a 0
    const dEspeciales = Number(diasEspeciales) || 0; // Convierte '' o NaN a 0
    return (dNormales * tarifaN) + (dEspeciales * tarifaE);
  }, [diasNormales, diasEspeciales, vehiculoActivo]);

  // --- Handlers para Inputs de Días ---
  const handleDiasChange = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'normal' | 'especial') => {
      const value = e.target.value;
      // Permite campo vacío o números enteros no negativos
      if (value === '' || /^\d+$/.test(value)) {
          const numValue = value === '' ? '' : parseInt(value, 10);
          if (tipo === 'normal') {
              setDiasNormales(numValue);
          } else {
              setDiasEspeciales(numValue);
          }
      }
  };


  // --- Handlers para Pagos y Gastos (sin cambios lógicos) ---
  const handleAgregarPago = (montoInicial = '') => { /* ... sin cambios ... */ };
  const handleEliminarPago = (id: string) => { /* ... sin cambios ... */ };
  const handleActualizarPago = (id: string, campo: 'monto' | 'metodo', valor: string) => { /* ... sin cambios ... */ };
  const handleAgregarGasto = () => { /* ... sin cambios ... */ };
  const handleEliminarGasto = (id: string) => { /* ... sin cambios ... */ };
  const handleActualizarGasto = (id: string, campo: 'concepto' | 'monto', valor: string) => { /* ... sin cambios ... */ };
  // --- Pegar aquí las 6 funciones de handlers de pagos/gastos de la respuesta #58 ---
    const handleAgregarPago = (montoInicial = '') => {
        setPagos([...pagos, { id: Date.now().toString(), monto: montoInicial, metodo: 'Efectivo' }]);
    };
    const handleEliminarPago = (id: string) => setPagos(pagos.filter((p) => p.id !== id));
    const handleActualizarPago = (id: string, campo: 'monto' | 'metodo', valor: string) => {
        // Validación para monto: permitir solo números y un punto decimal
        if (campo === 'monto' && valor !== '' && !/^\d*\.?\d*$/.test(valor)) {
            return; // No actualizar si no es un número válido
        }
        setPagos(pagos.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));
    };
    const handleAgregarGasto = () => setGastos([...gastos, { id: Date.now().toString(), concepto: '', monto: '' }]);
    const handleEliminarGasto = (id: string) => setGastos(gastos.filter((g) => g.id !== id));
    const handleActualizarGasto = (id: string, campo: 'concepto' | 'monto', valor: string) => {
         // Validación para monto: permitir solo números y un punto decimal
        if (campo === 'monto' && valor !== '' && !/^\d*\.?\d*$/.test(valor)) {
            return; // No actualizar si no es un número válido
        }
        setGastos(gastos.map((g) => (g.id === id ? { ...g, [campo]: valor } : g)));
    };

  // --- Handler para Guardar Rendición (Modificado) ---
  const handleGuardarRendicion = async () => {
    setMensaje(null);
    if (!choferId) {
      setMensaje({ tipo: 'error', texto: 'Debe seleccionar un chofer' });
      return;
    }
    if (!vehiculoActivo) {
       setMensaje({ tipo: 'error', texto: 'El chofer no tiene vehículo asignado o no se pudo cargar' });
       return;
    }
    // Validación: Al menos debe haber días, pagos o gastos para guardar
    if (montoCalculadoJornada <= 0 && pagos.filter(p => parseFloat(p.monto) > 0).length === 0 && gastos.filter(g => parseFloat(g.monto) > 0).length === 0) {
        setMensaje({ tipo: 'error', texto: 'Debe ingresar días, pagos o gastos para guardar.' });
        return;
    }


    setIsSubmitting(true);

    const datosParaApi = {
        choferId: choferId,
        vehiculoId: vehiculoActivo.id_vehiculo,
        montoAPagar: montoCalculadoJornada, // <-- Enviamos el monto calculado
        pagos: pagos
                .filter(p => p.monto && parseFloat(p.monto) > 0)
                .map(({id, ...rest}) => ({...rest, monto: parseFloat(rest.monto)})), // Enviamos monto como número
        gastos: gastos
                .filter(g => g.concepto && g.monto && parseFloat(g.monto) > 0)
                .map(({id, ...rest}) => ({...rest, monto: parseFloat(rest.monto)})), // Enviamos monto como número
    };

    console.log("Enviando a /api/saveRendicion:", datosParaApi);

    try {
        const response = await fetch('/api/saveRendicion', { /* ... fetch options ... */
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(datosParaApi),
         });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Error ${response.status}`);
        setMensaje({ tipo: 'success', texto: result.message || 'Rendición guardada' });

        setTimeout(() => {
          setChoferId('');
          setDiasNormales(''); // Limpia días
          setDiasEspeciales(''); // Limpia días
          setPagos([]);
          setGastos([]);
          setMensaje(null);
          // Opcional: Recargar choferes para ver deuda
          // fetchChoferes();
        }, 2500);

    } catch (err) {
        console.error("Error al guardar:", err);
        setMensaje({ tipo: 'error', texto: err instanceof Error ? err.message : 'Error desconocido' });
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- Cálculos para Resumen (Modificado) ---
  const totalPagos = pagos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
  const totalGastos = gastos.reduce((sum, g) => sum + (parseFloat(g.monto) || 0), 0);
  const deudaActual = parseFloat(String(choferSeleccionado?.deuda_actual)) || 0;
  // Usamos el monto calculado
  const deudaFinal = deudaActual + montoCalculadoJornada - totalPagos - totalGastos;

  // --- JSX ---
  return (
    <div className="max-w-5xl mx-auto space-y-4 p-4 md:p-6">
      {/* Mensaje de Alerta */}
      {mensaje && ( /* ... JSX del Alert sin cambios ... */
         <Alert variant={mensaje.tipo === 'error' ? 'destructive' : 'default'} className="mb-4">
           <AlertTitle>{mensaje.tipo === 'error' ? 'Error' : 'Éxito'}</AlertTitle>
          <AlertDescription>{mensaje.texto}</AlertDescription>
        </Alert>
      )}

      {/* Card Principal: Chofer, Vehículo, Días */}
      <Card>
        <CardHeader><CardTitle>Información de la Jornada</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Selector de Chofer */}
            <div className="space-y-1">
              <Label htmlFor="chofer">Chofer</Label>
              {loadingChoferes ? (<p className="text-sm text-gray-500">Cargando chóferes...</p>) : (
                <Select value={choferId} onValueChange={(value) => {setChoferId(value); setDiasNormales(''); setDiasEspeciales('');}} disabled={isSubmitting}>
                  <SelectTrigger id="chofer"><SelectValue placeholder="Seleccionar chofer" /></SelectTrigger>
                  <SelectContent>
                    {choferes
                      .filter(c => c.estado?.toLowerCase() === 'activo') // Filtra activos en el select
                      .map((chofer) => (
                      <SelectItem key={chofer.id_chofer} value={chofer.id_chofer}>
                        {chofer.nombre_completo} (Deuda: ${(parseFloat(String(chofer.deuda_actual))||0).toLocaleString('es-AR', {minimumFractionDigits: 2})})
                      </SelectItem>
                    ))}
                    {choferes.filter(c => c.estado?.toLowerCase() === 'activo').length === 0 && <SelectItem value="" disabled>No hay chóferes activos</SelectItem>}
                  </SelectContent>
                </Select>
               )}
               {/* Muestra deuda actual si hay chofer seleccionado */}
               {choferSeleccionado && !loadingChoferes && ( /* ... JSX de la deuda sin cambios ... */
                 <div className="flex items-center space-x-2 pt-1">
                   <span className="text-xs text-gray-600">Deuda actual:</span>
                   <Badge variant={deudaActual > 0 ? 'destructive' : deudaActual < 0 ? 'default' : 'secondary'} className={deudaActual < 0 ? 'bg-green-100 text-green-800' : ''}>
                     ${deudaActual.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                   </Badge>
                 </div>
               )}
            </div>

            {/* Vehículo Asignado */}
             <div className="space-y-1">
               <Label htmlFor="vehiculo-asignado">Vehículo Asignado</Label>
               <Input
                    id="vehiculo-asignado"
                    value={vehiculoActivo?.nombre_visible || (choferId ? (loadingVehiculos ? 'Cargando...' : 'No asignado') : 'Seleccione chofer')}
                    readOnly
                    className="bg-gray-100 text-sm h-9" // Ajustes de estilo
                 />
                 {/* Mostramos tarifas si el vehículo está cargado */}
                 {vehiculoActivo && !loadingVehiculos && (
                    <div className="text-xs text-gray-500 pt-1">
                        Tarifas: Normal ${ parseFloat(String(vehiculoActivo.tarifa_normal)||0).toLocaleString('es-AR') }
                        {' / '}
                        Especial ${ parseFloat(String(vehiculoActivo.tarifa_especial)||0).toLocaleString('es-AR') }
                    </div>
                 )}
             </div>
          </div>

          {/* --- NUEVO: Inputs para Días --- */}
          {choferId && vehiculoActivo && !loadingVehiculos && ( // Muestra solo si hay chofer y vehículo
            <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                    <Label htmlFor="dias-normales" className="flex items-center">
                        <CalendarDays className="w-4 h-4 mr-1 text-gray-500"/> Días Normales
                    </Label>
                    <Input id="dias-normales" type="number" min="0" step="1"
                           value={diasNormales}
                           onChange={(e)=> handleDiasChange(e, 'normal')}
                           placeholder="0" disabled={isSubmitting}
                           className="h-9"/>
                </div>
                 <div className="space-y-1">
                    <Label htmlFor="dias-especiales" className="flex items-center">
                        <CalendarDays className="w-4 h-4 mr-1 text-gray-500"/> Días Especiales/Feriados
                    </Label>
                    <Input id="dias-especiales" type="number" min="0" step="1"
                           value={diasEspeciales}
                           onChange={(e)=> handleDiasChange(e, 'especial')}
                           placeholder="0" disabled={isSubmitting}
                           className="h-9"/>
                </div>
            </div>
          )}
           {/* --- FIN Inputs para Días --- */}

        </CardContent>
      </Card>

      {/* Sección de Pagos */}
      <Card>
           {/* ... JSX sin cambios (CardHeader, map de pagos, Total Pagos) ... */}
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Pagos</CardTitle>
                    <Button onClick={()=>handleAgregarPago()} size="sm" variant="outline" disabled={isSubmitting || !choferId}> {/* Deshabilita si no hay chofer */}
                    <Plus className="w-4 h-4 mr-1" /> Agregar Pago
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {pagos.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-3">No hay pagos registrados.</p>
                ) : (
                    <div className="space-y-2">
                    {pagos.map((pago) => (
                        <div key={pago.id} className="flex items-center space-x-2 dynamic-row">
                        <div className="flex-1 relative">
                            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                            <Input type="number" step="0.01" value={pago.monto} placeholder="Monto" disabled={isSubmitting}
                                onChange={(e) => handleActualizarPago(pago.id, 'monto', e.target.value)} className="pl-7"/>
                        </div>
                        <div className="flex-1">
                            <Select value={pago.metodo} disabled={isSubmitting}
                                    onValueChange={(valor) => handleActualizarPago(pago.id, 'metodo', valor)}>
                            <SelectTrigger className="h-9 text-xs">
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
            {/* ... JSX sin cambios (CardHeader, map de gastos, Total Gastos) ... */}
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Gastos</CardTitle>
                    <Button onClick={handleAgregarGasto} size="sm" variant="outline" disabled={isSubmitting || !choferId}> {/* Deshabilita si no hay chofer */}
                    <Plus className="w-4 h-4 mr-1" /> Agregar Gasto
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {gastos.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-3">No hay gastos registrados.</p>
                ) : (
                    <div className="space-y-2">
                    {gastos.map((gasto) => (
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
      <Card className="bg-gray-50">
        <CardContent className="pt-4 space-y-2">
          {/* Mostramos resumen solo si hay chofer seleccionado */}
          {choferId && (
            <>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Deuda Anterior:</span>
                    <span className={deudaActual > 0 ? 'text-red-600' : deudaActual < 0 ? 'text-green-600' : 'text-gray-700'}>
                    ${deudaActual.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                    </span>
                </div>
                {/* Mostramos Monto Jornada Calculado */}
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Monto Jornada (Calculado):</span>
                    <span>+ ${montoCalculadoJornada.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
                </div>
                {/* Resto del resumen sin cambios */}
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
          {/* Botón Guardar */}
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