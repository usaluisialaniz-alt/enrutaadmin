import { useState } from 'react';
import { Car, Users, ClipboardList, History, Menu, X, Wallet } from 'lucide-react';
import { OperacionesPage } from './components/OperacionesPage';
import { FlotaPage } from './components/FlotaPage';
import { ChoferesPage } from './components/ChoferesPage';
import { HistorialPage } from './components/HistorialPage';
import { CajaPage } from './components/CajaPage';
import { Button } from './components/ui/button';
import '@/styles/calendar.css'; 

type Module = 'operaciones' | 'caja' | 'flota' | 'choferes' | 'historial';

export default function App() {
  const [activeModule, setActiveModule] = useState<Module>('operaciones');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const modules = [
    { id: 'operaciones' as Module, name: 'Operaciones', icon: ClipboardList },
    { id: 'caja' as Module, name: 'Caja', icon: Wallet },
    { id: 'flota' as Module, name: 'Flota', icon: Car },
    { id: 'choferes' as Module, name: 'Chóferes', icon: Users },
    { id: 'historial' as Module, name: 'Historial', icon: History },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-slate-800 text-white transition-all duration-300 overflow-hidden`}
      >
        <div className="p-6">
          <h1 className="text-white mb-8">Sistema de Alquiler</h1>
          <nav className="space-y-2">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <button
                  key={module.id}
                  onClick={() => setActiveModule(module.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeModule === module.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{module.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <h2 className="text-gray-800">
              {modules.find((m) => m.id === activeModule)?.name}
            </h2>
          </div>
          <div className="text-gray-600 text-sm">
            {new Date().toLocaleDateString('es-AR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {activeModule === 'operaciones' && <OperacionesPage />}
          {activeModule === 'caja' && <CajaPage />}
          {activeModule === 'flota' && <FlotaPage />}
          {activeModule === 'choferes' && <ChoferesPage />}
          {activeModule === 'historial' && <HistorialPage />}
        </main>
      </div>
    </div>
  );
}
