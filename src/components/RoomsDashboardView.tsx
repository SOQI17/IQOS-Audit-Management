import React, { useRef, useState } from 'react';
import { AppState, SavedAudit } from '../types';
import {
  ArrowLeft, Plus, Settings, Calendar, BedDouble,
  User, Building2, CheckCircle2, AlertTriangle,
  Clock, BarChart3, Search, Upload, FileSpreadsheet, Check
} from 'lucide-react';
import { parseMasterMatrixCSV } from '../lib/excelImporter';

interface RoomsDashboardViewProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export function RoomsDashboardView({ state, setState }: RoomsDashboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleNewAudit = () => {
    setState(prev => ({
      ...prev,
      view: 'setup',
      audit: { ...prev.audit, itemStates: {} }
    }));
  };

  const handleConfig = () => setState(prev => ({ ...prev, view: 'config' }));

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const { config, audits, totalAuditsImported, totalItemsCount, error } = parseMasterMatrixCSV(content);

      if (error) {
        alert(error);
        return;
      }

      setState(prev => {
        // Merge imported audits with existing ones, preventing exact duplicate IDs
        const existingIds = new Set(prev.savedAudits.map(a => a.id));
        const newAudits = audits.filter(a => !existingIds.has(a.id));
        const updatedSaved = [...newAudits, ...prev.savedAudits].sort((a, b) => b.timestamp - a.timestamp);

        // Update config if valid items found
        const updatedConfig = config.length > 0 ? config : prev.config;

        return {
          ...prev,
          config: updatedConfig,
          savedAudits: updatedSaved
        };
      });

      setImportNotice(`¡Carga exitosa! Se importaron ${totalAuditsImported} auditorías completas y ${totalItemsCount} ítems del Excel.`);
      setTimeout(() => setImportNotice(null), 6000);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const { savedAudits } = state;
  const totalAudits = savedAudits.length;
  const passedAudits = savedAudits.filter(a => a.finalScore >= a.maxScore * 0.8).length;
  const avgScore = totalAudits > 0
    ? Math.round(savedAudits.reduce((acc, a) => acc + (a.finalScore / a.maxScore) * 100, 0) / totalAudits)
    : 0;
  const lastDate = totalAudits > 0
    ? new Date(Math.max(...savedAudits.map(a => a.timestamp)))
        .toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    : '—';

  const filtered = savedAudits
    .filter(a => {
      const q = searchQuery.toLowerCase();
      return !q || a.roomNumber.toLowerCase().includes(q)
        || a.auditorName.toLowerCase().includes(q)
        || a.hotelName.toLowerCase().includes(q)
        || a.roomAttendant.toLowerCase().includes(q)
        || a.supervisor.toLowerCase().includes(q);
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  const scoreColor = (pct: number) =>
    pct >= 90 ? '#10b981' : pct >= 75 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)', minHeight: '100%' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px 16px 40px' }}>

        {/* Hidden File Input for Excel/CSV */}
        <input
          ref={excelInputRef}
          type="file"
          accept=".csv,text/csv,application/vnd.ms-excel"
          onChange={handleExcelImport}
          style={{ display: 'none' }}
        />

        {/* ── Row 1: Back button ── */}
        <button
          onClick={() => setState(prev => ({ ...prev, view: 'dashboard' }))}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '999px', padding: '8px 16px', marginBottom: '16px',
            cursor: 'pointer', color: '#cbd5e1', fontSize: '12px', fontWeight: 700
          }}
        >
          <ArrowLeft style={{ width: '14px', height: '14px' }} />
          Atrás
        </button>

        {/* ── Row 2: Module header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              borderRadius: '14px', width: '50px', height: '50px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(99,102,241,0.5)'
            }}>
              <BedDouble style={{ width: '24px', height: '24px', color: '#fff' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#818cf8', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Módulo 01</span>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '5px', padding: '1px 7px', textTransform: 'uppercase' }}>Activo</span>
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#f1f5f9', margin: 0, letterSpacing: '-0.3px' }}>
                Rooms Audit
              </h1>
              <p style={{ fontSize: '11px', color: '#475569', margin: '2px 0 0', fontWeight: 500 }}>
                Inspección de habitaciones, limpieza y amenidades
              </p>
            </div>
          </div>

          <button
            onClick={handleConfig}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px', width: '40px', height: '40px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}
            title="Configurar Checklist"
          >
            <Settings style={{ width: '17px', height: '17px', color: '#475569' }} />
          </button>
        </div>

        {/* ── Notice Banner upon Excel import ── */}
        {importNotice && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px',
            borderRadius: '12px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)',
            color: '#34d399', fontSize: '12px', fontWeight: 700, marginBottom: '16px'
          }}>
            <Check style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            {importNotice}
          </div>
        )}

        {/* ── Row 3: KPIs 2×2 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Total', value: totalAudits, icon: <BarChart3 style={{ width: '16px', height: '16px', color: '#818cf8' }} />, rgb: '99,102,241' },
            { label: 'Aprobadas', value: passedAudits, icon: <CheckCircle2 style={{ width: '16px', height: '16px', color: '#10b981' }} />, rgb: '16,185,129' },
            { label: 'Score Prom.', value: `${avgScore}%`, icon: <BarChart3 style={{ width: '16px', height: '16px', color: '#f59e0b' }} />, rgb: '245,158,11' },
            { label: 'Última', value: lastDate, icon: <Clock style={{ width: '16px', height: '16px', color: '#ec4899' }} />, rgb: '236,72,153' },
          ].map((k, i) => (
            <div key={i} style={{
              background: `rgba(${k.rgb},0.08)`, border: `1px solid rgba(${k.rgb},0.2)`,
              borderRadius: '14px', padding: '13px',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <div style={{ background: `rgba(${k.rgb},0.15)`, borderRadius: '10px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {k.icon}
              </div>
              <div>
                <p style={{ fontSize: '20px', fontWeight: 900, color: '#f1f5f9', margin: '0 0 1px', lineHeight: 1 }}>{k.value}</p>
                <p style={{ fontSize: '9px', color: '#475569', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Row 4: Action Buttons ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={handleNewAudit}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '15px', borderRadius: '14px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: '#fff', fontSize: '13px', fontWeight: 800,
              boxShadow: '0 6px 20px rgba(99,102,241,0.45)', whiteSpace: 'nowrap'
            }}
          >
            <Plus style={{ width: '18px', height: '18px' }} />
            Nueva Auditoría
          </button>

          <button
            onClick={() => excelInputRef.current?.click()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '15px', borderRadius: '14px', cursor: 'pointer',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#cbd5e1', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap'
            }}
          >
            <FileSpreadsheet style={{ width: '18px', height: '18px', color: '#818cf8' }} />
            Cargar Excel (CSV)
          </button>
        </div>

        {/* ── Row 5: Historial panel ── */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '18px', overflow: 'hidden'
        }}>
          {/* Panel header + search */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Historial de Auditorías</h2>
              <span style={{
                fontSize: '10px', fontWeight: 800, color: '#818cf8',
                background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: '7px', padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '1px'
              }}>
                {filtered.length} reg.
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <Search style={{ width: '14px', height: '14px', color: '#475569', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="search"
                placeholder="Buscar habitación, auditor, camarera..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px 10px 34px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit', WebkitAppearance: 'none'
                }}
              />
            </div>
          </div>

          {/* Empty */}
          {filtered.length === 0 ? (
            <div style={{ padding: '50px 24px', textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <BedDouble style={{ width: '26px', height: '26px', color: '#4338ca' }} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#f1f5f9', margin: '0 0 6px' }}>
                {searchQuery ? 'Sin resultados' : 'Sin auditorías registradas'}
              </h3>
              <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.6 }}>
                {searchQuery ? 'Intenta con otro término.' : 'Usa "Cargar Excel" para importar tu matriz con todas tus auditorías pasadas.'}
              </p>
            </div>
          ) : (
            filtered.map((audit: SavedAudit, idx: number) => {
              const pct = Math.round((audit.finalScore / audit.maxScore) * 100);
              const pass = audit.finalScore >= audit.maxScore * 0.8;
              const color = scoreColor(pct);
              return (
                <div key={audit.id} style={{
                  padding: '14px 16px',
                  borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  display: 'flex', alignItems: 'center', gap: '13px'
                }}>
                  {/* SVG donut */}
                  <div style={{ flexShrink: 0, position: 'relative', width: '48px', height: '48px' }}>
                    <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                      <circle cx="24" cy="24" r="18" fill="none" stroke={color} strokeWidth="4"
                        strokeLinecap="round" strokeDasharray={`${(pct / 100) * 113.1} 113.1`} />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 900, color, lineHeight: 1 }}>{pct}%</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#f1f5f9' }}>Hab. {audit.roomNumber}</span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                        fontSize: '9px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase',
                        padding: '2px 7px', borderRadius: '6px',
                        background: pass ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        color: pass ? '#34d399' : '#f87171',
                        border: `1px solid ${pass ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`
                      }}>
                        {pass ? <CheckCircle2 style={{ width: '9px', height: '9px' }} /> : <AlertTriangle style={{ width: '9px', height: '9px' }} />}
                        {pass ? 'Aprobado' : 'Atención'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#475569' }}>
                        <User style={{ width: '11px', height: '11px' }} />
                        Camarera: {audit.roomAttendant || audit.auditorName}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#475569' }}>
                        <Calendar style={{ width: '11px', height: '11px' }} />
                        {audit.date}
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <p style={{ fontSize: '22px', fontWeight: 900, color, margin: '0 0 2px', lineHeight: 1 }}>
                      {audit.finalScore}<span style={{ fontSize: '11px', color: '#334155' }}>/{audit.maxScore}</span>
                    </p>
                    <p style={{ fontSize: '9px', color: '#334155', fontWeight: 600, margin: 0 }}>
                      {pct >= 90 ? 'Excelente' : pct >= 75 ? 'Aceptable' : 'Deficiente'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
