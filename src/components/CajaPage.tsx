import { Wallet, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

// Mock data - Resumen de transacciones del día
const transaccionesDia = [
  {
    id: '1',
    hora: '09:15',
    chofer: 'Juan Pérez',
    tipo: 'pago',
    metodo: 'efectivo',
    monto: 60000,
  },
  {
    id: '2',
    hora: '09:15',
    chofer: 'Juan Pérez',
    tipo: 'gasto',
    concepto: 'Combustible',
    monto: 5000,
  },
  {
    id: '3',
    hora: '10:30',
    chofer: 'María González',
    tipo: 'pago',
    metodo: 'transferencia',
    monto: 55000,
  },
  {
    id: '4',
    hora: '11:45',
    chofer: 'Carlos Rodríguez',
    tipo: 'pago',
    metodo: 'efectivo',
    monto: 50000,
  },
  {
    id: '5',
    hora: '11:45',
    chofer: 'Carlos Rodríguez',
    tipo: 'gasto',
    concepto: 'Peaje',
    monto: 3000,
  },
  {
    id: '6',
    hora: '14:20',
    chofer: 'Ana Martínez',
    tipo: 'pago',
    metodo: 'mercadopago',
    monto: 30000,
  },
  {
    id: '7',
    hora: '14:20',
    chofer: 'Ana Martínez',
    tipo: 'gasto',
    concepto: 'Lavado',
    monto: 2000,
  },
  {
    id: '8',
    hora: '16:00',
    chofer: 'Juan Pérez',
    tipo: 'pago',
    metodo: 'efectivo',
    monto: 20000,
  },
];

export function CajaPage() {
  // Calcular totales por método de pago
  const totalEfectivo = transaccionesDia
    .filter((t) => t.tipo === 'pago' && t.metodo === 'efectivo')
    .reduce((sum, t) => sum + t.monto, 0);

  const totalTransferencia = transaccionesDia
    .filter((t) => t.tipo === 'pago' && t.metodo === 'transferencia')
    .reduce((sum, t) => sum + t.monto, 0);

  const totalMercadoPago = transaccionesDia
    .filter((t) => t.tipo === 'pago' && t.metodo === 'mercadopago')
    .reduce((sum, t) => sum + t.monto, 0);

  const totalGastos = transaccionesDia
    .filter((t) => t.tipo === 'gasto')
    .reduce((sum, t) => sum + t.monto, 0);

  const totalPagos = totalEfectivo + totalTransferencia + totalMercadoPago;
  const totalNeto = totalPagos - totalGastos;

  const fechaHoy = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header con fecha */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Wallet className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-gray-900">Resumen de Caja</h2>
            <p className="text-sm text-gray-600 capitalize">{fechaHoy}</p>
          </div>
        </div>
        <Button variant="outline" className="border-blue-300 hover:bg-blue-50">
          <Calendar className="w-4 h-4 mr-2" />
          Cambiar Fecha
        </Button>
      </div>

      {/* Cards de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Efectivo */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Efectivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900">${totalEfectivo.toLocaleString('es-AR')}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {transaccionesDia.filter((t) => t.tipo === 'pago' && t.metodo === 'efectivo').length} pagos
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Total Transferencia */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Transferencia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900">${totalTransferencia.toLocaleString('es-AR')}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {transaccionesDia.filter((t) => t.tipo === 'pago' && t.metodo === 'transferencia').length} pagos
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Total Mercado Pago */}
        <Card className="border-cyan-200 bg-cyan-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Mercado Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900">${totalMercadoPago.toLocaleString('es-AR')}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {transaccionesDia.filter((t) => t.tipo === 'pago' && t.metodo === 'mercadopago').length} pagos
                </p>
              </div>
              <Wallet className="w-8 h-8 text-cyan-600" />
            </div>
          </CardContent>
        </Card>

        {/* Total Gastos */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Gastos del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900">${totalGastos.toLocaleString('es-AR')}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {transaccionesDia.filter((t) => t.tipo === 'gasto').length} gastos
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen Total */}
      <Card className="bg-slate-800 text-white border-slate-700">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-300 mb-2">Total Ingresado</p>
              <p className="text-white">${totalPagos.toLocaleString('es-AR')}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-300 mb-2">Total Gastos</p>
              <p className="text-white">${totalGastos.toLocaleString('es-AR')}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-300 mb-2">Total Neto</p>
              <p className="text-white">${totalNeto.toLocaleString('es-AR')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalle de Transacciones */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Transacciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Chofer</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Método / Concepto</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transaccionesDia.map((transaccion) => (
                  <TableRow key={transaccion.id}>
                    <TableCell className="text-gray-600">{transaccion.hora}</TableCell>
                    <TableCell>{transaccion.chofer}</TableCell>
                    <TableCell>
                      <Badge
                        variant={transaccion.tipo === 'pago' ? 'default' : 'destructive'}
                        className={
                          transaccion.tipo === 'pago'
                            ? 'bg-green-100 text-green-800 hover:bg-green-100'
                            : ''
                        }
                      >
                        {transaccion.tipo === 'pago' ? 'Pago' : 'Gasto'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {transaccion.tipo === 'pago' ? (
                        <Badge variant="outline" className="capitalize">
                          {transaccion.metodo === 'efectivo'
                            ? 'Efectivo'
                            : transaccion.metodo === 'transferencia'
                            ? 'Transferencia'
                            : 'Mercado Pago'}
                        </Badge>
                      ) : (
                        <span className="text-gray-600">{transaccion.concepto}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={transaccion.tipo === 'pago' ? 'text-green-600' : 'text-red-600'}
                      >
                        {transaccion.tipo === 'pago' ? '+' : '-'}$
                        {transaccion.monto.toLocaleString('es-AR')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-between items-center px-4">
            <span className="text-sm text-gray-600">
              Total de {transaccionesDia.length} transacciones
            </span>
            <div className="text-right">
              <span className="text-sm text-gray-600">Balance del día: </span>
              <span className="text-green-600">${totalNeto.toLocaleString('es-AR')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
