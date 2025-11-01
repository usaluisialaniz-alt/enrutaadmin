// src/components/ChoferForm.tsx
import React, { forwardRef, useImperativeHandle } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Define el schema de validación con Zod
const choferSchema = z.object({
  id_chofer: z.string().optional(),
  nombre_completo: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
  telefono: z.string().optional().refine(val => !val || /^\+?\d{7,}$/.test(val), {
    message: "Ingrese un número de teléfono válido (al menos 7 dígitos, opcionalmente con '+').",
  }),
  deuda_actual: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val),
    z.number().optional().default(0)
  ),
  // ✨ CORRECCIÓN AQUÍ: Usar 'message' en lugar de 'required_error'
  estado: z.enum(['activo', 'inactivo'], {
    message: "Debe seleccionar un estado válido (activo o inactivo).", // Mensaje genérico para el enum
    // Zod maneja el error de "requerido" automáticamente si el campo no es opcional.
    // Si necesitas un mensaje específico *solo* para cuando está vacío,
    // podrías hacerlo con .refine(), pero usualmente no es necesario con enums.
  }),
});

export type ChoferFormData = z.infer<typeof choferSchema>;

interface ChoferFormProps {
  onSubmit: (data: ChoferFormData) => void;
  defaultValues?: Partial<ChoferFormData>; // Usar Partial para evitar errores de tipo con defaultValues
  isLoading?: boolean;
}

// Definimos el tipo para la Ref que expondremos
export interface ChoferFormHandle {
  submit: () => void;
}

// Envolvemos el componente con forwardRef
const ChoferForm = forwardRef<ChoferFormHandle, ChoferFormProps>(({ onSubmit, defaultValues, isLoading }, ref) => {
  const form = useForm<ChoferFormData>({
    resolver: zodResolver(choferSchema),
    // Usamos los defaultValues directamente, asegurando tipos correctos
    defaultValues: {
      nombre_completo: defaultValues?.nombre_completo || '',
      telefono: defaultValues?.telefono || '',
      deuda_actual: defaultValues?.deuda_actual ? Number(defaultValues.deuda_actual) : 0,
      estado: defaultValues?.estado || 'activo',
      id_chofer: defaultValues?.id_chofer,
    },
  });

  // Exponemos el método submit a través de la ref
  useImperativeHandle(ref, () => ({
    submit: () => {
      form.handleSubmit(onSubmit)();
    }
  }));

  // Reseteamos el formulario si los defaultValues cambian
  React.useEffect(() => {
        form.reset({
            nombre_completo: defaultValues?.nombre_completo || '',
            telefono: defaultValues?.telefono || '',
            deuda_actual: defaultValues?.deuda_actual ? Number(defaultValues.deuda_actual) : 0,
            estado: defaultValues?.estado || 'activo',
            id_chofer: defaultValues?.id_chofer,
        });
    }, [defaultValues, form.reset]);


  return (
    <Form {...form}>
      <form className="space-y-4">
        {/* Campo Nombre Completo */}
        <FormField
          control={form.control}
          name="nombre_completo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre Completo *</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Juan Pérez" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Campo Teléfono */}
        <FormField
          control={form.control}
          name="telefono"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input placeholder="Ej: +542641234567" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Campo Deuda Actual */}
        <FormField
          control={form.control}
          name="deuda_actual"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deuda Actual</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                   // Convertir a número o undefined si está vacío
                   onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                   value={field.value ?? ''}
                   disabled={isLoading}
                />
              </FormControl>
              <FormDescription>Positivo si debe, negativo si es a favor.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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

export default ChoferForm;
