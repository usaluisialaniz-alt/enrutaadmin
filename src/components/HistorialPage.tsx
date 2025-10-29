import React, { useState, useEffect } from 'react';
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

// Definir interfaz para los datos del historial (SIN vehiculo)
interface HistorialRegistro {
  id: string;
  fecha: string; // YYYY-MM-DD
  chofer: string;
  // vehiculo: string; // Removido
  montoPagar: number;
  totalPagado: number;
  gastos: number;
  deudaAnterior: number;
  deudaFinal: number;
}

export function HistorialPage() {
  // Estados (sin cambios)
  const [historial, setHistorial] = useState<HistorialRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- Lógica de Comunicación con API ---
  const fetchHistorial = async () => {
    setError(null);
    try {
      const response = await fetch('/api/getHistorial'); // Asume que la API sigue devolviendo el objeto como antes
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data.historial)) {
        // Mapear los datos recibidos a la nueva interfaz (ignorando vehiculo si viene)
        const mappedData: HistorialRegistro[] = data.historial.map((item: any) => ({
             id: item.id,
             fecha: item.fecha,
             chofer: item.chofer,
             montoPagar: Number(item.montoPagar) || 0,
             totalPagado: Number(item.totalPagado) || 0,
             gastos: Number(item.gastos) || 0,
             deudaAnterior: Number(item.deudaAnterior) || 0,
             deudaFinal: Number(item.deudaFinal) || 0,
             // Ignoramos item.vehiculo
        }));

        const sortedData = mappedData.sort((a, b) =>
            new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        setHistorial(sortedData);
      } else {
        throw new Error("Formato de respuesta inesperado (se esperaba 'historial').");
      }
    } catch (e) {
      console.error("Error al obtener historial:", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Carga inicial y Refresh (sin cambios)
  useEffect(() => { setLoading(true); fetchHistorial(); }, []);
  const handleRefresh = () => { if (!isRefreshing) { setIsRefreshing(true); fetchHistorial(); } };

  // --- Lógica de Filtrado (SOLO por Chofer) ---
  const filteredHistorial = historial.filter((registro) => {
    // Si no hay término de búsqueda, mostrar todo
    if (!searchTerm.trim()) {
        return true;
    }
    const term = searchTerm.toLowerCase();
    // Filtrar únicamente por el nombre del chofer
    return registro.chofer.toLowerCase().includes(term);
  });


  // --- Lógica de Exportación (CSV - SIN Vehiculo) ---
   const handleExport = () => {
    if (filteredHistorial.length === 0) return;

    // ✨ Encabezado SIN "Vehiculo" ✨
    const headers = ["Fecha", "Chofer", "Deuda Anterior", "Monto a Pagar", "Total Pagado", "Gastos", "Deuda Final"];
    const rows = filteredHistorial.map(r => [
      r.fecha,
      `"${r.chofer.replace(/"/g, '""')}"`,
      // ✨ Columna Vehiculo REMOVIDA ✨
      r.deudaAnterior,
      r.montoPagar,
      r.totalPagado,
      r.gastos,
      r.deudaFinal
    ]);

    // (Resto de la lógica de exportación sin cambios)
    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `historial_rendiciones_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Renderizado de Contenido de la Tabla ---
  let tableContent;
  const colSpanValue = 7; // ✨ Ajustado el colSpan a 7 (quitamos 1 columna)

  if (loading && historial.length === 0 && !isRefreshing) {
    tableContent = ( <TableRow><TableCell colSpan={colSpanValue} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin inline-block mr-2 text-blue-500" /> Cargando historial...</TableCell></TableRow> );
  } else if (error && historial.length === 0) {
    tableContent = ( <TableRow><TableCell colSpan={colSpanValue} className="text-center text-red-600 py-8"><strong>Error al cargar:</strong> {error} <Button variant="link" onClick={handleRefresh}>Reintentar</Button></TableCell></TableRow> );
  } else if (filteredHistorial.length === 0 && !loading && !error) {
    tableContent = ( <TableRow><TableCell colSpan={colSpanValue} className="text-center py-8 text-gray-500">{searchTerm ? 'No hay resultados para tu búsqueda.' : 'No hay registros.'}</TableCell></TableRow> );
  } else {
    tableContent = filteredHistorial.map((registro) => {
      let fechaFormateada = registro.fecha;
      try {
         fechaFormateada = format(parseISO(registro.fecha + 'T00:00:00'), 'dd/MM/yyyy', { locale: es });
      } catch (e) { console.warn(`Fecha inválida: ${registro.fecha}`); }

      const deudaAnteriorColor = registro.deudaAnterior > 0 ? 'text-red-600' : registro.deudaAnterior < 0 ? 'text-green-600' : 'text-gray-700';

      return (
        <TableRow key={registro.id}>
          <TableCell>{fechaFormateada}</TableCell>
          <TableCell>{registro.chofer || '-'}</TableCell>
          {/* ✨ Celda Vehiculo REMOVIDA ✨ */}
          <TableCell className={`text-right ${deudaAnteriorColor}`}>${(registro.deudaAnterior || 0).toLocaleString('es-AR')}</TableCell>
          <TableCell className="text-right">${(registro.montoPagar || 0).toLocaleString('es-AR')}</TableCell>
          <TableCell className="text-right text-green-600">${(registro.totalPagado || 0).toLocaleString('es-AR')}</TableCell>
          <TableCell className="text-right text-red-600">${(registro.gastos || 0).toLocaleString('es-AR')}</TableCell>
          <TableCell className="text-right">
            <Badge
              variant={ registro.deudaFinal > 0 ? 'destructive' : registro.deudaFinal < 0 ? 'default' : 'secondary' }
              className={ registro.deudaFinal < 0 ? 'bg-green-100 text-green-800 hover:bg-green-100' : '' } >
              ${(registro.deudaFinal || 0).toLocaleString('es-AR')}
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
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-xl">Historial de Rendiciones</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por Chofer..." // Placeholder actualizado
                  className="pl-9 w-48 md:w-64 h-9 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={loading || isRefreshing}
                />
              </div>
              <Button
                variant="outline" size="sm" className="h-9 border-blue-300 hover:bg-blue-50 text-blue-700"
                onClick={handleExport} disabled={filteredHistorial.length === 0 || loading || isRefreshing}>
                <Download className="w-4 h-4 mr-1" />
                Exportar
              </Button>
               <Button variant="outline" size="icon" className={`h-9 w-9 p-0 relative ${isRefreshing ? 'cursor-not-allowed' : ''}`}
                onClick={handleRefresh} disabled={isRefreshing || loading} title="Recargar historial">
                {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin absolute inset-0 m-auto text-blue-500" /> : <RefreshCw className="w-4 h-4" />}
               </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
           {/* Error global */}
          {error && historial.length === 0 && (
             <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
               <strong>Error:</strong> {error}
             </div>
           )}
          <div className="rounded-md border overflow-x-auto relative">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Fecha</TableHead>
                  <TableHead>Chofer</TableHead>
                  {/* ✨ Encabezado Vehiculo REMOVIDO ✨ */}
                  <TableHead className="text-right">Deuda Ant.</TableHead>
                  <TableHead className="text-right">Monto Pagar</TableHead>
                  <TableHead className="text-right">Total Pagado</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">Deuda Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{tableContent}</TableBody>
            </Table>
             {/* Indicador recarga sutil */}
             {isRefreshing && historial.length > 0 && ( <div className="absolute bottom-2 right-2 p-1 bg-white rounded-full shadow"><Loader2 className="w-4 h-4 animate-spin text-blue-500" /></div> )}
          </div>
            {/* Mensaje cantidad registros */}
            {!loading && !error && (
                 <div className="mt-4 text-xs text-gray-500 text-center">
                   {searchTerm
                     ? `Mostrando ${filteredHistorial.length} de ${historial.length} registros.`
                     : `Mostrando ${historial.length} registros.`
                   }
                 </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

