import { Car, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
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

const vehiculos = [
  {
    id: '1',
    nombreVisible: 'Corolla ABC123',
    patente: 'ABC123',
    tarifaNormal: 56000,
    tarifaEspecial: 35000,
    estado: 'activo',
  },
  {
    id: '2',
    nombreVisible: 'Cruze XYZ789',
    patente: 'XYZ789',
    tarifaNormal: 60000,
    tarifaEspecial: 38000,
    estado: 'activo',
  },
  {
    id: '3',
    nombreVisible: 'Etios DEF456',
    patente: 'DEF456',
    tarifaNormal: 50000,
    tarifaEspecial: 32000,
    estado: 'activo',
  },
  {
    id: '4',
    nombreVisible: 'Gol GHI789',
    patente: 'GHI789',
    tarifaNormal: 48000,
    tarifaEspecial: 30000,
    estado: 'mantenimiento',
  },
  {
    id: '5',
    nombreVisible: 'Focus JKL012',
    patente: 'JKL012',
    tarifaNormal: 58000,
    tarifaEspecial: 36000,
    estado: 'inactivo',
  },
];

export function FlotaPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Car className="w-6 h-6 text-blue-600" />
              <CardTitle>Gestión de Flota</CardTitle>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Vehículo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre Visible</TableHead>
                  <TableHead>Patente</TableHead>
                  <TableHead className="text-right">Tarifa Normal</TableHead>
                  <TableHead className="text-right">Tarifa Especial</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehiculos.map((vehiculo) => (
                  <TableRow key={vehiculo.id}>
                    <TableCell>{vehiculo.nombreVisible}</TableCell>
                    <TableCell>{vehiculo.patente}</TableCell>
                    <TableCell className="text-right">
                      ${vehiculo.tarifaNormal.toLocaleString('es-AR')}
                    </TableCell>
                    <TableCell className="text-right">
                      ${vehiculo.tarifaEspecial.toLocaleString('es-AR')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          vehiculo.estado === 'activo'
                            ? 'default'
                            : vehiculo.estado === 'mantenimiento'
                            ? 'secondary'
                            : 'outline'
                        }
                        className={
                          vehiculo.estado === 'activo'
                            ? 'bg-green-100 text-green-800 hover:bg-green-100'
                            : vehiculo.estado === 'mantenimiento'
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                        }
                      >
                        {vehiculo.estado === 'activo'
                          ? 'Activo'
                          : vehiculo.estado === 'mantenimiento'
                          ? 'Mantenimiento'
                          : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="ghost" size="icon">
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
