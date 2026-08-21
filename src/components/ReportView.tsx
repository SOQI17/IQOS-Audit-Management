import React, { useState } from 'react';
import { AppState } from '../types';
import { generatePDF, generateWord } from '../lib/ReportGenerator';
import { FileText, Download, CheckCircle2, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';

interface ReportViewProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export function ReportView({ state, setState }: ReportViewProps) {
  const { audit } = state;
  const [isGenerating, setIsGenerating] = useState(false);

  let totalPenalty = 0, failedItems = 0, passedItems = 0, pendingItems = 0;
  state.config.forEach(section => {
    section.items.forEach(item => {
      const st = audit.itemStates[item.id];
      if (st?.isCompliant === false) { totalPenalty += st.penalty; failedItems++; }
      else if (st?.isCompliant === true) passedItems++;
      else pendingItems++;
    });
  });

  const finalScore = Math.max(0, audit.maxScore - totalPenalty);
  const percentage = Math.round((finalScore / audit.maxScore) * 100);
  const passed = percentage >= 80;
  const scoreColor = percentage >= 80 ? '#10b981' : percentage >= 60 ? '#f59e0b' : '#ef4444';
  const scoreGlow = percentage >= 80 ? 'rgba(16,185,129,0.4)' : percentage >= 60 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)';

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try { generatePDF(state); } catch (e) { console.error(e); alert('Error generating PDF'); }
    setIsGenerating(false);
  };

  const handleDownloadWord = async () => {
    setIsGenerating(true);
    try { await generateWord(state); } catch (e) { console.error(e); alert('Error generating Word document'); }
    setIsGenerating(false);
  };

  const handleNewAudit = () => {
    setState(prev => ({ ...prev, view: 'rooms', audit: { ...prev.audit, itemStates: {} } }));
  };

  return (
    <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)', minHeight: '100%' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 16px 40px' }}>

        {/* Back */}
        <button
          onClick={handleNewAudit}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '20px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#64748b', fontSize: '11px', fontWeight: 700,
            letterSpacing: '1px', textTransform: 'uppercase', padding: 0
          }}
        >
          <ArrowLeft style={{ width: '13px', height: '13px' }} />
          Volver al módulo
        </button>

        {/* ── Score hero ── */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px', overflow: 'hidden', marginBottom: '16px'
        }}>
          {/* Dark header */}
          <div style={{
            background: 'linear-gradient(135deg,rgba(15,23,42,0.9),rgba(30,27,75,0.9))',
            padding: '28px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '150px', height: '150px', background: `radial-gradient(circle,${scoreGlow},transparent 70%)`, borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '150px', height: '150px', background: `radial-gradient(circle,${scoreGlow},transparent 70%)`, borderRadius: '50%' }} />

            <div style={{ position: 'relative' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#818cf8', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 8px' }}>
                Rooms Audit · {audit.hotelName}
              </p>
              <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#f1f5f9', margin: '0 0 4px' }}>
                Auditoría Completada
              </h1>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 20px', fontWeight: 500 }}>
                Habitación {audit.roomNumber} · {audit.date}
              </p>

              {/* Big score */}
              <div style={{
                display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                background: `rgba(${scoreColor === '#10b981' ? '16,185,129' : scoreColor === '#f59e0b' ? '245,158,11' : '239,68,68'},0.12)`,
                border: `2px solid ${scoreColor}40`,
                borderRadius: '20px', padding: '20px 32px', marginBottom: '16px'
              }}>
                <p style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px' }}>Puntaje Final</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '56px', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{finalScore}</span>
                  <span style={{ fontSize: '22px', color: '#475569', fontWeight: 600 }}>/ {audit.maxScore}</span>
                </div>
                {/* Score bar */}
                <div style={{ width: '160px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', height: '6px', margin: '12px 0 6px' }}>
                  <div style={{ width: `${percentage}%`, height: '100%', borderRadius: '999px', background: `linear-gradient(90deg,${scoreColor},${scoreColor}99)` }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 800, color: scoreColor }}>{percentage}% · {passed ? '✓ Aprobado' : '✗ Requiere Atención'}</span>
              </div>

              {/* Persons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
                {[
                  { label: 'Auditor', val: audit.auditorName },
                  audit.roomAttendant && { label: 'Encargado', val: audit.roomAttendant },
                  audit.supervisor && { label: 'Supervisor', val: audit.supervisor }
                ].filter(Boolean).map((p: any) => (
                  <div key={p.label} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '9px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 2px' }}>{p.label}</p>
                    <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, margin: 0 }}>{p.val}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Stats ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { icon: <CheckCircle2 style={{ width: '18px', height: '18px' }} />, val: passedItems, label: 'Cumplen', color: '#10b981', rgb: '16,185,129' },
              { icon: <AlertTriangle style={{ width: '18px', height: '18px' }} />, val: failedItems, label: 'Fallas', color: '#ef4444', rgb: '239,68,68' },
              { icon: <FileText style={{ width: '18px', height: '18px' }} />, val: pendingItems, label: 'Sin Evaluar', color: '#64748b', rgb: '100,116,139' },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '16px 10px', textAlign: 'center',
                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none'
              }}>
                <div style={{ display: 'inline-flex', width: '36px', height: '36px', borderRadius: '10px', background: `rgba(${s.rgb},0.12)`, alignItems: 'center', justifyContent: 'center', color: s.color, marginBottom: '6px' }}>
                  {s.icon}
                </div>
                <p style={{ fontSize: '22px', fontWeight: 900, color: '#f1f5f9', margin: '0 0 2px' }}>{s.val}</p>
                <p style={{ fontSize: '10px', color: '#475569', fontWeight: 600, margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Export ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '15px', borderRadius: '14px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff',
              fontSize: '14px', fontWeight: 800, boxShadow: '0 4px 16px rgba(239,68,68,0.35)',
              opacity: isGenerating ? 0.7 : 1
            }}
          >
            {isGenerating ? <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> : <Download style={{ width: '18px', height: '18px' }} />}
            Exportar PDF
          </button>

          <button
            onClick={handleDownloadWord}
            disabled={isGenerating}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '15px', borderRadius: '14px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff',
              fontSize: '14px', fontWeight: 800, boxShadow: '0 4px 16px rgba(59,130,246,0.35)',
              opacity: isGenerating ? 0.7 : 1
            }}
          >
            {isGenerating ? <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> : <Download style={{ width: '18px', height: '18px' }} />}
            Exportar Word (.docx)
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
