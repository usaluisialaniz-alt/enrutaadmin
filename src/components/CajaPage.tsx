// src/pages/CajaPage.tsx

import React, { useState, useEffect } from 'react';
import { Wallet, DollarSign, TrendingUp, Calendar, Loader2, RefreshCw } from 'lucide-react'; // Añadido Loader2 y RefreshCw
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Ajusta rutas
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  // Estado para la fecha seleccionada (futuro selector)
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | undefined>(undefined); // undefined para cargar hoy

  // --- Función para Cargar Datos ---
  const fetchCajaDia = async (fecha?: string) => {
      setLoading(true);
      setError(null);
      try {
        let apiUrl = '/api/getCajaDia';
        if (fecha) {
          apiUrl += `?fecha=${fecha}`; // Añade fecha al query si existe
        }
        console.log("Llamando a:", apiUrl);

        const response = await fetch(apiUrl);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Error HTTP: ${response.status}`);
        }
        const data: CajaData = await response.json(); // Tipamos la data recibida
        console.log("Datos recibidos:", data);

        // Validar data antes de setear
        if (data && data.fecha && Array.isArray(data.transacciones) && data.totales) {
            setDataCaja(data);
        } else {
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
    fetchCajaDia(); // Carga los datos de hoy al montar
  }, []);

  // Handler para recargar (o cambiar fecha en el futuro)
  const handleRefresh = () => {
      fetchCajaDia(fechaSeleccionada);
  };

  // --- Variables para Renderizado ---
  const { fecha = '', transacciones = [], totales = null } = dataCaja || {}; // Desestructuración segura

  const fechaFormateada = fecha
    ? new Date(`${fecha}T00:00:00-03:00`).toLocaleDateString('es-AR', { // Asume UTC-3 al formatear
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' // Importante usar UTC aquí porque ya ajustamos la fecha
      })
    : 'Cargando fecha...';

  // --- JSX ---
  return (
    <div className="max-w-7xl mx-auto space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 space-y-2 md:space-y-0">
        <div className="flex items-center space-x-2">
          <Wallet className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Resumen de Caja</h2>
            <p className="text-sm text-gray-500 capitalize">{fechaFormateada}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
             {/* TODO: Implementar Date Picker */}
             <Button variant="outline" size="sm" disabled>
                <Calendar className="w-4 h-4 mr-1" /> Cambiar Fecha
             </Button>
              <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading} title="Recargar">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             </Button>
        </div>
      </div>

      {/* Mensaje de Error */}
       {error && !loading && ( <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> )}

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
        <CardHeader><CardTitle>Detalle de Transacciones del Día</CardTitle></CardHeader>
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
                    <tr><td colSpan={5} className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin inline-block mr-2"/>Cargando transacciones...</td></tr>
                ) : error ? (
                    <tr><td colSpan={5} className="text-center text-red-600 py-4">Error al cargar transacciones.</td></tr>
                ) : transacciones.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-gray-500 py-4">No hay transacciones registradas para este día.</td></tr>
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
           {/* Footer Opcional con Totales */}
            {!loading && !error && transacciones.length > 0 && totales && (
                 <div className="mt-4 flex flex-col sm:flex-row justify-between items-center px-1 text-sm">
                    <span className="text-gray-600 mb-2 sm:mb-0">
                    Total: {transacciones.length} transacciones
                    </span>
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