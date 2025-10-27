// src/pages/CajaPage.tsx (Con Date Picker)

import React, { useState, useEffect } from 'react';
import { Wallet, DollarSign, TrendingUp, Calendar as CalendarIcon, Loader2, RefreshCw } from 'lucide-react'; // Renombrado Calendar a CalendarIcon
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// Nuevas importaciones para Date Picker
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar"; // El componente de Shadcn
import { format } from "date-fns"; // Para formatear fechas
import { es } from 'date-fns/locale'; // Para formato español

// --- Tipos de Datos (Sin cambios) ---
interface Transaccion { /* ... */ }
interface TotalesCaja { /* ... */ }
interface CajaData { /* ... */ }

export function CajaPage() {
  // --- Estados ---
  const [dataCaja, setDataCaja] = useState<CajaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ¡NUEVO ESTADO PARA LA FECHA SELECCIONADA! Usa tipo Date | undefined
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | undefined>(new Date()); // Inicia con hoy

  // --- Función para Cargar Datos (Modificada para usar fecha seleccionada) ---
  const fetchCajaDia = async (fecha?: Date) => { // Acepta Date
      setLoading(true);
      setError(null);
      let fechaQuery = '';
      if (fecha) {
          try {
              fechaQuery = format(fecha, "yyyy-MM-dd"); // Formatea a YYYY-MM-DD
          } catch (e) {
              console.error("Error formateando fecha:", e);
              setError("Fecha seleccionada inválida.");
              setLoading(false);
              return; // No continuar si la fecha es inválida
          }
      }

      try {
        let apiUrl = '/api/getCajaDia';
        if (fechaQuery) {
          apiUrl += `?fecha=${fechaQuery}`; // Añade fecha al query si existe
        }
        console.log("Llamando a:", apiUrl);

        const response = await fetch(apiUrl);
        if (!response.ok) { /* ... manejo de error ... */
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Error HTTP: ${response.status}`);
        }
        const data: CajaData = await response.json();
        console.log("Datos recibidos:", data);

        if (data && data.fecha && Array.isArray(data.transacciones) && data.totales) {
            setDataCaja(data);
            // Actualiza fechaSeleccionada si la API devuelve una fecha diferente (ej, si no se pasó query)
            if (fechaQuery !== data.fecha) {
                 try {
                     setFechaSeleccionada(new Date(`${data.fecha}T00:00:00-03:00`)); // Asume UTC-3
                 } catch (parseError) { console.error("Error parseando fecha de API:", data.fecha, parseError);}
            }
        } else { throw new Error("Formato de respuesta inesperado."); }

      } catch (e) { /* ... manejo de error ... */
        console.error("Error al obtener datos de caja:", e);
        setError(e instanceof Error ? e.message : String(e));
        setDataCaja(null);
      } finally {
        setLoading(false);
      }
    };

  // Carga inicial (hoy)
  useEffect(() => {
    fetchCajaDia(fechaSeleccionada); // Pasa la fecha inicial
  }, []); // Carga solo al montar

  // Handler para recargar o cuando cambia la fecha
  const handleDateChangeAndRefresh = (nuevaFecha?: Date) => {
      setFechaSeleccionada(nuevaFecha); // Actualiza el estado
      fetchCajaDia(nuevaFecha); // Llama a la API con la nueva fecha
  };

  // --- Variables para Renderizado ---
  const { transacciones = [], totales = null } = dataCaja || {};

  // Formatear fecha para mostrar (usa fechaSeleccionada)
   const fechaFormateada = fechaSeleccionada
    ? format(fechaSeleccionada, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }) // Formato español
    : 'Seleccione fecha';

  // --- JSX ---
  return (
    <div className="max-w-7xl mx-auto space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 space-y-2 md:space-y-0">
        <div className="flex items-center space-x-2">
          {/* ... Icono y Título ... */}
          <Wallet className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Resumen de Caja</h2>
            <p className="text-sm text-gray-500 capitalize">{fechaFormateada}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
             {/* --- DATE PICKER CON POPOVER --- */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-[280px] justify-start text-left font-normal" disabled={loading}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fechaSeleccionada ? format(fechaSeleccionada, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={fechaSeleccionada}
                        onSelect={(date) => handleDateChangeAndRefresh(date)} // Llama al handler al seleccionar
                        initialFocus
                        locale={es} // Calendario en español
                    />
                </PopoverContent>
            </Popover>
            {/* --- FIN DATE PICKER --- */}
            <Button variant="outline" size="icon" onClick={() => handleDateChangeAndRefresh(fechaSeleccionada)} disabled={loading} title="Recargar">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             </Button>
        </div>
      </div>

      {/* Mensaje de Error */}
      {error && !loading && ( <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> )}

      {/* Cards y Tabla (JSX sin cambios lógicos, solo usa 'totales' y 'transacciones' del estado) */}
       {/* Cards de Resumen */}
      {loading ? ( <div className="text-center text-gray-500 py-4"><Loader2 className="h-6 w-6 animate-spin inline-block mr-2"/>Cargando resumen...</div> )
       : !totales ? ( <p className="text-center text-gray-500 py-4">No se pudo cargar el resumen.</p> )
       : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card Efectivo */}
          <Card className="border-l-4 border-green-500">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-gray-500 uppercase">Efectivo</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">${(totales.efectivo || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</p></CardContent>
          </Card>
          {/* Card Transferencia */}
          <Card className="border-l-4 border-blue-500">
             <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-gray-500 uppercase">Transferencia</CardTitle></CardHeader>
             <CardContent><p className="text-2xl font-bold">${(totales.transferencia || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</p></CardContent>
          </Card>
          {/* Card Mercado Pago */}
          <Card className="border-l-4 border-cyan-500">
             <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-gray-500 uppercase">Mercado Pago</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">${(totales.mercadoPago || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</p></CardContent>
          </Card>
          {/* Card Gastos */}
          <Card className="border-l-4 border-red-500">
             <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-gray-500 uppercase">Gastos</CardTitle></CardHeader>
             <CardContent><p className="text-2xl font-bold">${(totales.gastos || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</p></CardContent>
          </Card>
        </div>
      )}
       {/* Resumen Total */}
       {loading ? null : totales && (
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
        <CardHeader><CardTitle>Detalle de Transacciones</CardTitle></CardHeader> {/* Removido "del Día" */}
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Hora</TableHead>
                  <TableHead>Chofer</TableHead>
                  <TableHead className="w-[100px]">Tipo</TableHead>
                  <TableHead>Método / Concepto</TableHead>
                  <TableHead className="text-right w-[120px]">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    <tr><td colSpan={5} className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin inline-block mr-2"/>Cargando...</td></tr>
                ) : error ? (
                    <tr><td colSpan={5} className="text-center text-red-600 py-4">Error al cargar. Intente recargar.</td></tr>
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