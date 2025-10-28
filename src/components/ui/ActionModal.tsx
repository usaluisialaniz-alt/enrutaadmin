// src/components/ActionModal.tsx
import React from 'react';
import { Button } from '@/components/ui/button'; // 👈 RUTA CORREGIDA: De './ui/button' a '@/components/ui/button'
import { Trash2, Edit, Plus } from 'lucide-react';
// Simulamos un componente Dialog/Modal simple con Tailwind para reemplazar Shadcn Dialog

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  type: 'add' | 'edit' | 'delete';
  children?: React.ReactNode;
}

const ActionModal: React.FC<ActionModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel,
  onConfirm,
  type,
  children,
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    add: { icon: Plus, bgColor: 'bg-green-600', hoverBg: 'hover:bg-green-700' },
    edit: { icon: Edit, bgColor: 'bg-blue-600', hoverBg: 'hover:bg-blue-700' },
    delete: { icon: Trash2, bgColor: 'bg-red-600', hoverBg: 'hover:bg-red-700' },
  };

  const { icon: Icon, bgColor, hoverBg } = typeStyles[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 transition-opacity duration-300">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <Icon className={`w-6 h-6 ${type === 'delete' ? 'text-red-600' : 'text-blue-600'}`} />
          <h3 className="text-xl font-semibold">{title}</h3>
        </div>
        
        {/* Content */}
        <p className="text-sm text-gray-700 mb-6">{description}</p>
        
        {children} {/* Aquí iría el formulario de edición/creación */}

        {/* Footer */}
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onClose} className="text-gray-700">
            Cancelar
          </Button>
          <Button 
            className={`${bgColor} ${hoverBg} text-white`} 
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ActionModal;
