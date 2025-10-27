import { useState } from 'react';
import { Plus, X, DollarSign } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';

// Mock data
const choferes = [
  { id: '1', nombre: 'Juan Pérez', deuda: 15000 },
  { id: '2', nombre: 'María González', deuda: -5000 },
  { id: '3', nombre: 'Carlos Rodríguez', deuda: 0 },
  { id: '4', nombre: 'Ana Martínez', deuda: 28000 },
];

const vehiculos = [
  { id: '1', nombre: 'Corolla ABC123', tarifaNormal: 56000, tarifaEspecial: 35000 },
  { id: '2', nombre: 'Cruze XYZ789', tarifaNormal: 60000, tarifaEspecial: 38000 },
  { id: '3', nombre: 'Etios DEF456', tarifaNormal: 50000, tarifaEspecial: 32000 },
];

type Pago = {
  id: string;
  monto: string;
  metodo: string;
};

type Gasto = {
  id: string;
  concepto: string;
  monto: string;
};

export function OperacionesPage() {
  const [choferId, setChoferId] = useState('');
  const [vehiculoId, setVehiculoId] = useState('');
  const [montoPagar, setMontoPagar] = useState('');
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  const choferSeleccionado = choferes.find((c) => c.id === choferId);
  const vehiculoSeleccionado = vehiculos.find((v) => v.id === vehiculoId);

  const handleAgregarPago = () => {
    setPagos([...pagos, { id: Date.now().toString(), monto: '', metodo: 'efectivo' }]);
  };

  const handleEliminarPago = (id: string) => {
    setPagos(pagos.filter((p) => p.id !== id));
  };

  const handleActualizarPago = (id: string, campo: 'monto' | 'metodo', valor: string) => {
    setPagos(pagos.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));
  };

  const handleAgregarGasto = () => {
    setGastos([...gastos, { id: Date.now().toString(), concepto: '', monto: '' }]);
  };

  const handleEliminarGasto = (id: string) => {
    setGastos(gastos.filter((g) => g.id !== id));
  };

  const handleActualizarGasto = (id: string, campo: 'concepto' | 'monto', valor: string) => {
    setGastos(gastos.map((g) => (g.id === id ? { ...g, [campo]: valor } : g)));
  };

  const handleTarifaNormal = () => {
    if (vehiculoSeleccionado) {
      setMontoPagar(vehiculoSeleccionado.tarifaNormal.toString());
    }
  };

  const handleTarifaEspecial = () => {
    if (vehiculoSeleccionado) {
      setMontoPagar(vehiculoSeleccionado.tarifaEspecial.toString());
    }
  };

  const handlePagarDeuda = () => {
    if (choferSeleccionado && choferSeleccionado.deuda > 0) {
      const nuevoPago: Pago = {
        id: Date.now().toString(),
        monto: choferSeleccionado.deuda.toString(),
        metodo: 'efectivo',
      };
      setPagos([...pagos, nuevoPago]);
      setMontoPagar('0');
    } else {
      const nuevoPago: Pago = {
        id: Date.now().toString(),
        monto: '',
        metodo: 'efectivo',
      };
      setPagos([...pagos, nuevoPago]);
      setMontoPagar('0');
    }
  };

  const handleGuardarRendicion = () => {
    if (!choferId) {
      setMensaje({ tipo: 'error', texto: 'Error: Debe seleccionar un chofer' });
      setTimeout(() => setMensaje(null), 3000);
      return;
    }

    if (!vehiculoId) {
      setMensaje({ tipo: 'error', texto: 'Error: Debe seleccionar un vehículo' });
      setTimeout(() => setMensaje(null), 3000);
      return;
    }

    if (!montoPagar) {
      setMensaje({ tipo: 'error', texto: 'Error: Debe ingresar un monto a pagar' });
      setTimeout(() => setMensaje(null), 3000);
      return;
    }

    // Guardar lógica aquí (en producción, enviar a backend)
    setMensaje({ tipo: 'success', texto: 'Rendición guardada con éxito' });
    
    // Limpiar formulario
    setTimeout(() => {
      setChoferId('');
      setVehiculoId('');
      setMontoPagar('');
      setPagos([]);
      setGastos([]);
      setMensaje(null);
    }, 2000);
  };

  const totalPagos = pagos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
  const totalGastos = gastos.reduce((sum, g) => sum + (parseFloat(g.monto) || 0), 0);
  const deudaActual = choferSeleccionado?.deuda || 0;
  const deudaFinal = deudaActual + (parseFloat(montoPagar) || 0) - totalPagos - totalGastos;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {mensaje && (
        <Alert className={mensaje.tipo === 'error' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}>
          <AlertDescription className={mensaje.tipo === 'error' ? 'text-red-800' : 'text-green-800'}>
            {mensaje.texto}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Información de la Jornada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Selector de Chofer */}
            <div className="space-y-2">
              <Label htmlFor="chofer">Chofer</Label>
              <Select value={choferId} onValueChange={setChoferId}>
                <SelectTrigger id="chofer">
                  <SelectValue placeholder="Seleccionar chofer" />
                </SelectTrigger>
                <SelectContent>
                  {choferes.map((chofer) => (
                    <SelectItem key={chofer.id} value={chofer.id}>
                      {chofer.nombre} (Deuda: ${chofer.deuda.toLocaleString('es-AR')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {choferSeleccionado && (
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-sm text-gray-600">Deuda actual:</span>
                  <Badge
                    variant={
                      choferSeleccionado.deuda > 0
                        ? 'destructive'
                        : choferSeleccionado.deuda < 0
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    ${choferSeleccionado.deuda.toLocaleString('es-AR')}
                  </Badge>
                </div>
              )}
            </div>

            {/* Selector de Vehículo */}
            <div className="space-y-2">
              <Label htmlFor="vehiculo">Vehículo</Label>
              <Select value={vehiculoId} onValueChange={setVehiculoId}>
                <SelectTrigger id="vehiculo">
                  <SelectValue placeholder="Seleccionar vehículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehiculos.map((vehiculo) => (
                    <SelectItem key={vehiculo.id} value={vehiculo.id}>
                      {vehiculo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Monto a Pagar */}
          <div className="space-y-2">
            <Label htmlFor="monto">Monto a Pagar (Jornada)</Label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="monto"
                  type="number"
                  value={montoPagar}
                  onChange={(e) => setMontoPagar(e.target.value)}
                  placeholder="0"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Botones de Tarifa */}
          {vehiculoSeleccionado && (
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleTarifaNormal}
                className="border-blue-300 hover:bg-blue-50"
              >
                Día Normal (${vehiculoSeleccionado.tarifaNormal.toLocaleString('es-AR')})
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleTarifaEspecial}
                className="border-purple-300 hover:bg-purple-50"
              >
                Día Especial (${vehiculoSeleccionado.tarifaEspecial.toLocaleString('es-AR')})
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handlePagarDeuda}
                className="border-green-300 hover:bg-green-50"
              >
                Pagar Deuda ($0)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sección de Pagos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pagos</CardTitle>
            <Button onClick={handleAgregarPago} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Pago
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pagos.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No hay pagos registrados. Haga clic en "Agregar Pago" para añadir uno.
            </p>
          ) : (
            <div className="space-y-3">
              {pagos.map((pago) => (
                <div key={pago.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <Label className="text-xs text-gray-600">Monto</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        type="number"
                        value={pago.monto}
                        onChange={(e) => handleActualizarPago(pago.id, 'monto', e.target.value)}
                        placeholder="0"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-gray-600">Método</Label>
                    <Select
                      value={pago.metodo}
                      onValueChange={(valor) => handleActualizarPago(pago.id, 'metodo', valor)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="transferencia">Transferencia</SelectItem>
                        <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEliminarPago(pago.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-5"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-end pt-2 border-t border-gray-200">
                <div className="text-right">
                  <span className="text-sm text-gray-600">Total Pagos: </span>
                  <span className="text-green-600">${totalPagos.toLocaleString('es-AR')}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sección de Gastos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gastos</CardTitle>
            <Button onClick={handleAgregarGasto} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Gasto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {gastos.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No hay gastos registrados. Haga clic en "Agregar Gasto" para añadir uno.
            </p>
          ) : (
            <div className="space-y-3">
              {gastos.map((gasto) => (
                <div key={gasto.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <Label className="text-xs text-gray-600">Concepto</Label>
                    <Input
                      type="text"
                      value={gasto.concepto}
                      onChange={(e) => handleActualizarGasto(gasto.id, 'concepto', e.target.value)}
                      placeholder="Ej: Combustible, Peaje, Reparación"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-gray-600">Monto</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        type="number"
                        value={gasto.monto}
                        onChange={(e) => handleActualizarGasto(gasto.id, 'monto', e.target.value)}
                        placeholder="0"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEliminarGasto(gasto.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-5"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-end pt-2 border-t border-gray-200">
                <div className="text-right">
                  <span className="text-sm text-gray-600">Total Gastos: </span>
                  <span className="text-red-600">${totalGastos.toLocaleString('es-AR')}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumen y Botón Guardar */}
      <Card className="bg-slate-50">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Deuda Actual:</span>
              <span className={deudaActual > 0 ? 'text-red-600' : deudaActual < 0 ? 'text-green-600' : ''}>
                ${deudaActual.toLocaleString('es-AR')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Monto a Pagar:</span>
              <span>+${(parseFloat(montoPagar) || 0).toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Pagos:</span>
              <span className="text-green-600">-${totalPagos.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Gastos:</span>
              <span className="text-red-600">-${totalGastos.toLocaleString('es-AR')}</span>
            </div>
            <div className="border-t border-gray-300 pt-3 flex justify-between items-center">
              <span className="text-gray-900">Deuda Final:</span>
              <span
                className={`${
                  deudaFinal > 0 ? 'text-red-600' : deudaFinal < 0 ? 'text-green-600' : 'text-gray-900'
                }`}
              >
                ${deudaFinal.toLocaleString('es-AR')}
              </span>
            </div>
          </div>
          <Button onClick={handleGuardarRendicion} className="w-full mt-6 bg-blue-600 hover:bg-blue-700">
            Guardar Rendición
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
