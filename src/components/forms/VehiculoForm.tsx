// src/components/VehiculoForm.tsx
import React, { forwardRef, useImperativeHandle, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Define el schema de validación con Zod para Vehiculo
const vehiculoSchema = z.object({
  id_vehiculo: z.string().optional(),
  nombre_visible: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
  patente: z.string().min(6, { message: "La patente debe tener al menos 6 caracteres." }).regex(/^[A-Z0-9]+$/, { message: "La patente solo puede contener letras mayúsculas y números." }),
  tarifa_normal: z.coerce
    .number({ invalid_type_error: "La tarifa debe ser un número." })
    .nonnegative({ message: "La tarifa no puede ser negativa." }) // Cambiado a no negativo
    .optional().default(0),
  tarifa_especial: z.coerce
    .number({ invalid_type_error: "La tarifa debe ser un número." })
    .nonnegative({ message: "La tarifa no puede ser negativa." }) // Cambiado a no negativo
    .optional().default(0),
  // ✨ AÑADIDO "en taller" A LOS ESTADOS VÁLIDOS ✨
  estado: z.enum(['activo', 'mantenimiento', 'inactivo', 'en taller'], {
    message: "Debe seleccionar un estado válido.",
  }),
});

export type VehiculoFormData = z.infer<typeof vehiculoSchema>;

interface VehiculoFormProps {
  onSubmit: (data: VehiculoFormData) => void;
  defaultValues?: Partial<VehiculoFormData>;
  isLoading?: boolean;
}

export interface VehiculoFormHandle {
  submit: () => void;
}

const VehiculoForm = forwardRef<VehiculoFormHandle, VehiculoFormProps>(({ onSubmit, defaultValues, isLoading }, ref) => {
  const form = useForm<VehiculoFormData>({
    resolver: zodResolver(vehiculoSchema),
    defaultValues: {
      nombre_visible: defaultValues?.nombre_visible || '',
      patente: defaultValues?.patente || '',
      tarifa_normal: defaultValues?.tarifa_normal ? Number(defaultValues.tarifa_normal) : 0,
      tarifa_especial: defaultValues?.tarifa_especial ? Number(defaultValues.tarifa_especial) : 0,
      // Asegurar que el estado por defecto sea uno de los válidos
      estado: defaultValues?.estado && ['activo', 'mantenimiento', 'inactivo', 'en taller'].includes(defaultValues.estado)
              ? defaultValues.estado as 'activo' | 'mantenimiento' | 'inactivo' | 'en taller'
              : 'activo',
      id_vehiculo: defaultValues?.id_vehiculo,
    },
  });

  useImperativeHandle(ref, () => ({
    submit: () => {
      console.log("Disparando submit desde VehiculoForm"); // Log para confirmar
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
    });
  }, [defaultValues, form.reset]);

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
                  {/* ✨ AÑADIDO "En Taller" COMO OPCIÓN ✨ */}
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
});

export default VehiculoForm;

