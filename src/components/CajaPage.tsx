// src/pages/CajaPage.tsx (Con Date Picker Funcional)

import React, { useState, useEffect } from 'react';
import { Wallet, DollarSign, TrendingUp, Calendar as CalendarIcon, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Ajusta rutas si es necesario
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// Importaciones para Date Picker
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from 'date-fns/locale';

// --- Tipos de Datos ---
interface Transaccion {
  id: string;
  hora: string;
  chofer: string;
  tipo: 'pago' | 'gasto';
  metodo?: string;
  concepto?: string;
  monto: number;
}
interface TotalesCaja {
    efectivo: number;
    transferencia: number;
    mercadoPago: number;
    gastos: number;
    pagos: number;
    neto: number;
}
interface CajaData {
    fecha: string; // YYYY-MM-DD (recibido de la API)
    transacciones: Transaccion[];
    totales: TotalesCaja;
}

export function CajaPage() {
  // --- Estados ---
  const [dataCaja, setDataCaja] = useState<CajaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Estado para la fecha seleccionada (Date | undefined)
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | undefined>(new Date()); // Inicia con hoy

  // --- Función para Cargar Datos (Usa Date) ---
  const fetchCajaDia = async (fecha?: Date) => {
      setLoading(true);
      setError(null);
      let fechaQuery = '';
      if (fecha) {
          try {
              // Formatea la fecha seleccionada a YYYY-MM-DD para la API
              fechaQuery = format(fecha, "yyyy-MM-dd");
          } catch (e) {
              console.error("Error formateando fecha para API:", e);
              setError("Fecha seleccionada inválida.");
              setLoading(false);
              setDataCaja(null); // Limpia datos si la fecha es mala
              return;
          }
      } else {
          // Si no hay fecha, podríamos decidir cargar hoy por defecto o mostrar error
          // Por ahora, dejamos que la API use su lógica de "hoy" si fechaQuery está vacío
          console.log("No se proporcionó fecha, la API usará la fecha actual.");
      }

      try {
        let apiUrl = '/api/getCajaDia';
        if (fechaQuery) {
          apiUrl += `?fecha=${fechaQuery}`; // Añade fecha al query si existe
        }
        console.log("Llamando a:", apiUrl);

        const response = await fetch(apiUrl);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `Error HTTP ${response.status}`}));
          throw new Error(errorData.error || `Error HTTP: ${response.status}`);
        }
        const data: CajaData = await response.json();
        console.log("Datos recibidos:", data);

        // Validar data antes de setear
        if (data && data.fecha && Array.isArray(data.transacciones) && data.totales) {
            setDataCaja(data);
            // Sincroniza el estado fechaSeleccionada con la fecha devuelta por la API
            // Es importante añadir T00:00:00 para evitar problemas de zona horaria al crear el Date
            try {
                 // Usamos UTC para evitar cambios de día por zona horaria del navegador
                 const [year, month, day] = data.fecha.split('-').map(Number);
                 setFechaSeleccionada(new Date(Date.UTC(year, month - 1, day)));
            } catch(parseError){
                console.error("Error parseando fecha de API para estado:", data.fecha, parseError);
                // Mantenemos la fecha que estaba o reseteamos a hoy si falla
                // setFechaSeleccionada(new Date());
            }

        } else {
            console.error("Formato de respuesta inesperado:", data);
            throw new Error("Formato de respuesta inesperado de la API.");
        }

      } catch (e) {
        console.error("Error al obtener datos de caja:", e);
        setError(e instanceof Error ? e.message : String(e));
        setDataCaja(null); // Limpia datos en caso de error
      } finally {
        setLoading(false);
      }
    };

  // Carga inicial (hoy)
  useEffect(() => {
    fetchCajaDia(fechaSeleccionada); // Pasa la fecha inicial (hoy)
  }, []); // Carga solo al montar

  // Handler para cuando se selecciona una fecha en el calendario
  const handleDateSelect = (nuevaFecha?: Date) => {
      if (nuevaFecha) {
          setFechaSeleccionada(nuevaFecha); // Actualiza el estado
          fetchCajaDia(nuevaFecha); // Llama a la API con la nueva fecha
      }
  };

   // Handler para recargar datos de la fecha actual
   const handleRefresh = () => {
       fetchCajaDia(fechaSeleccionada);
   };


  // --- Variables para Renderizado ---
  const { transacciones = [], totales = null } = dataCaja || {};

  // Formatear fecha para mostrar (usa fechaSeleccionada que es Date)
   const fechaFormateadaDisplay = fechaSeleccionada
    ? format(fechaSeleccionada, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
    : 'Seleccione fecha';


  // --- JSX ---
  return (
    <div className="max-w-7xl mx-auto space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 space-y-2 md:space-y-0">
        <div className="flex items-center space-x-2">
          <Wallet className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Resumen de Caja</h2>
            {/* Muestra la fecha formateada del estado */}
            <p className="text-sm text-gray-500 capitalize">{loading ? 'Cargando fecha...' : fechaFormateadaDisplay}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
            {/* --- DATE PICKER CON POPOVER --- */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        size="sm"
                        className={`w-[280px] justify-start text-left font-normal ${!fechaSeleccionada && "text-muted-foreground"}`}
                        disabled={loading}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fechaSeleccionada ? format(fechaSeleccionada, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={fechaSeleccionada}
                        onSelect={handleDateSelect} // Llama al handler al seleccionar
                        initialFocus
                        locale={es} // Calendario en español
                        disabled={loading} // Deshabilita mientras carga
                    />
                </PopoverContent>
            </Popover>
            {/* --- FIN DATE PICKER --- */}
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading} title="Recargar">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             </Button>
        </div>
      </div>

      {/* Mensaje de Error */}
       {error && !loading && ( <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> )}

      {/* Cards de Resumen */}
      {loading ? ( <div className="text-center text-gray-500 py-4"><Loader2 className="h-6 w-6 animate-spin inline-block mr-2"/>Cargando resumen...</div> )
       : !totales ? ( <p className="text-center text-gray-500 py-4">No se pudo cargar el resumen para esta fecha.</p> ) // Mensaje si totales es null
       : (
        // ... JSX de las 4 Cards de Resumen (sin cambios) ...
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-green-500"><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-gray-500 uppercase">Efectivo</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">${(totales.efectivo || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</p></CardContent></Card>
          <Card className="border-l-4 border-blue-500"><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-gray-500 uppercase">Transferencia</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">${(totales.transferencia || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</p></CardContent></Card>
          <Card className="border-l-4 border-cyan-500"><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-gray-500 uppercase">Mercado Pago</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">${(totales.mercadoPago || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</p></CardContent></Card>
          <Card className="border-l-4 border-red-500"><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-gray-500 uppercase">Gastos</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">${(totales.gastos || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</p></CardContent></Card>
        </div>
      )}

      {/* Resumen Total */}
       {loading ? null : totales && (
           // ... JSX del Resumen Total (sin cambios) ...
           <Card className="bg-gray-800 text-white border-gray-700">
             <CardContent className="pt-4 md:pt-6">
                 <div className="grid grid-cols-3 gap-4 text-center">
                     <div><p className="text-xs text-gray-400 mb-1 uppercase">Ingresos</p><p className="text-lg font-semibold">${(totales.pagos || 0).toLocaleString('es-AR')}</p></div>
                     <div><p className="text-xs text-gray-400 mb-1 uppercase">Gastos</p><p className="text-lg font-semibold">${(totales.gastos || 0).toLocaleString('es-AR')}</p></div>
                     <div><p className="text-xs text-gray-400 mb-1 uppercase">Neto Día</p><p className={`text-lg font-semibold ${(totales.neto || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>${(totales.neto || 0).toLocaleString('es-AR')}</p></div>
                 </div>
             </CardContent>
           </Card>
       )}

      {/* Detalle de Transacciones */}
      <Card>
        <CardHeader><CardTitle>Detalle de Transacciones</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                {/* ... JSX TableHeader sin cambios ... */}
                <TableRow>
                  <TableHead className="w-[80px]">Hora</TableHead>
                  <TableHead>Chofer</TableHead>
                  <TableHead className="w-[100px]">Tipo</TableHead>
                  <TableHead>Método / Concepto</TableHead>
                  <TableHead className="text-right w-[120px]">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* ... JSX TableBody con loading/error/no data/map sin cambios ... */}
                {loading ? (
                    <tr><td colSpan={5} className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin inline-block mr-2"/>Cargando...</td></tr>
                ) : error ? (
                    <tr><td colSpan={5} className="text-center text-red-600 py-4">Error al cargar transacciones. Intente recargar.</td></tr>
                ) : transacciones.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-gray-500 py-4">No hay transacciones para la fecha seleccionada.</td></tr>
                ) : (
                  transacciones.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs text-gray-600">{t.hora}</TableCell>
                      <TableCell>{t.chofer}</TableCell>
                      <TableCell>
                        <Badge variant={t.tipo === 'pago' ? 'default' : 'destructive'} className={t.tipo === 'pago' ? 'bg-green-100 text-green-800' : ''}>
                          {t.tipo === 'pago' ? 'Pago' : 'Gasto'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {t.tipo === 'pago' ? (
                          <Badge variant="outline" className="capitalize text-xs px-1.5 py-0.5">
                            {t.metodo || 'N/A'}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-700">{t.concepto}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={t.tipo === 'pago' ? 'text-green-600' : 'text-red-600'}>
                          {t.tipo === 'pago' ? '+' : '-'}$
                          {t.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
           {/* Footer Opcional */}
            {!loading && !error && transacciones.length > 0 && totales && (
                 // ... JSX Footer sin cambios ...
                 <div className="mt-4 flex flex-col sm:flex-row justify-between items-center px-1 text-sm">
                    <span className="text-gray-600 mb-2 sm:mb-0"> Total: {transacciones.length} transacciones </span>
                    <div className="text-right font-semibold">
                    <span className="text-gray-600">Balance del día: </span>
                    <span className={totales.neto >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ${totales.neto.toLocaleString('es-AR', {minimumFractionDigits: 2})}
                    </span>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>

    </div>
  );
}