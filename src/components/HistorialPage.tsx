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

// Definir interfaz para los datos del historial (con deudaAnterior)
interface HistorialRegistro {
  id: string;
  fecha: string; // YYYY-MM-DD
  chofer: string;
  vehiculo: string;
  montoPagar: number;
  totalPagado: number;
  gastos: number;
  deudaAnterior: number; // ✨ Añadido
  deudaFinal: number;
}

export function HistorialPage() {
  // Estados (sin cambios)
  const [historial, setHistorial] = useState<HistorialRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- Lógica de Comunicación con API (sin cambios) ---
  const fetchHistorial = async () => {
    setError(null);
    try {
      const response = await fetch('/api/getHistorial');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data.historial)) {
        const sortedData = data.historial.sort((a: HistorialRegistro, b: HistorialRegistro) =>
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

  // --- Lógica de Filtrado (sin cambios) ---
  const filteredHistorial = historial.filter((registro) => {
  const term = searchTerm.toLowerCase();
  return (
    registro.chofer.toLowerCase().includes(term) ||
    registro.vehiculo.toLowerCase().includes(term) ||
    registro.fecha.includes(term)
  );
});


  // --- Lógica de Exportación (CSV Básico - Añadir Deuda Anterior) ---
   const handleExport = () => {
    if (filteredHistorial.length === 0) return;

    // ✨ Añadir "Deuda Anterior" al encabezado
    const headers = ["Fecha", "Chofer", "Vehiculo", "Deuda Anterior", "Monto a Pagar", "Total Pagado", "Gastos", "Deuda Final"];
    const rows = filteredHistorial.map(r => [
      r.fecha,
      `"${r.chofer.replace(/"/g, '""')}"`,
      `"${r.vehiculo.replace(/"/g, '""')}"`,
      r.deudaAnterior, // ✨ Añadir valor
      r.montoPagar,
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
    link.setAttribute("download", `historial_rendiciones_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Renderizado de Contenido de la Tabla ---
  let tableContent;
  const colSpanValue = 8; // ✨ Ajustado el colSpan a 8

  if (loading && historial.length === 0 && !isRefreshing) {
    tableContent = ( <TableRow><TableCell colSpan={colSpanValue} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin inline-block mr-2 text-blue-500" /> Cargando historial...</TableCell></TableRow> );
  } else if (error && historial.length === 0) {
    tableContent = ( <TableRow><TableCell colSpan={colSpanValue} className="text-center text-red-600 py-8"><strong>Error al cargar:</strong> {error} <Button variant="link" onClick={handleRefresh}>Reintentar</Button></TableCell></TableRow> );
  } else if (filteredHistorial.length === 0 && !loading && !error) {
    tableContent = ( <TableRow><TableCell colSpan={colSpanValue} className="text-center py-8 text-gray-500">{searchTerm ? 'No hay resultados.' : 'No hay registros.'}</TableCell></TableRow> );
  } else {
    tableContent = filteredHistorial.map((registro) => {
      let fechaFormateada = registro.fecha;
      try {
         fechaFormateada = format(parseISO(registro.fecha + 'T00:00:00'), 'dd/MM/yyyy', { locale: es });
      } catch (e) { console.warn(`Fecha inválida: ${registro.fecha}`); }

      // Determinar color de deuda anterior
      const deudaAnteriorColor = registro.deudaAnterior > 0 ? 'text-red-600' : registro.deudaAnterior < 0 ? 'text-green-600' : 'text-gray-700';

      return (
        <TableRow key={registro.id}>
          <TableCell>{fechaFormateada}</TableCell>
          <TableCell>{registro.chofer || '-'}</TableCell>
          <TableCell className="text-gray-600">{registro.vehiculo || '-'}</TableCell>
           {/* ✨ NUEVA CELDA: Deuda Anterior ✨ */}
           <TableCell className={`text-right ${deudaAnteriorColor}`}>
               ${(registro.deudaAnterior || 0).toLocaleString('es-AR')}
           </TableCell>
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
           {/* ... Header sin cambios ... */}
        </CardHeader>
        <CardContent>
           {/* ... Error global sin cambios ... */}
          <div className="rounded-md border overflow-x-auto relative">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Fecha</TableHead>
                  <TableHead>Chofer</TableHead>
                  <TableHead>Vehículo</TableHead>
                  {/* ✨ NUEVO ENCABEZADO: Deuda Anterior ✨ */}
                  <TableHead className="text-right">Deuda Ant.</TableHead>
                  <TableHead className="text-right">Monto Pagar</TableHead>
                  <TableHead className="text-right">Total Pagado</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">Deuda Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{tableContent}</TableBody>
            </Table>
             {/* ... Indicador recarga sin cambios ... */}
          </div>
            {/* ... Mensaje cantidad registros sin cambios ... */}
        </CardContent>
      </Card>
    </div>
  );
}

