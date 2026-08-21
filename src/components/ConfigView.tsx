import React, { useState, useRef } from 'react';
import { AppState, AuditSectionConfig, AuditItemConfig } from '../types';
import { ArrowLeft, Save, Plus, Trash2, Edit2, Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { saveConfigToCloud } from '../lib/firebase';

interface ConfigViewProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

// ─────────────────────────────────────────────────────────
// Robust CSV Parser
// Supports: Comma (,), Semicolon (;), Tab (\t)
// Auto-detects headers (Sección, Ítem/Criterio, Penalidad/Puntos)
// ─────────────────────────────────────────────────────────
function parseCSVToConfig(csvText: string): { sections: AuditSectionConfig[]; totalItems: number; error: string | null } {
  try {
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return { sections: [], totalItems: 0, error: 'El archivo CSV está vacío.' };

    // Auto-detect delimiter
    const sampleLine = lines[0];
    let delimiter = ',';
    if (sampleLine.includes(';') && sampleLine.split(';').length > sampleLine.split(',').length) delimiter = ';';
    if (sampleLine.includes('\t') && sampleLine.split('\t').length > sampleLine.split(',').length) delimiter = '\t';

    // Helper to split row handling quotes
    const parseRow = (rowStr: string) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < rowStr.length; i++) {
        const char = rowStr[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      return result;
    };

    const firstRow = parseRow(lines[0]);
    let secCol = 0;
    let itemCol = 1;
    let penaltyCol = 2;
    let startIndex = 0;

    // Check if first row is a header
    const lowerFirst = firstRow.map(c => c.toLowerCase());
    const isHeader = lowerFirst.some(c =>
      c.includes('seccion') || c.includes('sección') || c.includes('categoria') || c.includes('categoría') ||
      c.includes('item') || c.includes('ítem') || c.includes('criterio') || c.includes('descripcion') ||
      c.includes('penalidad') || c.includes('puntos') || c.includes('peso') || c.includes('resta')
    );

    if (isHeader) {
      startIndex = 1;
      lowerFirst.forEach((h, idx) => {
        if (h.includes('seccion') || h.includes('sección') || h.includes('categoria') || h.includes('categoría') || h.includes('modulo') || h.includes('módulo') || h.includes('area') || h.includes('área')) {
          secCol = idx;
        } else if (h.includes('item') || h.includes('ítem') || h.includes('criterio') || h.includes('pregunta') || h.includes('descripcion') || h.includes('descripción') || h.includes('evaluacion') || h.includes('evaluación')) {
          itemCol = idx;
        } else if (h.includes('penalidad') || h.includes('puntos') || h.includes('peso') || h.includes('resta') || h.includes('penalty')) {
          penaltyCol = idx;
        }
      });
    }

    const sectionMap = new Map<string, AuditItemConfig[]>();
    let itemCount = 0;

    for (let i = startIndex; i < lines.length; i++) {
      const cols = parseRow(lines[i]);
      if (cols.length < 2) continue; // Skip incomplete lines

      const secTitle = cols[secCol] || 'Sección General';
      const itemText = cols[itemCol] || cols[0] || '';
      if (!itemText) continue;

      const rawPen = cols[penaltyCol] !== undefined ? parseInt(cols[penaltyCol].replace(/\D/g, ''), 10) : 1;
      const penalty = isNaN(rawPen) || rawPen <= 0 ? 1 : rawPen;

      if (!sectionMap.has(secTitle)) {
        sectionMap.set(secTitle, []);
      }

      itemCount++;
      sectionMap.get(secTitle)!.push({
        id: `csv_${Date.now()}_${i}`,
        text: itemText,
        defaultPenalty: penalty
      });
    }

    if (sectionMap.size === 0) {
      return { sections: [], totalItems: 0, error: 'No se pudieron extraer ítems válidos del archivo CSV.' };
    }

    const sections: AuditSectionConfig[] = Array.from(sectionMap.entries()).map(([title, items], idx) => ({
      id: `sec_${Date.now()}_${idx}`,
      title,
      items
    }));

    return { sections, totalItems: itemCount, error: null };
  } catch (err: any) {
    return { sections: [], totalItems: 0, error: `Error al leer el archivo CSV: ${err?.message || 'Formato no soportado'}` };
  }
}

export function ConfigView({ state, setState }: ConfigViewProps) {
  const [localConfig, setLocalConfig] = useState<AuditSectionConfig[]>(state.config);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      return { ...sec, items: [...sec.items, newItem] };
    }));
  };

  const handleDeleteItem = (sectionId: string, itemId: string) => {
    setLocalConfig(prev => prev.map(sec => {
      if (sec.id !== sectionId) return sec;
      return { ...sec, items: sec.items.filter(item => item.id !== itemId) };
    }));
  };

  const handleAddSection = () => {
    const newSec: AuditSectionConfig = {
      id: `sec_${Date.now()}`,
      title: 'Nueva Sección de Auditoría',
      items: [
        { id: `i_${Date.now()}`, text: 'Primer Criterio de Evaluación', defaultPenalty: 2 }
      ]
    };
    setLocalConfig(prev => [...prev, newSec]);
  };

  const handleDeleteSection = (sectionId: string) => {
    if (localConfig.length <= 1) {
      alert('Debe existir al menos una sección en el checklist.');
      return;
    }
    if (confirm('¿Estás seguro de eliminar esta sección completa con sus ítems?')) {
      setLocalConfig(prev => prev.filter(s => s.id !== sectionId));
    }
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const { sections, totalItems, error } = parseCSVToConfig(content);
      if (error) {
        setImportStatus({ type: 'error', message: error });
      } else {
        setLocalConfig(sections);
        setImportStatus({
          type: 'success',
          message: `¡Matriz cargada exitosamente! ${sections.length} secciones y ${totalItems} ítems importados.`
        });
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleDownloadTemplate = () => {
    const templateCSV = `Seccion,Criterio,Penalidad
Área de Descanso,Estado y tensión de sábanas/almohadas,2
Área de Descanso,Pulcritud e inspección bajo la cama,3
Área de Descanso,Respaldo y cabecera sin polvo ni daños,1
Minibar y Estación de Café,Inventario completo,2
Minibar y Estación de Café,Fechas de caducidad vigentes,5
Baño y Amenidades,Higiene de grifería y mamparas,4
Baño y Amenidades,Sellos de desinfección en inodoro,5`;

    const blob = new Blob(['\uFEFF' + templateCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'matriz_auditoria_plantilla.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    setState(prev => ({ ...prev, config: localConfig, view: 'rooms' }));
    await saveConfigToCloud(localConfig);
  };

  const totalItemsCount = localConfig.reduce((acc, sec) => acc + sec.items.length, 0);

  return (
    <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)', minHeight: '100%' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px 16px 80px' }}>

        {/* Back button */}
        <button
          type="button"
          onClick={() => setState(prev => ({ ...prev, view: 'rooms' }))}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '999px', padding: '8px 16px', marginBottom: '20px',
            cursor: 'pointer', color: '#cbd5e1', fontSize: '12px', fontWeight: 700
          }}
        >
          <ArrowLeft style={{ width: '14px', height: '14px' }} />
          Volver
        </button>

        {/* Title */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <FileSpreadsheet style={{ width: '20px', height: '20px', color: '#818cf8' }} />
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#818cf8', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Matriz de Evaluación
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#f1f5f9', margin: 0, letterSpacing: '-0.3px' }}>
            Configuración de Checklist
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
            Personaliza las secciones, ítems y penalidades o carga tu propia matriz en CSV.
          </p>
        </div>

        {/* CSV Import Banner Card */}
        <div style={{
          background: 'rgba(99,102,241,0.08)', border: '1px dashed rgba(99,102,241,0.3)',
          borderRadius: '16px', padding: '16px', marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Upload style={{ width: '16px', height: '16px', color: '#818cf8' }} />
                Importar Matriz desde CSV / Excel
              </h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                Sube tu hoja de cálculo guardada como `.csv`. La app organizará automáticamente las secciones, ítems y puntajes de resta.
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,application/vnd.ms-excel"
                onChange={handleCSVUpload}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
                  fontSize: '12px', fontWeight: 800, boxShadow: '0 4px 14px rgba(99,102,241,0.4)'
                }}
              >
                <Upload style={{ width: '14px', height: '14px' }} />
                Subir Archivo CSV
              </button>

              <button
                onClick={handleDownloadTemplate}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '10px 16px', borderRadius: '10px', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  color: '#94a3b8', fontSize: '12px', fontWeight: 700
                }}
              >
                <Download style={{ width: '14px', height: '14px' }} />
                Descargar Plantilla CSV
              </button>
            </div>

            {importStatus && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '10px',
                background: importStatus.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                border: `1px solid ${importStatus.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: importStatus.type === 'success' ? '#34d399' : '#f87171', fontSize: '12px', fontWeight: 600
              }}>
                {importStatus.type === 'success' ? <CheckCircle2 style={{ width: '16px', height: '16px', flexShrink: 0 }} /> : <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />}
                {importStatus.message}
              </div>
            )}
          </div>
        </div>

        {/* Header toolbar stats & save */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8' }}>
              {localConfig.length} secciones · {totalItemsCount} ítems configurados
            </span>
          </div>

          <button
            onClick={handleSave}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '12px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff',
              fontSize: '13px', fontWeight: 800, boxShadow: '0 4px 16px rgba(16,185,129,0.35)'
            }}
          >
            <Save style={{ width: '16px', height: '16px' }} />
            Guardar Cambios
          </button>
        </div>

        {/* Config List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {localConfig.map((section, secIdx) => (
            <div key={section.id} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px', overflow: 'hidden'
            }}>
              {/* Section title header */}
              <div style={{
                padding: '12px 16px', background: 'rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <span style={{ fontSize: '10px', fontWeight: 900, color: '#818cf8', background: 'rgba(99,102,241,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                    0{secIdx + 1}
                  </span>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setLocalConfig(prev => prev.map(s => s.id === section.id ? { ...s, title: newTitle } : s));
                    }}
                    style={{
                      background: 'transparent', border: 'none', color: '#f1f5f9',
                      fontSize: '15px', fontWeight: 800, outline: 'none', width: '100%'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => handleAddItem(section.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                      color: '#818cf8', fontSize: '11px', fontWeight: 700,
                      padding: '5px 10px', borderRadius: '8px', cursor: 'pointer'
                    }}
                  >
                    <Plus style={{ width: '13px', height: '13px' }} />
                    Ítem
                  </button>
                  <button
                    onClick={() => handleDeleteSection(section.id)}
                    style={{
                      background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                      color: '#f87171', padding: '5px 8px', borderRadius: '8px', cursor: 'pointer'
                    }}
                    title="Eliminar Sección"
                  >
                    <Trash2 style={{ width: '13px', height: '13px' }} />
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div style={{ padding: '8px 16px' }}>
                {section.items.map((item, itemIdx) => (
                  <div key={item.id} style={{
                    padding: '10px 0',
                    borderBottom: itemIdx < section.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    display: 'flex', flexDirection: 'column', gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <Edit2 style={{ width: '14px', height: '14px', color: '#475569', marginTop: '6px', flexShrink: 0 }} />
                      <textarea
                        value={item.text}
                        onChange={(e) => handleItemChange(section.id, item.id, 'text', e.target.value)}
                        rows={2}
                        style={{
                          flex: 1, background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px',
                          color: '#f1f5f9', fontSize: '13px', padding: '8px',
                          outline: 'none', resize: 'vertical', fontFamily: 'inherit'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Resta:</span>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={item.defaultPenalty}
                          onChange={(e) => handleItemChange(section.id, item.id, 'defaultPenalty', parseInt(e.target.value) || 1)}
                          style={{
                            width: '50px', background: 'rgba(239,68,68,0.12)',
                            border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px',
                            color: '#f87171', fontSize: '13px', fontWeight: 800,
                            textAlign: 'center', padding: '3px 0', outline: 'none'
                          }}
                        />
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>pts</span>
                      </div>

                      <button
                        onClick={() => handleDeleteItem(section.id, item.id)}
                        style={{
                          background: 'transparent', border: 'none', color: '#475569',
                          cursor: 'pointer', padding: '4px', borderRadius: '6px'
                        }}
                        title="Eliminar Ítem"
                      >
                        <Trash2 style={{ width: '14px', height: '14px' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Add section button */}
        <button
          onClick={handleAddSection}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '14px', borderRadius: '14px', border: '1px dashed rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.03)', color: '#818cf8', fontSize: '13px', fontWeight: 700,
            cursor: 'pointer', marginBottom: '24px'
          }}
        >
          <Plus style={{ width: '16px', height: '16px' }} />
          Añadir Nueva Sección
        </button>

        {/* Save button floating/bottom */}
        <button
          onClick={handleSave}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '16px', borderRadius: '16px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff',
            fontSize: '14px', fontWeight: 800, boxShadow: '0 6px 24px rgba(16,185,129,0.35)'
          }}
        >
          <Save style={{ width: '18px', height: '18px' }} />
          Guardar Matriz Completa
        </button>

      </div>
    </div>
  );
}
