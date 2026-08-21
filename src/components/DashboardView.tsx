import React from 'react';
import { AppState } from '../types';
import {
  LayoutDashboard, BedDouble, Activity, ShieldCheck,
  ArrowRight, TrendingUp, Award, Clock, Utensils, MapPin, Sparkles
} from 'lucide-react';

interface DashboardViewProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export function DashboardView({ state, setState }: DashboardViewProps) {
  const { savedAudits } = state;
  const totalAudits = savedAudits.length;

  const handleViewAuditDetails = (savedAudit: any) => {
    setState(prev => ({
      ...prev,
      view: 'report',
      audit: {
        hotelName: savedAudit.hotelName,
        roomNumber: savedAudit.roomNumber,
        auditorName: savedAudit.auditorName,
        roomAttendant: savedAudit.roomAttendant,
        supervisor: savedAudit.supervisor,
        date: savedAudit.date,
        maxScore: savedAudit.maxScore,
        itemStates: savedAudit.itemStates
      }
    }));
  };

  const avgScore = totalAudits > 0
    ? Math.round(savedAudits.reduce((acc, curr) => acc + curr.finalScore, 0) / totalAudits)
    : 0;
  const avgMaxScore = totalAudits > 0
    ? Math.round(savedAudits.reduce((acc, curr) => acc + curr.maxScore, 0) / totalAudits)
    : 50;

  const passedAudits = savedAudits.filter(a => a.finalScore >= a.maxScore * 0.8).length;
  const passRate = totalAudits > 0 ? Math.round((passedAudits / totalAudits) * 100) : 0;
  const avgPct = avgMaxScore > 0 ? Math.round((avgScore / avgMaxScore) * 100) : 0;

  const recentAudits = [...savedAudits]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 4);

  const thisMonth = savedAudits.filter(a => {
    const d = new Date(a.timestamp);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const scoreColor = (pct: number) =>
    pct >= 90 ? '#10b981' : pct >= 75 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)', minHeight: '100%' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px 16px 32px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '10px', width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(99,102,241,0.5)'
            }}>
              <LayoutDashboard style={{ width: '16px', height: '16px', color: '#fff' }} />
            </div>
            <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: '#818cf8' }}>
              Hotel Audit System
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#f1f5f9', margin: 0, letterSpacing: '-0.5px' }}>
            Dashboard
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>
            Resumen general de calidad e inspecciones
          </p>
        </div>

        {/* ── KPI Cards 2×2 mobile ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>

          {/* Total */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.05))',
            border: '1px solid rgba(99,102,241,0.3)', borderRadius: '16px', padding: '16px',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '70px', height: '70px', background: 'radial-gradient(circle, rgba(99,102,241,0.3), transparent 70%)', borderRadius: '50%' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.4)', flexShrink: 0 }}>
                <Activity style={{ width: '18px', height: '18px', color: '#fff' }} />
              </div>
            </div>
            <p style={{ fontSize: '34px', fontWeight: 900, color: '#f1f5f9', lineHeight: 1, margin: '0 0 2px 0' }}>{totalAudits}</p>
            <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, margin: 0 }}>Auditorías</p>
          </div>

          {/* Avg Score */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))',
            border: '1px solid rgba(16,185,129,0.3)', borderRadius: '16px', padding: '16px',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '70px', height: '70px', background: 'radial-gradient(circle, rgba(16,185,129,0.3), transparent 70%)', borderRadius: '50%' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ background: 'linear-gradient(135deg,#10b981,#059669)', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(16,185,129,0.4)', flexShrink: 0 }}>
                <ShieldCheck style={{ width: '18px', height: '18px', color: '#fff' }} />
              </div>
            </div>
            <p style={{ fontSize: '34px', fontWeight: 900, color: '#f1f5f9', lineHeight: 1, margin: '0 0 2px 0' }}>
              {avgPct}<span style={{ fontSize: '16px', color: '#6ee7b7', fontWeight: 600 }}>%</span>
            </p>
            <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, margin: '0 0 8px 0' }}>Score Prom.</p>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '999px', height: '3px' }}>
              <div style={{ width: `${avgPct}%`, height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg,#10b981,#34d399)' }} />
            </div>
          </div>

          {/* Pass Rate */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))',
            border: '1px solid rgba(245,158,11,0.3)', borderRadius: '16px', padding: '16px',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '70px', height: '70px', background: 'radial-gradient(circle, rgba(245,158,11,0.3), transparent 70%)', borderRadius: '50%' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(245,158,11,0.4)', flexShrink: 0 }}>
                <Award style={{ width: '18px', height: '18px', color: '#fff' }} />
              </div>
            </div>
            <p style={{ fontSize: '34px', fontWeight: 900, color: '#f1f5f9', lineHeight: 1, margin: '0 0 2px 0' }}>
              {passRate}<span style={{ fontSize: '16px', color: '#fcd34d', fontWeight: 600 }}>%</span>
            </p>
            <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, margin: '0 0 8px 0' }}>Aprobación</p>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '999px', height: '3px' }}>
              <div style={{ width: `${passRate}%`, height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg,#f59e0b,#fcd34d)' }} />
            </div>
          </div>

          {/* This month */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(236,72,153,0.2), rgba(236,72,153,0.05))',
            border: '1px solid rgba(236,72,153,0.3)', borderRadius: '16px', padding: '16px',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '70px', height: '70px', background: 'radial-gradient(circle, rgba(236,72,153,0.3), transparent 70%)', borderRadius: '50%' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ background: 'linear-gradient(135deg,#ec4899,#be185d)', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(236,72,153,0.4)', flexShrink: 0 }}>
                <TrendingUp style={{ width: '18px', height: '18px', color: '#fff' }} />
              </div>
            </div>
            <p style={{ fontSize: '34px', fontWeight: 900, color: '#f1f5f9', lineHeight: 1, margin: '0 0 2px 0' }}>{thisMonth}</p>
            <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, margin: 0 }}>Este Mes</p>
          </div>
        </div>

        {/* ── Módulos ── */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
            <Sparkles style={{ width: '14px', height: '14px', color: '#818cf8' }} />
            <h2 style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: '#64748b', margin: 0 }}>
              Módulos de Auditoría
            </h2>
          </div>

          {/* Module 01 — Active */}
          <div
            onClick={() => setState(prev => ({ ...prev, view: 'rooms' }))}
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
              border: '1px solid rgba(99,102,241,0.4)', borderRadius: '18px', padding: '18px',
              cursor: 'pointer', marginBottom: '10px', position: 'relative', overflow: 'hidden',
              WebkitTapHighlightColor: 'transparent', transition: 'all 0.2s'
            }}
          >
            <div style={{ position: 'absolute', bottom: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(99,102,241,0.2), transparent 70%)', borderRadius: '50%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '14px', width: '46px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(99,102,241,0.5)', flexShrink: 0 }}>
                  <BedDouble style={{ width: '22px', height: '22px', color: '#fff' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#818cf8', letterSpacing: '1px', textTransform: 'uppercase' }}>Módulo 01</span>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '5px', padding: '1px 6px', textTransform: 'uppercase' }}>Activo</span>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Rooms Audit</h3>
                </div>
              </div>
              <div style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '10px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ArrowRight style={{ width: '15px', height: '15px', color: '#818cf8' }} />
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500, margin: '0 0 14px 0', lineHeight: 1.5 }}>
              Auditoría completa de habitaciones, limpieza, minibar y amenidades.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
              {[
                { label: 'Auditorías', val: totalAudits },
                { label: 'Aprobación', val: `${passRate}%` },
                { label: 'Score', val: `${avgPct}%` },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: '16px', fontWeight: 900, color: '#f1f5f9', margin: '0 0 2px 0' }}>{s.val}</p>
                  <p style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Módulos próximos */}
          {[
            { icon: <Utensils style={{ width: '18px', height: '18px', color: '#475569' }} />, num: '02', name: 'Food & Beverage' },
            { icon: <MapPin style={{ width: '18px', height: '18px', color: '#475569' }} />, num: '03', name: 'Áreas Públicas' },
          ].map(m => (
            <div key={m.num} style={{
              background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)',
              borderRadius: '14px', padding: '14px 16px', opacity: 0.5,
              display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px'
            }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {m.icon}
              </div>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '1px', textTransform: 'uppercase' }}>Módulo {m.num} · </span>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#374151', background: 'rgba(255,255,255,0.04)', borderRadius: '5px', padding: '1px 6px', textTransform: 'uppercase' }}>Próximamente</span>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#475569', margin: '2px 0 0 0' }}>{m.name}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* ── Actividad reciente ── */}
        {recentAudits.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
              <Activity style={{ width: '14px', height: '14px', color: '#818cf8' }} />
              <h2 style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: '#64748b', margin: 0 }}>
                Actividad Reciente
              </h2>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
              {recentAudits.map((audit, idx) => {
                const pct = Math.round((audit.finalScore / audit.maxScore) * 100);
                const pass = audit.finalScore >= audit.maxScore * 0.8;
                const color = scoreColor(pct);
                return (
                  <div
                    key={audit.id}
                    onClick={() => handleViewAuditDetails(audit)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: idx < recentAudits.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      display: 'flex', alignItems: 'center', gap: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                      background: pass ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                      border: `1px solid ${pass ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 900, color, lineHeight: 1 }}>{audit.finalScore}</span>
                      <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 700 }}>/{audit.maxScore}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#f1f5f9' }}>Hab. {audit.roomNumber}</span>
                        <span style={{
                          fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '5px', textTransform: 'uppercase',
                          background: pass ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                          color: pass ? '#34d399' : '#f87171',
                          border: `1px solid ${pass ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`
                        }}>
                          {pass ? 'OK' : 'Atención'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#475569' }}>{audit.auditorName}</span>
                        <span style={{ color: '#334155' }}>·</span>
                        <span style={{ fontSize: '11px', color: '#475569' }}>
                          {new Date(audit.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '999px', height: '2px' }}>
                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: '999px', background: color }} />
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color, flexShrink: 0 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
