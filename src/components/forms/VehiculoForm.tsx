import React, { forwardRef, useImperativeHandle, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// --- INTERFAZ PARA EL PROP DE CHOFERES ---
interface Chofer {
  id_chofer: string;
  nombre_completo: string;
}

// Define el schema de validación con Zod para Vehiculo
const vehiculoSchema = z.object({
  id_vehiculo: z.string().optional(),
  nombre_visible: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
  patente: z.string().min(6, { message: "La patente debe tener al menos 6 caracteres." }).regex(/^[A-Z0-9]+$/, { message: "La patente solo puede contener letras mayúsculas y números." }),
  tarifa_normal: z.coerce
    .number({ error: "La tarifa debe ser un número." })
    .nonnegative({ message: "La tarifa no puede ser negativa." })
    .optional().default(0),
  tarifa_especial: z.coerce
    .number({ error: "La tarifa debe ser un número." })
    .nonnegative({ message: "La tarifa no puede ser negativa." })
    .optional().default(0),
  estado: z.enum(['activo', 'mantenimiento', 'inactivo', 'en taller'], {
    message: "Debe seleccionar un estado válido.",
  }),
  choferId: z.string().nullable().optional(),
});

// El tipo se infiere automáticamente del schema (ahora incluye choferId)
export type VehiculoFormData = z.infer<typeof vehiculoSchema>;

interface VehiculoFormProps {
  onSubmit: (data: VehiculoFormData) => void;
  defaultValues?: Partial<VehiculoFormData>;
  isLoading?: boolean;
  choferes?: Chofer[]; 
  // Lista de choferes (opcional, por si no carga)
}

export interface VehiculoFormHandle {
  submit: () => void;
}

const VehiculoForm = forwardRef<VehiculoFormHandle, VehiculoFormProps>(
  // --- CAMBIO 3: RECIBIR 'choferes' DE LAS PROPS ---
  ({ onSubmit, defaultValues, isLoading, choferes = [] }, ref) => {
    const form = useForm<VehiculoFormData>({
      resolver: zodResolver(vehiculoSchema),
      defaultValues: {
        nombre_visible: defaultValues?.nombre_visible || '',
        patente: defaultValues?.patente || '',
        tarifa_normal: defaultValues?.tarifa_normal ? Number(defaultValues.tarifa_normal) : 0,
        tarifa_especial: defaultValues?.tarifa_especial ? Number(defaultValues.tarifa_especial) : 0,
        estado: defaultValues?.estado && ['activo', 'mantenimiento', 'inactivo', 'en taller'].includes(defaultValues.estado)
                ? defaultValues.estado as 'activo' | 'mantenimiento' | 'inactivo' | 'en taller'
                : 'activo',
        id_vehiculo: defaultValues?.id_vehiculo,
        choferId: defaultValues?.choferId || null,
      },
    });

    useImperativeHandle(ref, () => ({
      submit: () => {
        console.log("Disparando submit desde VehiculoForm");
        form.handleSubmit(onSubmit)();
      }
    }));

    // Resetear el form si cambian los defaultValues
    useEffect(() => {
      form.reset({
        nombre_visible: defaultValues?.nombre_visible || '',
        patente: defaultValues?.patente || '',
        tarifa_normal: defaultValues?.tarifa_normal ? Number(defaultValues.tarifa_normal) : 0,
        tarifa_especial: defaultValues?.tarifa_especial ? Number(defaultValues.tarifa_especial) : 0,
        estado: defaultValues?.estado && ['activo', 'mantenimiento', 'inactivo', 'en taller'].includes(defaultValues.estado)
                ? defaultValues.estado as 'activo' | 'mantenimiento' | 'inactivo' | 'en taller'
                : 'activo',
        id_vehiculo: defaultValues?.id_vehiculo,
        // --- CAMBIO 5: AÑADIR 'choferId' AL RESET ---
        choferId: defaultValues?.choferId || null,
      });
    }, [defaultValues, form.reset]); // 'form.reset' es una dependencia estable

    return (
      <Form {...form}>
        <form className="space-y-4">
          {/* Campo Nombre Visible */}
          <FormField
            control={form.control}
            name="nombre_visible"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre Visible *</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Corolla Gris" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo Patente */}
          <FormField
            control={form.control}
            name="patente"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patente *</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: AB123CD" {...field} disabled={isLoading} style={{ textTransform: 'uppercase' }} />
                </FormControl>
                <FormDescription>Formato AA123BB o AB123CD.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* --- CAMBIO 6: AÑADIR CAMPO <Select> PARA CHOFER --- */}
          <FormField
            control={form.control}
            name="choferId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chofer Asignado</FormLabel>
                <Select
                  // Convertimos 'null' al string "null" para el Select, y viceversa
                  onValueChange={(value) => field.onChange(value === "null" ? null : value)}
                  value={field.value ?? "null"} // Si es null o undefined, usa "null"
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un chofer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {/* Opción para "Sin Asignar" */}
                    <SelectItem value="null">Sin Asignar</SelectItem>
                    
                    {/* Mapea la lista de choferes recibida por props */}
                    {choferes.map((chofer) => (
                      <SelectItem key={chofer.id_chofer} value={chofer.id_chofer}>
                        {chofer.nombre_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            {/* Campo Tarifa Normal */}
            <FormField
              control={form.control}
              name="tarifa_normal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tarifa Normal *</FormLabel>
                  <FormControl>
                    <Input
                      type="number" step="1" min="0" placeholder="0" {...field}
                      onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      value={field.value ?? ''} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo Tarifa Especial */}
            <FormField
              control={form.control}
              name="tarifa_especial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tarifa Especial *</FormLabel>
                  <FormControl>
                    <Input
                      type="number" step="1" min="0" placeholder="0" {...field}
                      onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      value={field.value ?? ''} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Campo Estado */}
          <FormField
            control={form.control}
            name="estado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                    <SelectItem value="en taller">En Taller</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    );
  }
);

export default VehiculoForm;

