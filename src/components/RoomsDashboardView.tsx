import React from 'react';
import { AppState, SavedAudit } from '../types';
import {
  ArrowLeft, Plus, Settings, Calendar, BedDouble,
  User, Building2, CheckCircle2, AlertTriangle,
  Clock, BarChart3, Search
} from 'lucide-react';

interface RoomsDashboardViewProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export function RoomsDashboardView({ state, setState }: RoomsDashboardViewProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleNewAudit = () => {
    setState(prev => ({
      ...prev,
      view: 'setup',
      audit: { ...prev.audit, itemStates: {} }
    }));
  };

  const handleConfig = () => setState(prev => ({ ...prev, view: 'config' }));

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
        || a.hotelName.toLowerCase().includes(q);
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  const scoreColor = (pct: number) =>
    pct >= 90 ? '#10b981' : pct >= 75 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)', minHeight: '100%' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px 16px 100px' }}>

        {/* ── Back ── */}
        {/* ── Top row: back + module + actions ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '10px' }}>
          {/* Back button — visible pill */}
          <button
            onClick={() => setState(prev => ({ ...prev, view: 'dashboard' }))}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '999px', padding: '8px 14px',
              cursor: 'pointer', color: '#cbd5e1', fontSize: '12px', fontWeight: 700
            }}
          >
            <ArrowLeft style={{ width: '14px', height: '14px' }} />
            Atrás
          </button>
          {/* Module ID */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            <div style={{
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              borderRadius: '12px', width: '40px', height: '40px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(99,102,241,0.5)'
            }}>
              <BedDouble style={{ width: '20px', height: '20px', color: '#fff' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '9px', fontWeight: 800, color: '#818cf8', letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 1px' }}>Módulo 01</p>
              <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#f1f5f9', margin: 0, letterSpacing: '-0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Rooms Audit</h1>
            </div>
          </div>

          {/* Config + Nueva Auditoría */}
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button onClick={handleConfig}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              title="Configurar Checklist"
            >
              <Settings style={{ width: '16px', height: '16px', color: '#64748b' }} />
            </button>
            <button onClick={handleNewAudit}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0 14px', height: '38px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: '12px', fontWeight: 800, boxShadow: '0 4px 14px rgba(99,102,241,0.4)', whiteSpace: 'nowrap' }}
            >
              <Plus style={{ width: '15px', height: '15px' }} />
              Nueva
            </button>
          </div>
        </div>

        {/* ── Mini KPIs 2×2 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Total', value: totalAudits, icon: <BarChart3 style={{ width: '16px', height: '16px', color: '#818cf8' }} />, rgb: '99,102,241' },
            { label: 'Aprobadas', value: passedAudits, icon: <CheckCircle2 style={{ width: '16px', height: '16px', color: '#10b981' }} />, rgb: '16,185,129' },
            { label: 'Score Prom.', value: `${avgScore}%`, icon: <BarChart3 style={{ width: '16px', height: '16px', color: '#f59e0b' }} />, rgb: '245,158,11' },
            { label: 'Última', value: lastDate, icon: <Clock style={{ width: '16px', height: '16px', color: '#ec4899' }} />, rgb: '236,72,153' },
          ].map((k, i) => (
            <div key={i} style={{
              background: `rgba(${k.rgb},0.08)`, border: `1px solid rgba(${k.rgb},0.2)`,
              borderRadius: '14px', padding: '14px',
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

        {/* ── Historial panel ── */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px', overflow: 'hidden', marginBottom: '16px' }}>

          {/* Panel header + search */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Historial</h2>
              <span style={{
                fontSize: '10px', fontWeight: 800, color: '#818cf8',
                background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: '7px', padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '1px'
              }}>
                {filtered.length} reg.
              </span>
            </div>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search style={{ width: '14px', height: '14px', color: '#475569', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="search"
                placeholder="Buscar habitación, auditor..."
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
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <BedDouble style={{ width: '28px', height: '28px', color: '#4338ca' }} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#f1f5f9', margin: '0 0 6px' }}>
                {searchQuery ? 'Sin resultados' : 'Sin auditorías'}
              </h3>
              <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 20px', lineHeight: 1.6 }}>
                {searchQuery ? 'Intenta con otro término.' : 'Toca el botón para comenzar tu primera inspección.'}
              </p>
            </div>
          ) : (
            filtered.map((audit: SavedAudit, idx: number) => {
              const pct = Math.round((audit.finalScore / audit.maxScore) * 100);
              const pass = audit.finalScore >= audit.maxScore * 0.8;
              const color = scoreColor(pct);
              return (
                <div
                  key={audit.id}
                  style={{
                    padding: '14px 16px',
                    borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    display: 'flex', alignItems: 'center', gap: '14px'
                  }}
                >
                  {/* SVG donut */}
                  <div style={{ flexShrink: 0, position: 'relative', width: '50px', height: '50px' }}>
                    <svg width="50" height="50" viewBox="0 0 50 50" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="25" cy="25" r="19" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4.5" />
                      <circle cx="25" cy="25" r="19" fill="none" stroke={color} strokeWidth="4.5"
                        strokeLinecap="round" strokeDasharray={`${(pct / 100) * 119.4} 119.4`} />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 900, color, lineHeight: 1 }}>{pct}%</span>
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
                        <Building2 style={{ width: '11px', height: '11px' }} />{audit.hotelName}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#475569' }}>
                        <User style={{ width: '11px', height: '11px' }} />{audit.auditorName}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#475569' }}>
                        <Calendar style={{ width: '11px', height: '11px' }} />
                        {new Date(audit.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <p style={{ fontSize: '22px', fontWeight: 900, color, margin: '0 0 3px', lineHeight: 1 }}>
                      {audit.finalScore}<span style={{ fontSize: '12px', color: '#475569' }}>/{audit.maxScore}</span>
                    </p>
                    <p style={{ fontSize: '9px', color: '#475569', fontWeight: 600, margin: 0 }}>
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
