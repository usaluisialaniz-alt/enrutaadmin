import React, { useState, useEffect,useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { History, Search, Download, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Definir interfaz (con montoTarifa y montoPagar renombrado)
interface HistorialRegistro {
  id: string;
  fecha: string; 
  chofer: string;
  vehiculo: string; 
  montoTarifa: number; 
  montoPagar: number; 
  totalPagado: number;
  gastos: number;
  deudaAnterior: number;
  deudaFinal: number;
}

export function HistorialPage() {
  
  const [historial, setHistorial] = useState<HistorialRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedChofer, setSelectedChofer] = useState(''); // '' = Todos 

  const choferesUnicos = useMemo(() => {
    // 1. Mapea para obtener solo los nombres
    const nombres = historial.map(r => r.chofer);
    // 2. Usa 'Set' para obtener solo los únicos y conviértelo de nuevo a un array
    const unicos = [...new Set(nombres)];
    // 3. Ordena alfabéticamente
    return unicos.sort((a, b) => a.localeCompare(b));
  }, [historial]); // Esta es la "dependencia": solo se re-ejecuta si 'historial' cambia

  // --- Lógica de Comunicación con API ---
  const fetchHistorial = async () => {
    setError(null);
    // No activar loading en refresh para no ocultar tabla
    // setLoading(true); // <-- Comentado/Eliminado
    try {
      const response = await fetch('/api/getHistorial');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({error: `Error HTTP ${response.status}`}));
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data.historial)) {
        // Mapear asegurando que ambos montos existan y sean números
        const mappedData: HistorialRegistro[] = data.historial.map((item: any) => ({
             id: String(item.id || ''), // Asegurar string
             fecha: item.fecha || 'N/A', // Asegurar string o fallback
             chofer: item.chofer || 'Desconocido', // Asegurar string o fallback
             vehiculo: item.vehiculo || '', // Mantener por si acaso
             montoTarifa: Number(item.montoTarifa) || 0, // ✨ Leer montoTarifa
             montoPagar: Number(item.montoPagar) || 0, // ✨ Leer montoPagar (Total)
             totalPagado: Number(item.totalPagado) || 0,
             gastos: Number(item.gastos) || 0,
             deudaAnterior: Number(item.deudaAnterior) || 0,
             deudaFinal: Number(item.deudaFinal) || 0,
        }));
        // Ordenar por fecha (ya viene ordenado de la API, pero doble chequeo)
        const sortedData = mappedData.sort((a, b) => b.fecha.localeCompare(a.fecha));
        setHistorial(sortedData);
      } else {
        throw new Error("Formato de respuesta inesperado (se esperaba 'historial').");
      }
    } catch (e) {
      console.error("Error al obtener historial:", e);
      setError(e instanceof Error ? e.message : String(e));
      setHistorial([]); // Limpiar historial en caso de error
    } finally {
      setLoading(false); // Quitar loading inicial
      setIsRefreshing(false); // Quitar estado refreshing
    }
  };

  // Carga inicial
  useEffect(() => {
    setLoading(true); // Solo en la carga inicial
    fetchHistorial();
  }, []);

  // Handler Refresh
  const handleRefresh = () => {
    if (!isRefreshing) { // Evitar doble click
      setIsRefreshing(true);
      fetchHistorial();
    }
  };

  

  // --- Lógica de Filtrado (SOLO por Chofer y Fecha) ---
  const filteredHistorial = historial.filter((registro) => {
  // Si no hay ningún chofer seleccionado (es ''), muestra todo.
  if (!selectedChofer) return true;
  
  // Si hay un chofer, muestra solo los registros de ese chofer.
  return registro.chofer === selectedChofer;
});

  // --- Lógica de Exportación (CSV - Añadir ambas columnas) ---
   const handleExport = () => {
    if (filteredHistorial.length === 0) return;
    // Encabezado con AMBOS montos
    const headers = ["Fecha", "Chofer", "Tarifa Calculada", "Saldo Anterior", "Monto Total Pagar", "Total Pagado", "Gastos", "Deuda Final"];
    const rows = filteredHistorial.map(r => [
      r.fecha, // Fecha en formato YYYY-MM-DD para CSV
      `"${r.chofer.replace(/"/g, '""')}"`, // Chofer entre comillas y escapado
      r.montoTarifa, // Añadir Monto Tarifa
      r.deudaAnterior,
      r.montoPagar, // Monto Total a Pagar
      r.totalPagado,
      r.gastos,
      r.deudaFinal
    ]);
    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    // Nombre de archivo con fecha actual
    link.setAttribute("download", `historial_rendiciones_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Renderizado de Contenido de la Tabla ---
  let tableContent;
  const colSpanValue = 8; // Ajustado el colSpan a 8

  // Mostrar loading grande solo la primera vez o si hay error y se reintenta
  if (loading && historial.length === 0) {
     tableContent = ( <TableRow><TableCell colSpan={colSpanValue} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin inline-block mr-2 text-blue-500" /> Cargando historial...</TableCell></TableRow> );
  } else if (error && historial.length === 0) { // Mostrar error solo si no hay datos
     tableContent = ( <TableRow><TableCell colSpan={colSpanValue} className="text-center text-red-600 py-8"><strong>Error al cargar:</strong> {error} <Button variant="link" onClick={handleRefresh}>Reintentar</Button></TableCell></TableRow> );
  }  else {
    // Mapear sobre los datos filtrados
    tableContent = filteredHistorial.map((registro) => {
      let fechaFormateada = registro.fecha;
      try {
           // Formatear fecha para mostrar
           fechaFormateada = format(parseISO(registro.fecha + 'T00:00:00'), 'dd/MM/yyyy', { locale: es }); // Añadir Z para indicar UTC y evitar corrimientos
      } catch (e) { console.warn(`Fecha inválida en registro ${registro.id}: ${registro.fecha}`); }

      // Determinar color de deudas
      const deudaAnteriorColor = registro.deudaAnterior > 0 ? '' : registro.deudaAnterior < 0 ? 'text-green-600' : 'text-gray-700';
      const deudaFinalColor = registro.deudaFinal > 0 ? '' : registro.deudaFinal < 0 ? 'text-green-600' : '';

      return (
        <TableRow key={registro.id}>
          <TableCell className="whitespace-nowrap">{fechaFormateada}</TableCell>
          <TableCell>{registro.chofer || '-'}</TableCell>
          {/* Columna Tarifa */}
          <TableCell className={`text-right ${deudaAnteriorColor}`}>
              ${(registro.montoTarifa || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </TableCell>
          {/* NUEVA CELDA: Deuda Anterior */}
          <TableCell className="text-right">
              ${(registro.deudaAnterior || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </TableCell>
          {/* CELDA RENOMBRADA: Monto Total a Pagar */}
          <TableCell className="text-right font-medium">
              ${(registro.montoPagar || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </TableCell>
          <TableCell className="text-right text-green-600">
              ${(registro.totalPagado || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </TableCell>
          <TableCell className="text-right text-red-600">
              ${(registro.gastos || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </TableCell>
          <TableCell className="text-right">
            <Badge
              variant={ registro.deudaFinal > 0 ? 'destructive' : registro.deudaFinal < 0 ? 'default' : 'secondary' }
              className={ registro.deudaFinal < 0 ? `bg-green-100 text-green-800 ${deudaFinalColor}` : deudaFinalColor } >
              ${(registro.deudaFinal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </Badge>
          </TableCell>
        </TableRow>
      );
    });
  }

  // --- JSX Final ---
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <Card>
        <CardHeader>
           <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
             <div className="flex items-center space-x-2"><History className="w-5 h-5 text-blue-600" /><CardTitle className="text-xl">Historial de Rendiciones</CardTitle></div>
             <div className="flex items-center space-x-2">
                 <Select
                    value={selectedChofer} // El valor está atado al estado
                    onValueChange={(value) => {
                      // Si el usuario elige "todos", vuelve al estado inicial ''
                      setSelectedChofer(value === "todos" ? "" : value);
                    }}
                    disabled={loading || isRefreshing || choferesUnicos.length === 0}
                  >
                    <SelectTrigger className="w-48 md:w-64 h-9 text-sm">
                      <SelectValue placeholder="Filtrar por Chofer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Opción para mostrar "Todos" */}
                      <SelectItem value="todos">Todos los Choferes</SelectItem>
                      
                      {/* Mapea la lista única que creaste en el paso 3 */}
                      {choferesUnicos.map((chofer) => (
                        <SelectItem key={chofer} value={chofer}>
                          {chofer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                 <Button // Export Button
                    variant="outline" size="sm" className="h-9 border-blue-600 hover:bg-blue-50 text-blue-700 font-medium"
                    onClick={handleExport} disabled={filteredHistorial.length === 0 || loading || isRefreshing}>
                    <Download className="w-4 h-4 mr-1" /> Exportar
                 </Button>
                 <Button // Refresh Button
                    variant="outline" size="icon" className={`h-9 w-9 p-0 relative ${isRefreshing ? 'cursor-not-allowed' : ''}`}
                    onClick={handleRefresh} disabled={isRefreshing || loading} title="Recargar historial">
                    {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin absolute inset-0 m-auto text-blue-500" /> : <RefreshCw className="w-4 h-4" />}
                 </Button>
             </div>
           </div>
        </CardHeader>
        <CardContent>
           {/* Error global */}
          {error && historial.length === 0 && (
             <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm flex justify-between items-center">
               <span><strong>Error:</strong> {error}</span>
                <Button variant="ghost" size="sm" onClick={() => setError(null)}>Cerrar</Button>
             </div>
           )}
          <div className="rounded-md border overflow-x-auto relative min-h-[200px]"> {/* Altura mínima para ver spinner */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Fecha</TableHead>
                  <TableHead>Chofer</TableHead>
                  {/* Columna Vehículo comentada/eliminada */}
                  <TableHead className="text-right">Tarifa Calculada</TableHead>
                  {/* NUEVO ENCABEZADO: Monto Tarifa */}
                  <TableHead className="text-right">Saldo Anterior</TableHead>
                  {/* ENCABEZADO RENOMBRADO: Monto Total Pagar */}
                  <TableHead className="text-right">Monto Total Pagar</TableHead>
                  <TableHead className="text-right">Total Pagado</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">Deuda Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {/* Muestra contenido o mensajes de estado */}
                  {tableContent}
              </TableBody>
            </Table>
             {/* Indicador de recarga sutil */}
             {isRefreshing && historial.length > 0 && ( <div className="absolute bottom-2 right-2 p-1 bg-white rounded-full shadow-md border"><Loader2 className="w-4 h-4 animate-spin text-blue-500" /></div> )}
          </div>
            {/* Mensaje cantidad registros */}
            {!loading && !error && (
                 <div className="mt-4 text-xs text-gray-500 text-center">
                   {selectedChofer
                     ? `Mostrando ${filteredHistorial.length} de ${historial.length} registros que coinciden.`
                     : `Mostrando ${historial.length} registros en total.`
                   }
                 </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
