// src/pages/OperacionesPage.tsx (Refactorizado con Calendario y Historial)

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, DollarSign, Loader2, CalendarDays, BadgeCheck, BadgeAlert, CircleDollarSign } from 'lucide-react';
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
// --- ¡NUEVO! Importamos el Calendario ---
import { Calendar } from '@/components/ui/calendar'; 
import { es } from 'date-fns/locale'; // Importamos el idioma español para el calendario

// --- Tipos de Datos (Pago simplificado) ---
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
// Se eliminan 'diasNormalesCubiertos' y 'diasEspecialesCubiertos'
type Pago = {
  id: string; // ID temporal
  monto: string; // Monto efectivamente pagado
  metodo: string;
};
type Gasto = { id: string; concepto: string; monto: string; };

// --- Simulación de API de Feriados ---
const FeriadosSimulados2025 = [
    '2025-10-13', 
    '2025-11-20', 
];
const fetchFeriados = async (): Promise<string[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(FeriadosSimulados2025);
        }, 300);
    });
};
// --- Fin Simulación ---

// --- ¡NUEVO TIPO! Estado del día pagado ---
type PaidDateStatus = 'paid' | 'partial';
// --- ¡NUEVO TIPO! Historial de Pagos Detallado ---
interface PaidDateInfo {
    status: PaidDateStatus;
    tarifa?: number;
    pagado?: number;
}


export function OperacionesPage() {
  // --- Estados API ---
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [feriados, setFeriados] = useState<string[]>([]); // Estado para feriados
  const [loadingChoferes, setLoadingChoferes] = useState(true);
  const [loadingVehiculos, setLoadingVehiculos] = useState(true);
  
  // --- ¡¡CAMBIO CRÍTICO!! ---
  // El estado debe usar la interfaz 'PaidDateInfo' (el objeto),
  // no el tipo 'PaidDateStatus' (el string).
  const [paidDatesHistory, setPaidDatesHistory] = useState<Record<string, PaidDateInfo>>({}); 
  const [loadingHistory, setLoadingHistory] = useState(false);

  // --- Estados Formulario (MODIFICADOS) ---
  const [choferId, setChoferId] = useState('');
  // ¡NUEVO! Estado para el calendario
  const [selectedDates, setSelectedDates] = useState<Date[] | undefined>([]); 
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 10, 1)); // Nov 2025 (para demostración)
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  // Los estados 'diasNormales' y 'diasEspeciales' se han eliminado.

  // --- Estados UI ---
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fecha "Hoy" (fijada para demostración, en una app real usarías new Date())
  const today = new Date(2025, 10, 1); // 1 de Noviembre, 2025

  // --- Carga de Datos Inicial (Actualizada) ---
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
    // Cargar Feriados (NUEVO)
    const loadFeriados = async () => {
        try {
            const data = await fetchFeriados();
            setFeriados(data);
        } catch (err) {
            setMensaje({ tipo: 'error', texto: 'Error al cargar feriados' });
        }
    };

    fetchChoferes();
    fetchVehiculos();
    loadFeriados();
  }, []); // Se ejecuta 1 vez al cargar

  // --- ¡FUNCIÓN MODIFICADA: Fetch de Historial de Pagos! ---
  // Se activa CADA VEZ que cambia el choferId
  useEffect(() => {
    const fetchPaidDatesHistory = async () => {
        if (!choferId) {
            setPaidDatesHistory({}); // Limpia el historial si no hay chofer
            return;
        }
        setLoadingHistory(true);
        try {
            // Llama a la API (Asumimos que api/getPaidDates devuelve el nuevo objeto)
            const response = await fetch(`/api/getPaidDates?choferId=${choferId}`);
            if (!response.ok) throw new Error('Error al cargar historial de pagos');
            const data = await response.json();
            // ¡MODIFICADO! Espera un objeto, no un array
            if (typeof data.paidDates === 'object' && data.paidDates !== null) {
                setPaidDatesHistory(data.paidDates); // Guarda { '2025-10-10': { status: 'paid' }, ... }
            } else {
                 // --- ¡CAMBIO EN FALLBACK! ---
                 // El fallback (si la API es antigua) debe crear el objeto PaidDateInfo
                 if (Array.isArray(data.paidDates)) { 
                    const historyMap: Record<string, PaidDateInfo> = {}; // <-- Usar PaidDateInfo
                    data.paidDates.forEach((dateStr: string) => {
                        historyMap[dateStr] = { status: 'paid' }; // <-- Crear el objeto
                    });
                    setPaidDatesHistory(historyMap);
                }
            }
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err instanceof Error ? err.message : 'Error desconocido al cargar historial' });
        } finally {
            setLoadingHistory(false);
        }
    };
    
    fetchPaidDatesHistory();
  }, [choferId]); // Se re-ejecuta cuando cambia el chofer

  // --- Selección y Helpers ---
  const choferSeleccionado = choferes.find((c) => c.id_chofer === choferId);
  const vehiculoActivo = useMemo(() => {
      if (!choferSeleccionado?.vehiculo_asignado_id) return null;
      return vehiculos.find((v) => v.id_vehiculo === choferSeleccionado.vehiculo_asignado_id);
  }, [choferId, choferes, vehiculos]);

  // --- Helpers de Fechas (NUEVO) ---
  const isWeekend = (date: Date): boolean => {
      const day = date.getDay();
      return day === 0 || day === 6; // Domingo (0) o Sábado (6)
  };

  const isFeriado = (date: Date): boolean => {
      // Comparamos en formato YYYY-MM-DD
      const isoDate = date.toISOString().split('T')[0];
      return feriados.includes(isoDate);
  };

  const getTarifaParaDia = (date: Date): { tipo: 'normal' | 'especial', monto: number } => {
    if (!vehiculoActivo) return { tipo: 'normal', monto: 0 };
    
    const tarifaN = parseFloat(String(vehiculoActivo.tarifa_normal)) || 0;
    const tarifaE = parseFloat(String(vehiculoActivo.tarifa_especial)) || 0;

    if (isWeekend(date) || isFeriado(date)) {
        return { tipo: 'especial', monto: tarifaE };
    }
    return { tipo: 'normal', monto: tarifaN };
  };

  // --- ¡¡LÓGICA DE CÁLCULO DE JORNADA REESCRITA!! (Tu Paso 3) ---
  const montoCalculadoJornada = useMemo(() => {
    if (!vehiculoActivo || !selectedDates || selectedDates.length === 0) return 0;
    
    // Itera sobre cada fecha seleccionada, obtiene su tarifa requerida y la suma
    return selectedDates.reduce((total, date) => {
        const isoDate = date.toISOString().split('T')[0];
        
        // 1. Busca el día en el historial que cargó la API
        // 'history' es ahora (correctamente) tipo 'PaidDateInfo | undefined'
        const history = paidDatesHistory[isoDate]; // Ej: { status: 'partial', tarifa: 10000, pagado: 4000 }

        // 2. Comprueba si el día está en el historial Y su estado es 'partial'
        if (history?.status === 'partial') { // <-- ¡ESTO AHORA FUNCIONA!
            
            // 3. (Tu lógica) Si es parcial, calcula el saldo restante
            const tarifa = history.tarifa || 0;
            const pagado = history.pagado || 0;
            const saldoRestante = tarifa - pagado;
            
            // Sumamos solo el saldo restante (asegurándonos de que no sea negativo)
            return total + (saldoRestante > 0 ? saldoRestante : 0);
        } else {
            // 4. Si es un día nuevo, suma la tarifa completa
            return total + getTarifaParaDia(date).monto;
        }
    }, 0); // 0 es el 'total' inicial

  // ¡Importante! Añade 'paidDatesHistory' a la lista de dependencias
  }, [selectedDates, vehiculoActivo, feriados, paidDatesHistory]); 

  // --- Cálculos para Resumen (Actualizado) ---
  const totalPagadoEfectivamente = pagos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
  const totalGastos = gastos.reduce((sum, g) => sum + (parseFloat(g.monto) || 0), 0);
  const deudaActual = parseFloat(String(choferSeleccionado?.deuda_actual)) || 0;
  const deudaFinal = deudaActual + montoCalculadoJornada - totalGastos - totalPagadoEfectivamente;

  // --- Lógica de Status de Pago (NUEVO - Req 4) ---
  const pagoStatus: { texto: string, color: string, icon: React.ReactNode } = useMemo(() => {
    if (montoCalculadoJornada === 0) {
        return { texto: 'Sin rendir', color: 'bg-gray-100 text-gray-700', icon: <CircleDollarSign className="w-3 h-3" /> };
    }
    // Req 4: Lógica Amarillo/Rojo/Verde
    if (totalPagadoEfectivamente === 0) {
        return { texto: 'Pendiente de Pago', color: 'bg-red-100 text-red-700', icon: <BadgeAlert className="w-3 h-3" /> };
    }
    // ¡CAMBIO! Si el pago es menor al monto *requerido* (que puede ser un saldo)
    if (totalPagadoEfectivamente < montoCalculadoJornada) {
        return { texto: 'Pago Parcial', color: 'bg-yellow-100 text-yellow-700', icon: <BadgeAlert className="w-3 h-3" /> };
    }
    return { texto: 'Pagado', color: 'bg-green-100 text-green-700', icon: <BadgeCheck className="w-3 h-3" /> };
  }, [montoCalculadoJornada, totalPagadoEfectivamente]);


  // --- Handlers para Pagos (Simplificado) ---
  const handleAgregarPago = (montoInicial = '') => {
    setPagos([...pagos, {
        id: Date.now().toString(),
        monto: montoInicial,
        metodo: 'Efectivo',
    }]);
  };
  const handleEliminarPago = (id: string) => setPagos(pagos.filter((p) => p.id !== id));
  const handleActualizarPago = (id: string, campo: keyof Pago, valor: string) => {
    if ((campo === 'monto') && valor !== '' && !/^\d*\.?\d*$/.test(String(valor))) return;
    setPagos(pagos.map((p) => (p.id === id ? { ...p, [campo]: String(valor) } : p)));
  };

  // --- Handlers para Gastos (Sin cambios) ---
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

  // --- Handler para Guardar Rendición (Actualizado) ---
  const handleGuardarRendicion = async () => {
    setMensaje(null);
    if (!choferId) { setMensaje({ tipo: 'error', texto: 'Debe seleccionar un chofer' }); return; }
    if (!vehiculoActivo) { setMensaje({ tipo: 'error', texto: 'Chofer sin vehículo asignado' }); return; }
    if (montoCalculadoJornada <= 0 && pagos.filter(p => parseFloat(p.monto) > 0).length === 0 && gastos.filter(g => parseFloat(g.monto) > 0).length === 0) {
        setMensaje({ tipo: 'error', texto: 'Debe seleccionar días a rendir, o ingresar pagos/gastos.' });
        return;
    }
    
    // --- ¡BLOQUE DE VALIDACIÓN ELIMINADO! ---
    // Ya no bloqueamos si el pago es parcial.

    setIsSubmitting(true);

    // --- ¡NUEVO! Determinar el estado de este pago ---
    // (Tu Paso 4)
    // ¡CAMBIO! Si el pago es menor, Y el monto de la jornada es mayor a 0, es parcial.
    const paymentStatus: PaidDateStatus = (montoCalculadoJornada > 0 && totalPagadoEfectivamente < montoCalculadoJornada) ? 'partial' : 'paid';

    const datosParaApi = {
        choferId: choferId,
        vehiculoId: vehiculoActivo.id_vehiculo,
        diasRendidos: selectedDates?.map(date => date.toISOString().split('T')[0]) || [],
        pagos: pagos
                .filter(p => p.monto && parseFloat(p.monto) > 0)
                .map(({id, ...rest}) => ({
                    ...rest,
                    monto: parseFloat(rest.monto) || 0,
                })),
        gastos: gastos
                .filter(g => g.concepto && g.monto && parseFloat(g.monto) > 0)
                .map(({id, ...rest}) => ({...rest, monto: parseFloat(rest.monto)})),
        // ¡NUEVO! Enviamos el estado del pago (paid o partial)
        status: paymentStatus 
    };

    console.log("Enviando a /api/saveRendicion (Lógica Calendario):", datosParaApi);

    try {
        // Asumimos que /api/saveRendicion ahora acepta 'diasRendidos' y 'status'
        const response = await fetch('/api/saveRendicion', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(datosParaApi),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Error ${response.status}`);
        setMensaje({ tipo: 'success', texto: result.message || 'Rendición guardada' });

        // --- ¡LÓGICA DE ACTUALIZACIÓN DE HISTORIAL MODIFICADA! ---
        // Actualiza el historial local inmediatamente con el estado correcto (verde o amarillo)
        // Usamos una función para recargar el historial, es más seguro
        const reloadHistory = async () => {
             try {
                const response = await fetch(`/api/getPaidDates?choferId=${choferId}`);
                const data = await response.json();
                if (typeof data.paidDates === 'object' && data.paidDates !== null) {
                    setPaidDatesHistory(data.paidDates);
                }
             } catch (e) { console.error("Error recargando historial", e); }
        };
        reloadHistory(); // Recarga el historial desde la BD

        setTimeout(() => {
          // No reseteamos el choferId
          setSelectedDates([]); // Reseteamos el calendario
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

  // --- ¡¡CAMBIO CLAVE 1!! ---
  // Se actualiza 'modifiers' para usar los nuevos estados de 'paidDatesHistory'
  const modifiers = {
    especial: (date: Date) => isWeekend(date) || isFeriado(date), // Req 2
    
    // Req 4 (Verde): Días pagados completamente
    paid: (date: Date) => {
        const isoDate = date.toISOString().split('T')[0];
        return paidDatesHistory[isoDate]?.status === 'paid';
    },
    
    // Req 4 (Amarillo): Días con pago parcial
    partial: (date: Date) => {
        const isoDate = date.toISOString().split('T')[0];
        return paidDatesHistory[isoDate]?.status === 'partial';
    },
    
    // Req 1 (Rojo): Días pasados, no seleccionados, y no pagados (ni total ni parcial)
    pasado: (date: Date) => {
        const isoDate = date.toISOString().split('T')[0];
        const isSelected = selectedDates?.find(d => d.toISOString().split('T')[0] === isoDate);
        // ¡CAMBIO! Solo es "pasado" si NO está en el historial
        const isPaidOrPartial = paidDatesHistory[isoDate]; 
        return date < today && !isSelected && !isPaidOrPartial; 
    },
  };
  
  // --- ¡¡CAMBIO CLAVE 2!! ---
  // (Este cambio es de la vez anterior, conectando a tu CSS)
  const modifiersClassNames = {
    especial: 'calendar-day-especial', // Usará tu CSS
    pasado: 'calendar-day-pasado',     // Usará tu CSS
    paid: 'calendar-day-paid',         // Usará tu CSS
    partial: 'calendar-day-partial',   // Usará tu CSS
    selected: 'calendar-day-selected', // Usará tu CSS
    today: 'calendar-day-today'        // Usará tu CSS
  };
  // --- FIN DEL CAMBIO CLAVE ---


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

      {/* Card Principal: Chofer, Vehículo, CALENDARIO (MODIFICADO) */}
      <Card>
        <CardHeader><CardTitle>Información de la Jornada Rendida</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Selectores Chofer y Vehículo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="chofer">Chofer</Label>
                {loadingChoferes ? (<p className="text-sm text-gray-500">Cargando...</p>) : (
                <Select value={choferId} onValueChange={(value) => {setChoferId(value); setSelectedDates([]); setPagos([]); setGastos([]);}} disabled={isSubmitting}>
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
                        Tarifas: N ${ parseFloat(String(vehiculoActivo.tarifa_normal)||"0").toLocaleString('es-AR') } / E ${ parseFloat(String(vehiculoActivo.tarifa_especial)||"0").toLocaleString('es-AR') }
                    </div>
                 )}
            </div>
          </div>

          {/* Calendario para Días Jornada (NUEVO) */}
          {choferId && vehiculoActivo && !loadingVehiculos && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t mt-4">
                {/* Columna del Calendario */}
                <div className="flex flex-col items-center">
                    <Label className="text-sm font-medium mb-2">Seleccione los días a rendir</Label>
                    {/* Req 1: Muestra 'Cargando...' mientras se carga el historial */}
                    {loadingHistory ? (<Loader2 className="h-8 w-8 animate-spin" />) : (
                    <Calendar
                        mode="multiple" // Permite seleccionar múltiples días
                        selected={selectedDates}
                        onSelect={setSelectedDates}
                        // --- ¡¡CAMBIO CLAVE 3!! ---
                        // Deshabilita días futuros Y días YA PAGADOS (verde)
                        // AHORA PERMITE CLICKEAR DÍAS 'PARTIAL' (amarillo)
                        disabled={(date) => {
                            const isoDate = date.toISOString().split('T')[0];
                            // Deshabilita si es futuro O si su estado es 'paid'
                            return date > today || paidDatesHistory[isoDate]?.status === 'paid'; 
                        }}
                        locale={es} // Muestra el calendario en español
                        month={currentMonth}
                        onMonthChange={setCurrentMonth}
                        modifiers={modifiers} // Aplica lógica de 'especial', 'pasado', 'paid' y 'partial'
                        modifiersClassNames={modifiersClassNames} // ¡¡AQUÍ ESTÁ EL CAMBIO!!
                        className="rounded-md border p-0"
                    />
                    )}
                    {/* Leyenda del Calendario Actualizada */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                        <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-1"></span>Día Pasado</span>
                        <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-purple-200 mr-1"></span>Fin de/Feriado</span>
                        <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-100 mr-1"></span>Día Pagado</span>
                        {/* ¡NUEVO! Leyenda para pago parcial (Amarillo) */}
                        <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-yellow-100 mr-1"></span>Pago Parcial</span>
                        <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-600 mr-1"></span>Seleccionado</span>
                    </div>
                </div>

                {/* Columna de Resumen de Jornada */}
                <div className="space-y-3">
                    <Label className="text-sm font-medium">Resumen de la Jornada</Label>
                    <div className="p-3 border rounded-lg bg-gray-50 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Días seleccionados:</span>
                            <span className="font-semibold text-blue-700">{selectedDates?.length || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Monto Jornada:</span>
                            <span className="font-semibold text-lg text-blue-700">
                                ${montoCalculadoJornada.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-sm text-gray-600">Estado del Pago:</span>
                            {/* Req 4: Badge de estado (Verde/Amarillo/Rojo) */}
                            <Badge className={`${pagoStatus.color} px-2 py-0.5`}>
                                {pagoStatus.icon}
                                <span className="ml-1">{pagoStatus.texto}</span>
                            </Badge>
                        </div>
                    </div>
                     <p className="text-xs text-gray-500">
                        {/* Texto actualizado */}
                        Nota: Si el pago es parcial, los días se marcarán en amarillo.
                        Si es completo, se marcarán en verde.
                    </p>
                </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sección de Pagos (SIMPLIFICADA) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Registro de Pagos</CardTitle>
            <Button onClick={()=>handleAgregarPago()} size="sm" variant="outline" disabled={isSubmitting || !choferId}>
              <Plus className="w-4 h-4 mr-1" /> Agregar Pago
            </Button>
          </div>
           <p className="text-xs text-gray-500 pt-1">Registre el dinero entregado para cubrir la jornada.</p>
        </CardHeader>
        <CardContent>
          {pagos.length === 0 ? ( <p className="text-sm text-gray-500 text-center py-3">No hay pagos registrados.</p> )
           : (
            <div className="space-y-3">
              {/* Encabezados Opcionales para Desktop */}
              <div className="hidden md:grid md:grid-cols-12 gap-2 text-xs text-gray-500 px-3 font-medium border-b pb-1 mb-2">
                  <div className="md:col-span-8">Monto Pagado</div>
                  <div className="md:col-span-3">Método</div>
                  <div className="md:col-span-1"></div>
              </div>
              {/* Filas de Pago */}
              {pagos.map((pago) => {
                 const tarifaN = parseFloat(String(vehiculoActivo?.tarifa_normal)) || 0;
                 const tarifaE = parseFloat(String(vehiculoActivo?.tarifa_especial)) || 0;
                 return (
                    <div key={pago.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-lg dynamic-row border">
                    {/* Monto Pagado + Botones */}
                    <div className="md:col-span-8 space-y-1">
                        <Label htmlFor={`monto-${pago.id}`} className="text-xs text-gray-600 md:hidden">Monto Pagado</Label>
                        <div className="flex items-center space-x-1">
                            <div className="relative flex-grow">
                                <Input id={`monto-${pago.id}`} type="number" step="0.01" value={pago.monto} placeholder="0.00" disabled={isSubmitting}
                                        onChange={(e) => handleActualizarPago(pago.id, 'monto', e.target.value)} className="pl-7"/>
                            </div>
                            <Button type="button" size="sm" variant="outline" className="px-2 h-9 text-xs" title={`Normal ($${tarifaN})`}
                                    disabled={!vehiculoActivo || isSubmitting} onClick={()=> handleActualizarPago(pago.id, 'monto', tarifaN.toFixed(2))}> N </Button>
                             <Button type="button" size="sm" variant="outline" className="px-2 h-9 text-xs" title={`Especial ($${tarifaE})`}
                                    disabled={!vehiculoActivo || isSubmitting} onClick={()=> handleActualizarPago(pago.id, 'monto', tarifaE.toFixed(2))}> E </Button>
                             {/* Botón para autocompletar el total de la jornada */}
                             <Button type="button" size="sm" variant="outline" className="px-2 h-9 text-xs" title={`Total Jornada ($${montoCalculadoJornada})`}
                                    disabled={!vehiculoActivo || isSubmitting || montoCalculadoJornada === 0} 
                                    onClick={()=> handleActualizarPago(pago.id, 'monto', montoCalculadoJornada.toFixed(2))}> Total </Button>
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

      {/* Sección de Gastos (Sin cambios) */}
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
                 : ( <div className="space-y-2">{gastos.map((gasto) => ( <div key={gasto.id} className="flex items-center space-x-2 dynamic-row"> <div className="flex-1"> <Input type="text" value={gasto.concepto} placeholder="Concepto" disabled={isSubmitting} onChange={(e) => handleActualizarGasto(gasto.id, 'concepto', e.target.value)} /> </div> <div className="flex-1 relative"> <Input type="number" step="0.01" value={gasto.monto} placeholder="Monto" disabled={isSubmitting} onChange={(e) => handleActualizarGasto(gasto.id, 'monto', e.target.value)} className="pl-7"/> </div> <Button variant="ghost" size="icon" onClick={() => handleEliminarGasto(gasto.id)} className="h-8 w-8 text-red-500 hover:bg-red-50" disabled={isSubmitting}> <X className="w-4 h-4" /> </Button> </div> ))} <div className="flex justify-end pt-2 border-t"> <div className="text-right text-sm"> <span className="text-gray-600">Total Gastos: </span> <span className="font-medium text-red-600">${totalGastos.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span> </div> </div> </div> )}
            </CardContent>
      </Card>

      {/* Resumen y Botón Guardar (Actualizado para reflejar la nueva lógica) */}
      <Card className="bg-gray-50">
            <CardContent className="pt-4 space-y-2">
            {choferId && vehiculoActivo && (
                <>
                    <div className="flex justify-between items-center text-sm"> <span className="text-gray-600">Deuda Anterior:</span> <span className={deudaActual > 0 ? 'text-red-600' : deudaActual < 0 ? 'text-green-600' : 'text-gray-700'}> ${deudaActual.toLocaleString('es-AR', {minimumFractionDigits: 2})} </span> </div>
                    <div className="flex justify-between items-center text-sm"> <span className="text-gray-600">Monto Jornada (Calendario):</span> <span>+ ${montoCalculadoJornada.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span> </div>
                    <div className="flex justify-between items-center text-sm"> <span className="text-gray-600">Total Pagado:</span> <span className="text-green-600">- ${totalPagadoEfectivamente.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span> </div>
                    <div className="flex justify-between items-center text-sm"> <span className="text-gray-600">Total Gastos:</span> <span className="text-red-600">- ${totalGastos.toLocaleString('es-AR', {minimumFractionDigits: 2})}</span> </div>
                    <div className="border-t pt-2 mt-2 flex justify-between items-center font-semibold"> <span className="text-gray-800">Deuda Final Estimada:</span> <span className={`${deudaFinal > 0 ? 'text-red-600' : deudaFinal < 0 ? 'text-green-600' : 'text-gray-800'}`}> ${deudaFinal.toLocaleString('es-AR', {minimumFractionDigits: 2})} </span> </div>
                </>
            )}
            <Button onClick={handleGuardarRendicion} className="w-full mt-4 bg-blue-600 hover:bg-blue-700" 
                    disabled={isSubmitting || !choferId || loadingChoferes || loadingVehiculos || (selectedDates?.length === 0 && pagos.length === 0 && gastos.length === 0) || loadingHistory}>
                {isSubmitting ? ( <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando... </> ) 
                 : loadingHistory ? ( <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando Historial... </> )
                 : ( 'Guardar Rendición' )}
            </Button>
            </CardContent>
      </Card>
    </div>
  );
}

