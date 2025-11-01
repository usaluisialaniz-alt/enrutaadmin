import React, { useState, useEffect, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wallet, DollarSign, TrendingUp, Calendar as CalendarIcon, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button'; // Importa Button normal
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar"; // Cambia a tu componente personalizado (sin Tailwind)
import { format, startOfDay } from "date-fns"; // Agrega startOfDay para normalizar a UTC
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils"; // Asegúrate que src/lib/utils.ts exista

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
    fecha: string; // YYYY-MM-DD
    transacciones: Transaccion[];
    totales: TotalesCaja;
}

export function CajaPage() {
  // --- Estados ---
  const [dataCaja, setDataCaja] = useState<CajaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | undefined>(startOfDay(new Date())); // Normaliza a UTC al inicio
  const [popoverOpen, setPopoverOpen] = useState(false); // Controla si el Popover está abierto
  const [selectedChofer, setSelectedChofer] = useState(''); // '' = Todos

  const choferesUnicos = useMemo(() => {
  // 1. Obtiene las transacciones del estado, o un array vacío si no hay
  const transacciones = dataCaja?.transacciones || [];
  // 2. Mapea para obtener solo los nombres
  const nombres = transacciones.map(r => r.chofer);
  // 3. Usa 'Set' para obtener solo los únicos
  const unicos = [...new Set(nombres)];
  // 4. Ordena alfabéticamente
  return unicos.sort((a, b) => a.localeCompare(b));
  }, [dataCaja]); // ¡La dependencia es 'dataCaja'!

  // --- Función para Cargar Datos ---
  const fetchCajaDia = async (fecha?: Date) => {
      console.log("fetchCajaDia llamado con fecha:", fecha);
      setLoading(true);
      setError(null);
      let fechaQuery = '';
      const fechaParaQuery = fecha || startOfDay(new Date()); // Normaliza a UTC si no hay fecha
      try {
          fechaQuery = format(fechaParaQuery, "yyyy-MM-dd"); // Usa zona horaria local para coincidir con la API
      } catch (e) {
          console.error("Error formateando fecha para API:", e);
          setError("Fecha seleccionada inválida."); setLoading(false); setDataCaja(null); return;
      }

      try {
        let apiUrl = '/api/getCajaDia';
        if (fechaQuery) apiUrl += `?fecha=${fechaQuery}`;
        console.log("Llamando a API:", apiUrl);

        const response = await fetch(apiUrl);
        if (!response.ok) {
          // CORREGIDO: Se eliminaron los paréntesis extra ()()
          const errorData = await response.json().catch(() => ({ error: `Error HTTP ${response.status}` }));
          throw new Error(errorData.error || `Error HTTP: ${response.status}`);
        }
        const data: CajaData = await response.json();
        console.log("Datos de caja recibidos:", data);

        if (data && data.fecha && Array.isArray(data.transacciones) && data.totales) {
            setDataCaja(data);
            try {
                 const [year, month, day] = data.fecha.split('-').map(Number);
                 const fechaApiLocal = new Date(year, month - 1, day); // Crea Date en zona horaria local para evitar conversión
                 if (!fechaSeleccionada || format(fechaApiLocal, 'yyyyMMdd') !== format(fechaSeleccionada, 'yyyyMMdd')) {
                    console.log(`Sincronizando fechaSeleccionada desde API: ${data.fecha} ->`, fechaApiLocal);
                    setFechaSeleccionada(fechaApiLocal);
                 } else { console.log("Fecha API coincide, no se actualiza estado Date."); }
            } catch(parseError){ console.error("Error parseando fecha API:", data.fecha, parseError); }
        } else { throw new Error("Formato de respuesta inesperado."); }
      } catch (e) {
        console.error("Error completo en fetchCajaDia:", e);
        setError(e instanceof Error ? e.message : String(e)); setDataCaja(null);
      } finally {
        setLoading(false);
      }
    };

  // Carga inicial
  useEffect(() => { fetchCajaDia(fechaSeleccionada); }, []);

  // Handler Date Picker
  const handleDateSelect = (nuevaFecha?: Date) => {
      console.log("handleDateSelect llamado con:", nuevaFecha); // Log
      setPopoverOpen(false); // Cierra al seleccionar
      if (nuevaFecha) {
          const fechaNormalizada = startOfDay(nuevaFecha); // Normaliza a UTC (inicio del día)
          console.log("Fecha normalizada a UTC:", fechaNormalizada); // Log para verificar
          if (!fechaSeleccionada || format(fechaNormalizada, 'yyyyMMdd') !== format(fechaSeleccionada, 'yyyyMMdd')) {
              console.log("Nueva fecha diferente, actualizando y llamando API..."); // Log
              setFechaSeleccionada(fechaNormalizada);
              fetchCajaDia(fechaNormalizada);
          } else { console.log("Selección cancelada o misma fecha."); }
      }
  };

   // Handler Recargar
   const handleRefresh = () => { fetchCajaDia(fechaSeleccionada); };

  // --- Variables Renderizado ---
  const { transacciones = [], totales = null } = dataCaja || {};
  const fechaFormateadaDisplay = fechaSeleccionada
    ? format(fechaSeleccionada, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
    : 'Seleccione fecha';

  // --- Lógica de Filtrado Chofer---
  const transaccionesFiltradas = transacciones.filter((registro) => {
    if (!selectedChofer) return true; // Si no hay filtro ('' = Todos), muestra todo
    return registro.chofer === selectedChofer;
  });

  // --- JSX ---
  return (
    <div className="max-w-7xl mx-auto space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 space-y-2 md:space-y-0">
         <div className="flex items-center space-x-2">
            <Wallet className="w-6 h-6 text-blue-600" />
            <div>
                <h2 className="text-xl font-semibold text-gray-800">Resumen de Caja</h2>
                <p className="text-sm text-gray-500 capitalize">{loading && !dataCaja ? 'Cargando fecha...' : fechaFormateadaDisplay}</p>
            </div>
         </div>
         <div className="flex items-center space-x-2">
            {/* --- DATE PICKER SIN asChild --- */}
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger disabled={loading}>
                     {/* Button DENTRO del Trigger */}
                     <Button
                        variant={"outline"}
                        size="sm"
                        className={cn(
                            "w-[240px] md:w-[280px] justify-start text-left font-normal",
                            !fechaSeleccionada && "text-muted-foreground"
                        )}
                        // Añadido log onClick para depuración
                        onClick={() => console.log("Clic en botón Trigger DatePicker")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fechaSeleccionada ? format(fechaSeleccionada, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={fechaSeleccionada}
                        onSelect={handleDateSelect}
                        defaultMonth={fechaSeleccionada} // Agrega esto para abrir en el mes de la fecha seleccionada
                        initialFocus
                        locale={es}
                        disabled={loading}
                    />
                </PopoverContent>
            </Popover>
            <Select
              value={selectedChofer}
              onValueChange={(value) => setSelectedChofer(value === "todos" ? "" : value)}
              disabled={loading || choferesUnicos.length === 0}
            >
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Filtrar Chofer..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Choferes</SelectItem>
                {choferesUnicos.map((chofer) => (
                  <SelectItem key={chofer} value={chofer}>
                    {chofer}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        : !totales ? ( <p className="text-center text-gray-500 py-4">No hay datos de resumen para esta fecha.</p> )
        : (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           {/* ... Cards ... */}
           <Card className="border-l-4 border-green-500"><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-gray-500 uppercase">Efectivo</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">${(totales.efectivo || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</p></CardContent></Card>
           <Card className="border-l-4 border-blue-500"><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-gray-500 uppercase">Transferencia</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">${(totales.transferencia || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</p></CardContent></Card>
           <Card className="border-l-4 border-cyan-500"><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-gray-500 uppercase">Mercado Pago</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">${(totales.mercadoPago || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</p></CardContent></Card>
           <Card className="border-l-4 border-red-500"><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-gray-500 uppercase">Gastos</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">${(totales.gastos || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</p></CardContent></Card>
         </div>
       )}

       {/* Resumen Total */}
        {loading ? null : totales && (
            <Card className="bg-gray-800 text-white border-gray-700">
              <CardContent className="pt-4 md:pt-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                       {/* ... Resumen ... */}
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
                   <TableRow>
                     <TableHead className="w-[80px]">Hora</TableHead> <TableHead>Chofer</TableHead> <TableHead className="w-[100px]">Tipo</TableHead> <TableHead>Método / Concepto</TableHead> <TableHead className="text-right w-[120px]">Monto</TableHead>
                   </TableRow>
               </TableHeader>
               <TableBody>
                 {loading ? ( <tr><td colSpan={5} className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin inline-block mr-2"/>Cargando...</td></tr> )
                  : error ? ( <tr><td colSpan={5} className="text-center text-red-600 py-4">Error al cargar. Intente recargar.</td></tr> )
                  : transacciones.length === 0 ? ( <tr><td colSpan={5} className="text-center text-gray-500 py-4">No hay transacciones para la fecha.</td></tr> )
                  : ( transacciones.map((t) => ( <TableRow key={t.id}>
                       <TableCell className="text-xs text-gray-600">{t.hora}</TableCell>
                       <TableCell>{t.chofer}</TableCell>
                       <TableCell><Badge variant={t.tipo === 'pago' ? 'default' : 'destructive'} className={`${t.tipo === 'pago' ? 'bg-green-100 text-green-800' : ''} text-xs`}>{t.tipo === 'pago' ? 'Pago' : 'Gasto'}</Badge></TableCell>
                       <TableCell>{t.tipo === 'pago' ? (<Badge variant="outline" className="capitalize text-xs px-1.5 py-0.5">{String(t.metodo)?.toLowerCase() === 'efectivo' ? 'Efectivo' : String(t.metodo)?.toLowerCase() === 'transferencia' ? 'Transferencia' : String(t.metodo)?.toLowerCase() === 'mercadopago' ? 'Mercado Pago' : (t.metodo || 'N/A')}</Badge>) : ( <span className="text-sm text-gray-700">{t.concepto}</span> )}</TableCell>
                       <TableCell className="text-right font-medium"><span className={t.tipo === 'pago' ? 'text-green-600' : 'text-red-600'}>{t.tipo === 'pago' ? '+' : '-'}${(t.monto || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</span></TableCell>
                   </TableRow> )) )}
               </TableBody>
             </Table>
           </div>
            {/* Footer Opcional */}
             {!loading && !error && transacciones.length > 0 && totales && (
                  <div className="mt-4 flex flex-col sm:flex-row justify-between items-center px-1 text-sm">
                      <span className="text-gray-600 mb-2 sm:mb-0"> Total: {transacciones.length} transacciones </span>
                      <div className="text-right font-semibold"> <span className="text-gray-600">Balance: </span> <span className={(totales.neto || 0) >= 0 ? 'text-green-600' : 'text-red-600'}> ${(totales.neto || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})} </span> </div>
                 </div>
             )}
         </CardContent>
       </Card>

    </div>
  );
}
