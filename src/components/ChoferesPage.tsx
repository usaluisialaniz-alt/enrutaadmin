import { Users, Plus, Edit, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
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

const choferes = [
  {
    id: '1',
    nombreCompleto: 'Juan Pérez',
    deuda: 15000,
    estado: 'activo',
  },
  {
    id: '2',
    nombreCompleto: 'María González',
    deuda: -5000,
    estado: 'activo',
  },
  {
    id: '3',
    nombreCompleto: 'Carlos Rodríguez',
    deuda: 0,
    estado: 'activo',
  },
  {
    id: '4',
    nombreCompleto: 'Ana Martínez',
    deuda: 28000,
    estado: 'activo',
  },
  {
    id: '5',
    nombreCompleto: 'Roberto Silva',
    deuda: -12000,
    estado: 'inactivo',
  },
  {
    id: '6',
    nombreCompleto: 'Laura Fernández',
    deuda: 8500,
    estado: 'activo',
  },
];

export function ChoferesPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-blue-600" />
              <CardTitle>Gestión de Chóferes</CardTitle>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Chofer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead className="text-right">Deuda Actual</TableHead>
                  <TableHead>Estado Deuda</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {choferes.map((chofer) => (
                  <TableRow key={chofer.id}>
                    <TableCell>{chofer.nombreCompleto}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          chofer.deuda > 0
                            ? 'text-red-600'
                            : chofer.deuda < 0
                            ? 'text-green-600'
                            : 'text-gray-900'
                        }
                      >
                        ${chofer.deuda.toLocaleString('es-AR')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {chofer.deuda > 0 ? (
                        <div className="flex items-center space-x-2 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">Debe</span>
                        </div>
                      ) : chofer.deuda < 0 ? (
                        <div className="flex items-center space-x-2 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">A favor</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Al día</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={chofer.estado === 'activo' ? 'default' : 'outline'}
                        className={
                          chofer.estado === 'activo'
                            ? 'bg-green-100 text-green-800 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                        }
                      >
                        {chofer.estado === 'activo' ? 'Activo' : 'Inactivo'}
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
