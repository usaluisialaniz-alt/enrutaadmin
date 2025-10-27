// src/pages/OperacionesPage.tsx (Opción A Modificada - Corregido sin duplicados)

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, DollarSign, Loader2, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Ajusta rutas si es necesario
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

// --- Tipos de Datos ---
interface Chofer {
  id_chofer: string;
  nombre_completo: string;
  deuda_actual: string | number;
  estado: string;
  vehiculo_asignado_id?: string;
}
interface Vehiculo {
    id_vehiculo: string;
    nombre_visible: string;
    tarifa_normal: string | number;
    tarifa_especial: string | number;
}
type Pago = {
  id: string; // ID temporal
  monto: string; // Monto efectivamente pagado
  metodo: string;
  // Campos opcionales para indicar cobertura
  diasNormalesCubiertos?: number | '';
  diasEspecialesCubiertos?: number | '';
};
type Gasto = { id: string; concepto: string; monto: string; };

export function OperacionesPage() {
  // --- Estados API ---
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loadingChoferes, setLoadingChoferes] = useState(true);
  const [loadingVehiculos, setLoadingVehiculos] = useState(true);

  // --- Estados Formulario (Opción A) ---
  const [choferId, setChoferId] = useState('');
  const [diasNormales, setDiasNormales] = useState<number | ''>(''); // Días de la jornada
  const [diasEspeciales, setDiasEspeciales] = useState<number | ''>(''); // Días de la jornada
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);

  // --- Estados UI ---
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  }, [choferId, choferes, vehiculos]);

  // --- Cálculo Monto Jornada (Opción A) ---
  const montoCalculadoJornada = useMemo(() => {
    if (!vehiculoActivo) return 0;
    const tarifaN = parseFloat(String(vehiculoActivo.tarifa_normal)) || 0;
    const tarifaE = parseFloat(String(vehiculoActivo.tarifa_especial)) || 0;
    const dNormalesNum = Number(diasNormales) || 0;
    const dEspecialesNum = Number(diasEspeciales) || 0;
    return (dNormalesNum * tarifaN) + (dEspecialesNum * tarifaE);
  }, [diasNormales, diasEspeciales, vehiculoActivo]);

  // --- Handlers Inputs Días Jornada ---
  const handleDiasChange = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'normal' | 'especial') => {
      const value = e.target.value;
      if (value === '' || /^\d+$/.test(value)) {
          const numValue = value === '' ? '' : parseInt(value, 10);
          if (tipo === 'normal') setDiasNormales(numValue);
          else setDiasEspeciales(numValue);
      }
  };

  // --- Handlers para Pagos (Incluye días cubiertos) ---
  const handleAgregarPago = (montoInicial = '') => {
    setPagos([...pagos, {
        id: Date.now().toString(),
        monto: montoInicial,
        metodo: 'Efectivo',
        diasNormalesCubiertos: '',
        diasEspecialesCubiertos: '',
    }]);
  };
  const handleEliminarPago = (id: string) => setPagos(pagos.filter((p) => p.id !== id));
  const handleActualizarPago = (id: string, campo: keyof Pago, valor: string | number) => {
    if ((campo === 'monto') && valor !== '' && !/^\d*\.?\d*$/.test(String(valor))) return;
     if ((campo === 'diasNormalesCubiertos' || campo === 'diasEspecialesCubiertos')) {
         const strValor = String(valor);
         if (strValor !== '' && !/^\d+$/.test(strValor)) return;
         valor = strValor === '' ? '' : parseInt(strValor, 10);
     }
    setPagos(pagos.map((p) => (p.id === id ? { ...p, [campo]: String(valor) } : p)));
  };

  // --- Handlers para Gastos (DEFINIDOS UNA SOLA VEZ) ---
  const handleAgregarGasto = () => {
      setGastos([...gastos, { id: Date.now().toString(), concepto: '', monto: '' }]);
  };
  const handleEliminarGasto = (id: string) => {
      setGastos(gastos.filter((g) => g.id !== id));
  };
  const handleActualizarGasto = (id: string, campo: 'concepto' | 'monto', valor: string) => {
      if (campo === 'monto' && valor !== '' && !/^\d*\.?\d*$/.test(valor)) return;
      setGastos(gastos.map((g) => (g.id === id ? { ...g, [campo]: valor } : g)));
  };

  // --- Handler para Guardar Rendición (Opción A) ---
  const handleGuardarRendicion = async () => {
    setMensaje(null);
    if (!choferId) { setMensaje({ tipo: 'error', texto: 'Debe seleccionar un chofer' }); return; }
    if (!vehiculoActivo) { setMensaje({ tipo: 'error', texto: 'Chofer sin vehículo asignado' }); return; }
    if (montoCalculadoJornada <= 0 && pagos.filter(p => parseFloat(p.monto) > 0).length === 0 && gastos.filter(g => parseFloat(g.monto) > 0).length === 0) {
        setMensaje({ tipo: 'error', texto: 'Debe ingresar días rendidos, pagos o gastos.' });
        return;
    }

    setIsSubmitting(true);

    const datosParaApi = {
        choferId: choferId,
        vehiculoId: vehiculoActivo.id_vehiculo,
        montoAPagar: montoCalculadoJornada, // Envía el monto calculado de la jornada
        pagos: pagos
                .filter(p => p.monto && parseFloat(p.monto) > 0) // Solo pagos con monto
                .map(({id, ...rest}) => ({ // Quitamos ID temporal
                    ...rest,
                    monto: parseFloat(rest.monto) || 0,
                    diasNormalesCubiertos: Number(rest.diasNormalesCubiertos) || 0,
                    diasEspecialesCubiertos: Number(rest.diasEspecialesCubiertos) || 0,
                })),
        gastos: gastos
                .filter(g => g.concepto && g.monto && parseFloat(g.monto) > 0)
                .map(({id, ...rest}) => ({...rest, monto: parseFloat(rest.monto)})),
    };

    console.log("Enviando a /api/saveRendicion (Opción A Modificada):", datosParaApi);

    try {
        const response = await fetch('/api/saveRendicion', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(datosParaApi),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Error ${response.status}`);
        setMensaje({ tipo: 'success', texto: result.message || 'Rendición guardada' });

        setTimeout(() => {
          setChoferId('');
          setDiasNormales('');
          setDiasEspeciales('');
          setPagos([]);
          setGastos([]);
          setMensaje(null);
        }, 2500);

    } catch (err) {
        console.error("Error al guardar:", err);
        setMensaje({ tipo: 'error', texto: err instanceof Error ? err.message : 'Error desconocido al guardar' });
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- Cálculos para Resumen (Opción A) ---
  const totalPagadoEfectivamente = pagos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
  const totalGastos = gastos.reduce((sum, g) => sum + (parseFloat(g.monto) || 0), 0);
  const deudaActual = parseFloat(String(choferSeleccionado?.deuda_actual)) || 0;
  const deudaFinal = deudaActual + montoCalculadoJornada - totalPagadoEfectivamente - totalGastos;

  // --- JSX ---
  return (
    <div className="max-w-5xl mx-auto space-y-4 p-4 md:p-6">
      {/* Mensaje de Alerta */}
      {mensaje && (
         <Alert variant={mensaje.tipo === 'error' ? 'destructive' : 'default'} className="mb-4">
           <AlertTitle>{mensaje.tipo === 'error' ? 'Error' : 'Éxito'}</AlertTitle>
          <AlertDescription>{mensaje.texto}</AlertDescription>
        </Alert>
       )}

      {/* Card Principal: Chofer, Vehículo, DÍAS JORNADA */}
      <Card>
        <CardHeader><CardTitle>Información de la Jornada Rendida</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Selectores Chofer y Vehículo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="chofer">Chofer</Label>
                {loadingChoferes ? (<p className="text-sm text-gray-500">Cargando...</p>) : (
                <Select value={choferId} onValueChange={(value) => {setChoferId(value); setDiasNormales(''); setDiasEspeciales(''); setPagos([]); setGastos([]);}} disabled={isSubmitting}>
                  <SelectTrigger id="chofer"><SelectValue placeholder="Seleccionar chofer" /></SelectTrigger>
                  <SelectContent>
                    {choferes
                      .filter(c => c.estado?.toLowerCase() === 'activo')
                      .map((chofer) => (
                      <SelectItem key={chofer.id_chofer} value={chofer.id_chofer}>
                        {chofer.nombre_completo} (Deuda: ${(parseFloat(String(chofer.deuda_actual))||0).toLocaleString('es-AR', {minimumFractionDigits: 2})})
                      </SelectItem>
                    ))}
                    {choferes.filter(c => c.estado?.toLowerCase() === 'activo').length === 0 && <SelectItem value="" disabled>No hay chóferes activos</SelectItem>}
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
            <div className="space-y-1">
              <Label htmlFor="vehiculo-asignado">Vehículo Asignado</Label>
                {loadingVehiculos ? (<p className="text-sm text-gray-500">Cargando...</p>) : (
                <Input id="vehiculo-asignado" value={vehiculoActivo?.nombre_visible || (choferId ? (loadingVehiculos ? 'Cargando...' : 'No asignado') : 'Seleccione chofer')} readOnly className="bg-gray-100 text-sm h-9"/>
                )}
                 {vehiculoActivo && !loadingVehiculos && (
                    <div className="text-xs text-gray-500 pt-1">
                        Tarifas: N ${ parseFloat(String(vehiculoActivo.tarifa_normal)||0).toLocaleString('es-AR') } / E ${ parseFloat(String(vehiculoActivo.tarifa_especial)||0).toLocaleString('es-AR') }
                    </div>
                 )}
            </div>
          </div>

          {/* Inputs para Días Jornada */}
          {choferId && vehiculoActivo && !loadingVehiculos && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-4">
                <div className="space-y-1">
                    <Label htmlFor="dias-normales-jornada" className="flex items-center text-sm font-medium">
                        <CalendarDays className="w-4 h-4 mr-1 text-blue-600"/> Días Normales Rendidos
                    </Label>
                    <Input id="dias-normales-jornada" type="number" min="0" step="1"
                           value={diasNormales}
                           onChange={(e)=> handleDiasChange(e, 'normal')}
                           placeholder="0" disabled={isSubmitting} className="h-9"/>
                     <p className="text-xs text-gray-500">Total días normales que se rinden.</p>
                </div>
                 <div className="space-y-1">
                    <Label htmlFor="dias-especiales-jornada" className="flex items-center text-sm font-medium">
                        <CalendarDays className="w-4 h-4 mr-1 text-purple-600"/> Días Especiales Rendidos
                    </Label>
                    <Input id="dias-especiales-jornada" type="number" min="0" step="1"
                           value={diasEspeciales}
                           onChange={(e)=> handleDiasChange(e, 'especial')}
                           placeholder="0" disabled={isSubmitting} className="h-9"/>
                      <p className="text-xs text-gray-500">Total días esp./feriados que se rinden.</p>
                </div>
                 <div className="col-span-2 text-right mt-1">
                     <span className="text-sm text-gray-600">Monto Calculado Jornada: </span>
                     <span className="font-semibold text-lg text-blue-700">
                         ${montoCalculadoJornada.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                     </span>
                 </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sección de Pagos (CON DÍAS CUBIERTOS OPCIONALES Y BOTONES MONTO) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Registro de Pagos</CardTitle>
            <Button onClick={()=>handleAgregarPago()} size="sm" variant="outline" disabled={isSubmitting || !choferId}>
              <Plus className="w-4 h-4 mr-1" /> Agregar Pago
            </Button>
          </div>
           <p className="text-xs text-gray-500 pt-1">Registre el dinero entregado. Use [N]/[E] para autocompletar monto. Días cubiertos es opcional.</p>
        </CardHeader>
        <CardContent>
          {pagos.length === 0 ? ( <p className="text-sm text-gray-500 text-center py-3">No hay pagos registrados.</p> )
           : (
            <div className="space-y-3">
              {/* Encabezados Opcionales para Desktop */}
              <div className="hidden md:grid md:grid-cols-12 gap-2 text-xs text-gray-500 px-3 font-medium border-b pb-1 mb-2">
                  <div className="md:col-span-4">Monto Pagado</div>
                  <div className="md:col-span-3">Método</div>
                  <div className="md:col-span-2 text-center">Días N Cub.</div>
                  <div className="md:col-span-2 text-center">Días E Cub.</div>
                  <div className="md:col-span-1"></div>
              </div>
              {/* Filas de Pago */}
              {pagos.map((pago) => {
                 const tarifaN = parseFloat(String(vehiculoActivo?.tarifa_normal)) || 0;
                 const tarifaE = parseFloat(String(vehiculoActivo?.tarifa_especial)) || 0;
                 return (
                    <div key={pago.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-lg dynamic-row border">
                    {/* Monto Pagado + Botones */}
                    <div className="md:col-span-4 space-y-1">
                        <Label htmlFor={`monto-${pago.id}`} className="text-xs text-gray-600 md:hidden">Monto Pagado</Label>
                        <div className="flex items-center space-x-1">
                            <div className="relative flex-grow">
                                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                <Input id={`monto-${pago.id}`} type="number" step="0.01" value={pago.monto} placeholder="0.00" disabled={isSubmitting}
                                        onChange={(e) => handleActualizarPago(pago.id, 'monto', e.target.value)} className="pl-7"/>
                            </div>
                            <Button type="button" size="sm" variant="outline" className="px-2 h-9 text-xs" title={`Normal ($${tarifaN})`}
                                    disabled={!vehiculoActivo || isSubmitting} onClick={()=> handleActualizarPago(pago.id, 'monto', tarifaN.toFixed(2))}> N </Button>
                             <Button type="button" size="sm" variant="outline" className="px-2 h-9 text-xs" title={`Especial ($${tarifaE})`}
                                    disabled={!vehiculoActivo || isSubmitting} onClick={()=> handleActualizarPago(pago.id, 'monto', tarifaE.toFixed(2))}> E </Button>
                        </div>
                    </div>
                    {/* Método */}
                    <div className="md:col-span-3 space-y-1">
                        <Label htmlFor={`metodo-${pago.id}`} className="text-xs text-gray-600 md:hidden">Método</Label>
                        <Select value={pago.metodo} disabled={isSubmitting} onValueChange={(valor) => handleActualizarPago(pago.id, 'metodo', valor)}>
                            <SelectTrigger id={`metodo-${pago.id}`} className="h-9 text-xs"> <SelectValue /> </SelectTrigger>
                            <SelectContent> <SelectItem value="Efectivo">Efectivo</SelectItem> <SelectItem value="Transferencia">Transferencia</SelectItem> <SelectItem value="Mercado Pago">Mercado Pago</SelectItem> </SelectContent>
                        </Select>
                    </div>
                    {/* Días N Cub (Opcional) */}
                    <div className="md:col-span-2 space-y-1">
                        <Label htmlFor={`dnc-${pago.id}`} className="text-xs text-gray-600 md:hidden">Días N Cub. (Opc)</Label>
                        <Input id={`dnc-${pago.id}`} type="number" min="0" step="1" title="Días normales que cubre este pago (opcional)"
                            value={pago.diasNormalesCubiertos} placeholder="(Opc)" disabled={isSubmitting}
                            onChange={(e) => handleActualizarPago(pago.id, 'diasNormalesCubiertos', e.target.value)} />
                    </div>
                    {/* Días E Cub (Opcional) */}
                    <div className="md:col-span-2 space-y-1">
                        <Label htmlFor={`dec-${pago.id}`} className="text-xs text-gray-600 md:hidden">Días E Cub. (Opc)</Label>
                        <Input id={`dec-${pago.id}`} type="number" min="0" step="1" title="Días especiales cubiertos (opcional)"
                            value={pago.diasEspecialesCubiertos} placeholder="(Opc)" disabled={isSubmitting}
                            onChange={(e) => handleActualizarPago(pago.id, 'diasEspecialesCubiertos', e.target.value)} />
                    </div>
                    {/* Botón Eliminar */}
                    <div className="md:col-span-1 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEliminarPago(pago.id)} className="h-8 w-8 text-red-500 hover:bg-red-50" disabled={isSubmitting}>
                        <X className="w-4 h-4" />
                        </Button>
                    </div>
                    </div>
                 );
              })}
              {/* Total Pagado */}
              <div className="flex justify-end pt-2 border-t text-sm">
                 <div className="text-right">
                  <span className="text-gray-600">Total Pagado: </span>
                  <span className="font-medium text-green-600">${totalPagadoEfectivamente.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span>
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
                    <Button onClick={handleAgregarGasto} size="sm" variant="outline" disabled={isSubmitting || !choferId}>
                    <Plus className="w-4 h-4 mr-1" /> Agregar Gasto
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {gastos.length === 0 ? ( <p className="text-sm text-gray-500 text-center py-3">No hay gastos registrados.</p> )
                 : ( <div className="space-y-2">{gastos.map((gasto) => ( <div key={gasto.id} className="flex items-center space-x-2 dynamic-row"> <div className="flex-1"> <Input type="text" value={gasto.concepto} placeholder="Concepto" disabled={isSubmitting} onChange={(e) => handleActualizarGasto(gasto.id, 'concepto', e.target.value)} /> </div> <div className="flex-1 relative"> <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" /> <Input type="number" step="0.01" value={gasto.monto} placeholder="Monto" disabled={isSubmitting} onChange={(e) => handleActualizarGasto(gasto.id, 'monto', e.target.value)} className="pl-7"/> </div> <Button variant="ghost" size="icon" onClick={() => handleEliminarGasto(gasto.id)} className="h-8 w-8 text-red-500 hover:bg-red-50" disabled={isSubmitting}> <X className="w-4 h-4" /> </Button> </div> ))} <div className="flex justify-end pt-2 border-t"> <div className="text-right text-sm"> <span className="text-gray-600">Total Gastos: </span> <span className="font-medium text-red-600">${totalGastos.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span> </div> </div> </div> )}
            </CardContent>
      </Card>

      {/* Resumen y Botón Guardar */}
      <Card className="bg-gray-50">
            <CardContent className="pt-4 space-y-2">
            {choferId && vehiculoActivo && (
                <>
                    <div className="flex justify-between items-center text-sm"> <span className="text-gray-600">Deuda Anterior:</span> <span className={deudaActual > 0 ? 'text-red-600' : deudaActual < 0 ? 'text-green-600' : 'text-gray-700'}> ${deudaActual.toLocaleString('es-AR', {minimumFractionDigits: 2})} </span> </div>
                    <div className="flex justify-between items-center text-sm"> <span className="text-gray-600">Monto Jornada (Calculado):</span> <span>+ ${montoCalculadoJornada.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span> </div>
                    <div className="flex justify-between items-center text-sm"> <span className="text-gray-600">Total Pagado:</span> <span className="text-green-600">- ${totalPagadoEfectivamente.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span> </div>
                    <div className="flex justify-between items-center text-sm"> <span className="text-gray-600">Total Gastos:</span> <span className="text-red-600">- ${totalGastos.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span> </div>
                    <div className="border-t pt-2 mt-2 flex justify-between items-center font-semibold"> <span className="text-gray-800">Deuda Final Estimada:</span> <span className={`${deudaFinal > 0 ? 'text-red-600' : deudaFinal < 0 ? 'text-green-600' : 'text-gray-800'}`}> ${deudaFinal.toLocaleString('es-AR', {minimumFractionDigits: 2})} </span> </div>
                </>
            )}
            <Button onClick={handleGuardarRendicion} className="w-full mt-4 bg-blue-600 hover:bg-blue-700" disabled={isSubmitting || !choferId || loadingChoferes || loadingVehiculos}>
                {isSubmitting ? ( <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando... </> ) : ( 'Guardar Rendición' )}
            </Button>
            </CardContent>
      </Card>
    </div>
  );
}