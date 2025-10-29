// src/components/ui/ActionModal.tsx
// Nota: La ruta de importación de Button se corrigió previamente
import React, { useRef } from 'react';
import { Button } from '@/components/ui/button'; 
import { Trash2, Edit, Plus } from 'lucide-react';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string; // Descripción opcional, ya que el form puede tenerla
  confirmLabel: string;
  onConfirm: () => void; // El modal solo llama a onConfirm
  type: 'add' | 'edit' | 'delete';
  children?: React.ReactNode; // Para renderizar el formulario
  isConfirming?: boolean; // Para mostrar estado de carga en el botón Confirmar
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
  isConfirming = false, // Valor por defecto
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    add: { icon: Plus, bgColor: 'bg-green-600', hoverBg: 'hover:bg-green-700' },
    edit: { icon: Edit, bgColor: 'bg-blue-600', hoverBg: 'hover:bg-blue-700' },
    delete: { icon: Trash2, bgColor: 'bg-red-600', hoverBg: 'hover:bg-red-700' },
  };

  const { icon: Icon, bgColor, hoverBg } = typeStyles[type];
  
  // Ref para detectar clics fuera del modal y cerrarlo
  const modalRef = useRef<HTMLDivElement>(null);
  const handleOutsideClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current === event.target) {
      onClose();
    }
  };

  return (
    <div 
      ref={modalRef}
      onClick={handleOutsideClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 transition-opacity duration-300 backdrop-blur-sm"
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-6 transform transition-transform duration-300 scale-100 animate-in fade-in-0 zoom-in-95">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-4 border-b pb-3">
          <Icon className={`w-6 h-6 ${type === 'delete' ? 'text-red-600' : 'text-blue-600'}`} />
          <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
        </div>
        
        {/* Content */}
        {description && <p className="text-sm text-gray-700 mb-6">{description}</p>}
        
        {/* Renderiza el formulario (o el mensaje de confirmación) */}
        <div className="max-h-[60vh] overflow-y-auto pr-2"> {/* Permite scroll si el form es largo */}
            {children}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isConfirming} className="text-gray-700">
            Cancelar
          </Button>
          <Button  variant="outline"
            className={`${bgColor} ${hoverBg} text-black`} 
            onClick={onConfirm} // El botón Confirmar llama a onConfirm (que ahora disparará el submit del form)
            disabled={isConfirming}
          >
            {isConfirming ? 'Procesando...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ActionModal;
