// Asegúrate de tener estas importaciones si no estaban ya
import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './ui/button'; // Asume que tienes estos componentes Shadcn/UI
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

// Definimos un tipo para los datos que esperamos de la API
interface Chofer {
  id_chofer: string; // Nota: la API devuelve snake_case
  nombre_completo: string;
  telefono?: string; // Opcional
  vehiculo_asignado_id?: string; // Opcional
  deuda_actual: string | number; // Puede llegar como string o número
  estado: string;
}

export function ChoferesPage() {
  // Estado para guardar los chóferes, el estado de carga y errores
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // useEffect para cargar los datos cuando el componente se monta
  useEffect(() => {
    const fetchChoferes = async () => {
      setLoading(true);
      setError(null);
      try {
        // Llamamos a nuestra API en Vercel
        const response = await fetch('/api/getChoferes');
        if (!response.ok) {
          // Si la respuesta no es OK, intentamos leer el error del cuerpo
          const errorData = await response.json().catch(() => ({})); // Intenta parsear JSON, si falla, devuelve objeto vacío
          throw new Error(errorData.error || `Error HTTP: ${response.status}`);
        }
        const data = await response.json();

        // Validamos que data.choferes sea un array
        if (Array.isArray(data.choferes)) {
           setChoferes(data.choferes);
        } else {
           console.error("La respuesta de la API no contiene un array 'choferes':", data);
           throw new Error("Formato de respuesta inesperado de la API.");
        }

      } catch (e) {
        console.error("Error al obtener chóferes:", e);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };

    fetchChoferes();
  }, []); // El array vacío [] significa que esto se ejecuta solo una vez

  // --- Renderizado Condicional ---
  let content;
  if (loading) {
    content = (
      <TableRow>
        <TableCell colSpan={5} className="text-center">
          Cargando chóferes...
        </TableCell>
      </TableRow>
    );
  } else if (error) {
    content = (
      <TableRow>
        <TableCell colSpan={5} className="text-center text-red-600">
          <strong>Error al cargar:</strong> {error}
        </TableCell>
      </TableRow>
    );
  } else if (choferes.length === 0) {
    content = (
      <TableRow>
        <TableCell colSpan={5} className="text-center">
          No hay chóferes registrados.
        </TableCell>
      </TableRow>
    );
  } else {
    // Si hay datos, mapeamos sobre ellos
    content = choferes.map((chofer) => {
      // Convertimos deuda a número y manejamos errores
      const deudaNum = parseFloat(String(chofer.deuda_actual)) || 0;
      // Convertimos estado a minúsculas para comparar de forma segura
      const estadoLower = String(chofer.estado || '').toLowerCase();

      return (
        <TableRow key={chofer.id_chofer}>
          <TableCell>{chofer.nombre_completo || '-'}</TableCell>
          <TableCell className="text-right">
            <span
              className={
                deudaNum > 0
                  ? 'text-red-600 font-semibold' // Más énfasis
                  : deudaNum < 0
                  ? 'text-green-600 font-semibold'
                  : 'text-gray-900'
              }
            >
              ${deudaNum.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </TableCell>
          <TableCell>
            {deudaNum > 0 ? (
              <div className="flex items-center space-x-1 text-red-600"> {/* Menos espacio */}
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs">Debe</span> {/* Texto más pequeño */}
              </div>
            ) : deudaNum < 0 ? (
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs">A favor</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-gray-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs">Al día</span>
              </div>
            )}
          </TableCell>
          <TableCell>
            <Badge
              // variant={estadoLower === 'activo' ? 'default' : 'outline'} <-- Variant puede causar conflicto con clases
              className={
                estadoLower === 'activo'
                  ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300' // Estilo más claro
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300' // Estilo inactivo
              }
            >
              {/* Capitalizamos el estado */}
              {estadoLower.charAt(0).toUpperCase() + estadoLower.slice(1) || 'N/A'}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end space-x-1"> {/* Menos espacio */}
              {/* Añadir onClick handlers para la funcionalidad */}
              <Button variant="ghost" size="icon" className="h-8 w-8"> {/* Botones más pequeños */}
                <Edit className="w-4 h-4 text-blue-600" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
    });
  }


  // --- JSX Final ---
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6"> {/* Añadido padding */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0"> {/* Mejor responsividad */}
            <div className="flex items-center space-x-2"> {/* Menos espacio */}
              <Users className="w-5 h-5 text-blue-600" /> {/* Icono un poco más pequeño */}
              <CardTitle className="text-xl">Gestión de Chóferes</CardTitle> {/* Tamaño de título ajustado */}
            </div>
            {/* Añadir onClick handler para abrir modal/formulario */}
            <Button className="bg-blue-600 hover:bg-blue-700 text-sm h-9"> {/* Botón un poco más pequeño */}
              <Plus className="w-4 h-4 mr-1" />
              Agregar Chofer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto"> {/* Añadido overflow para tablas anchas en móvil */}
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
                {content}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}