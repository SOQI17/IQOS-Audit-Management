import React, { useState } from 'react';
import { AppState, AuditSectionConfig, AuditItemConfig } from '../types';
import { ArrowLeft, Save, Plus, Trash2, Edit2 } from 'lucide-react';
import { saveConfigToCloud } from '../lib/firebase';

interface ConfigViewProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export function ConfigView({ state, setState }: ConfigViewProps) {
  const [localConfig, setLocalConfig] = useState<AuditSectionConfig[]>(state.config);

  const handleItemChange = (sectionId: string, itemId: string, field: keyof AuditItemConfig, value: string | number) => {
    setLocalConfig(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        items: sec.items.map(item => {
          if (item.id !== itemId) return item;
          return { ...item, [field]: value };
        })
      };
    }));
  };

  const handleAddItem = (sectionId: string) => {
    const newItem: AuditItemConfig = {
      id: `i${Date.now()}`,
      text: 'Nuevo Ítem de Auditoría',
      defaultPenalty: 1
    };
    
    setLocalConfig(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        items: [...sec.items, newItem]
      };
    }));
  };

  const handleDeleteItem = (sectionId: string, itemId: string) => {
    setLocalConfig(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        items: sec.items.filter(item => item.id !== itemId)
      };
    }));
  };

  const handleSave = async () => {
    setState(prev => ({ ...prev, config: localConfig, view: 'rooms' }));
    await saveConfigToCloud(localConfig);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 relative">
      <button
        type="button"
        onClick={() => setState(prev => ({ ...prev, view: 'rooms' }))}
        className="absolute top-6 left-6 text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-widest"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Volver</span>
      </button>

      <div className="flex items-center justify-between mb-8 mt-8 sm:mt-0">
        <div className="pl-0 sm:pl-24">
          <h1 className="text-2xl font-bold text-slate-800">Configuración de Checklist</h1>
          <p className="text-sm text-slate-500 mt-1">Modifica los ítems y ajusta las penalidades de la auditoría.</p>
        </div>
        <button
          onClick={handleSave}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          <Save className="mr-2 h-4 w-4" />
          Guardar Cambios
        </button>
      </div>

      <div className="space-y-8">
        {localConfig.map(section => (
          <div key={section.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <div className="bg-white px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-slate-500 rounded-full"></span>
                {section.title}
              </h2>
              <button
                onClick={() => handleAddItem(section.id)}
                className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center hover:text-blue-800 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Añadir Ítem
              </button>
            </div>
            <div className="divide-y divide-slate-200">
              {section.items.map(item => (
                <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 flex items-start gap-3">
                    <Edit2 className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                    <textarea
                      value={item.text}
                      onChange={(e) => handleItemChange(section.id, item.id, 'text', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none min-h-[40px] resize-y"
                    />
                  </div>
                  <div className="flex items-center space-x-4 shrink-0">
                    <div className="flex items-center bg-white border border-slate-300 rounded-md px-2 py-1">
                      <span className="text-xs font-bold text-slate-400 uppercase mr-2">Resta:</span>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={item.defaultPenalty}
                        onChange={(e) => handleItemChange(section.id, item.id, 'defaultPenalty', parseInt(e.target.value) || 0)}
                        className="w-12 text-center text-sm font-bold text-red-600 outline-none"
                      />
                      <span className="text-xs text-slate-400 font-bold ml-1">pts</span>
                    </div>
                    <button
                      onClick={() => handleDeleteItem(section.id, item.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Eliminar Ítem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {section.items.length === 0 && (
                <div className="p-6 text-center text-sm text-slate-500 italic">
                  No hay ítems en esta sección.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
