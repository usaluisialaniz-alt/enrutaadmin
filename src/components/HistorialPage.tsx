import { History, Search, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';

const historial = [
  {
    id: '1',
    fecha: '2025-10-24',
    chofer: 'Juan Pérez',
    vehiculo: 'Corolla ABC123',
    montoPagar: 56000,
    totalPagado: 60000,
    gastos: 5000,
    deudaFinal: 11000,
  },
  {
    id: '2',
    fecha: '2025-10-24',
    chofer: 'María González',
    vehiculo: 'Cruze XYZ789',
    montoPagar: 60000,
    totalPagado: 55000,
    gastos: 0,
    deudaFinal: 0,
  },
  {
    id: '3',
    fecha: '2025-10-23',
    chofer: 'Carlos Rodríguez',
    vehiculo: 'Etios DEF456',
    montoPagar: 50000,
    totalPagado: 50000,
    gastos: 3000,
    deudaFinal: 3000,
  },
  {
    id: '4',
    fecha: '2025-10-23',
    chofer: 'Ana Martínez',
    vehiculo: 'Corolla ABC123',
    montoPagar: 56000,
    totalPagado: 30000,
    gastos: 2000,
    deudaFinal: 26000,
  },
  {
    id: '5',
    fecha: '2025-10-22',
    chofer: 'Juan Pérez',
    vehiculo: 'Corolla ABC123',
    montoPagar: 56000,
    totalPagado: 56000,
    gastos: 4000,
    deudaFinal: 4000,
  },
  {
    id: '6',
    fecha: '2025-10-22',
    chofer: 'Laura Fernández',
    vehiculo: 'Focus JKL012',
    montoPagar: 58000,
    totalPagado: 50000,
    gastos: 1500,
    deudaFinal: 7000,
  },
  {
    id: '7',
    fecha: '2025-10-21',
    chofer: 'María González',
    vehiculo: 'Cruze XYZ789',
    montoPagar: 60000,
    totalPagado: 65000,
    gastos: 0,
    deudaFinal: -5000,
  },
  {
    id: '8',
    fecha: '2025-10-21',
    chofer: 'Carlos Rodríguez',
    vehiculo: 'Etios DEF456',
    montoPagar: 50000,
    totalPagado: 50000,
    gastos: 2500,
    deudaFinal: 2500,
  },
];

export function HistorialPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <History className="w-6 h-6 text-blue-600" />
              <CardTitle>Historial de Rendiciones</CardTitle>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Buscar por chofer o vehículo..."
                  className="pl-9 w-64"
                />
              </div>
              <Button variant="outline" className="border-blue-300 hover:bg-blue-50">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Chofer</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead className="text-right">Monto a Pagar</TableHead>
                  <TableHead className="text-right">Total Pagado</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">Deuda Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historial.map((registro) => {
                  const fecha = new Date(registro.fecha);
                  const fechaFormateada = fecha.toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });

                  return (
                    <TableRow key={registro.id}>
                      <TableCell>{fechaFormateada}</TableCell>
                      <TableCell>{registro.chofer}</TableCell>
                      <TableCell className="text-gray-600">{registro.vehiculo}</TableCell>
                      <TableCell className="text-right">
                        ${registro.montoPagar.toLocaleString('es-AR')}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        ${registro.totalPagado.toLocaleString('es-AR')}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        ${registro.gastos.toLocaleString('es-AR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            registro.deudaFinal > 0
                              ? 'destructive'
                              : registro.deudaFinal < 0
                              ? 'default'
                              : 'secondary'
                          }
                          className={
                            registro.deudaFinal > 0
                              ? ''
                              : registro.deudaFinal < 0
                              ? 'bg-green-100 text-green-800 hover:bg-green-100'
                              : ''
                          }
                        >
                          ${registro.deudaFinal.toLocaleString('es-AR')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-gray-600 text-center">
            Mostrando las últimas {historial.length} rendiciones
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
