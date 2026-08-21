import React, { useState } from 'react';
import { AppState } from '../types';
import { generatePDF, generateWord } from '../lib/ReportGenerator';
import { FileText, Download, CheckCircle2, AlertTriangle, ArrowLeft, Loader2, XCircle } from 'lucide-react';

interface ReportViewProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export function ReportView({ state, setState }: ReportViewProps) {
  const { audit, config } = state;
  const [isGenerating, setIsGenerating] = useState(false);

  // Map item ID -> item text & section title from config
  const itemConfigMap = new Map<string, { text: string; sectionTitle: string; defaultPenalty: number }>();
  config.forEach(sec => {
    sec.items.forEach(item => {
      itemConfigMap.set(item.id, {
        text: item.text,
        sectionTitle: sec.title,
        defaultPenalty: item.defaultPenalty
      });
    });
  });

  let totalPenalty = 0;
  let failedItemsCount = 0;
  let passedItemsCount = 0;
  let pendingItemsCount = 0;

  const itemsBreakdown: {
    sectionTitle: string;
    itemText: string;
    isCompliant: boolean | null;
    penalty: number;
    observation: string;
    photoBase64?: string | null;
    photoUrl?: string | null;
  }[] = [];

  // Iterate over audit's saved itemStates
  const itemStatesEntries = Object.entries(audit.itemStates || {});

  if (itemStatesEntries.length > 0) {
    itemStatesEntries.forEach(([itemId, st]) => {
      const configInfo = itemConfigMap.get(itemId);
      const isCompliant = st?.isCompliant ?? null;
      const penalty = st?.penalty ?? configInfo?.defaultPenalty ?? 1;
      const observation = st?.observation || '';
      const photoBase64 = st?.photoBase64 || null;
      const photoUrl = st?.photoUrl || null;
      const itemText = configInfo?.text || `Criterio #${itemId}`;
      const sectionTitle = configInfo?.sectionTitle || 'General';

      if (isCompliant === false) {
        totalPenalty += penalty;
        failedItemsCount++;
      } else if (isCompliant === true) {
        passedItemsCount++;
      } else {
        pendingItemsCount++;
      }

      itemsBreakdown.push({
        sectionTitle,
        itemText,
        isCompliant,
        penalty,
        observation,
        photoBase64,
        photoUrl
      });
    });
  } else {
    // Fallback if audit.itemStates is empty: iterate over config
    config.forEach(section => {
      section.items.forEach(item => {
        const st = audit.itemStates[item.id];
        const isCompliant = st?.isCompliant ?? null;
        const penalty = st?.penalty ?? item.defaultPenalty;
        if (isCompliant === false) { totalPenalty += penalty; failedItemsCount++; }
        else if (isCompliant === true) passedItemsCount++;
        else pendingItemsCount++;

        itemsBreakdown.push({
          sectionTitle: section.title,
          itemText: item.text,
          isCompliant,
          penalty,
          observation: st?.observation || '',
          photoBase64: st?.photoBase64 || null,
          photoUrl: st?.photoUrl || null
        });
      });
    });
  }

  const failedItems = itemsBreakdown.filter(i => i.isCompliant === false);
  const passedItems = itemsBreakdown.filter(i => i.isCompliant === true);

  const maxScore = audit.maxScore || (passedItemsCount + failedItemsCount) || 50;
  const finalScore = Math.max(0, maxScore - totalPenalty);
  const percentage = maxScore > 0 ? Math.round((finalScore / maxScore) * 100) : 100;
  const passed = percentage >= 80;
  const scoreColor = percentage >= 80 ? '#10b981' : percentage >= 60 ? '#f59e0b' : '#ef4444';
  const scoreGlow = percentage >= 80 ? 'rgba(16,185,129,0.4)' : percentage >= 60 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)';

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try { generatePDF(state); } catch (e) { console.error(e); alert('Error al generar el PDF'); }
    setIsGenerating(false);
  };

  const handleDownloadWord = async () => {
    setIsGenerating(true);
    try { await generateWord(state); } catch (e) { console.error(e); alert('Error al generar el documento Word'); }
    setIsGenerating(false);
  };

  const handleBack = () => {
    setState(prev => ({ ...prev, view: 'rooms' }));
  };

  return (
    <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)', minHeight: '100%' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 16px 60px' }}>

        {/* Back */}
        <button
          onClick={handleBack}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '20px',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '999px', padding: '8px 16px',
            cursor: 'pointer', color: '#cbd5e1', fontSize: '12px', fontWeight: 700
          }}
        >
          <ArrowLeft style={{ width: '14px', height: '14px' }} />
          Volver a auditorías
        </button>

        {/* ── Score hero ── */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px', overflow: 'hidden', marginBottom: '20px'
        }}>
          {/* Dark header */}
          <div style={{
            background: 'linear-gradient(135deg,rgba(15,23,42,0.9),rgba(30,27,75,0.9))',
            padding: '24px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '150px', height: '150px', background: `radial-gradient(circle,${scoreGlow},transparent 70%)`, borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '150px', height: '150px', background: `radial-gradient(circle,${scoreGlow},transparent 70%)`, borderRadius: '50%' }} />

            <div style={{ position: 'relative' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#818cf8', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 4px' }}>
                Detalle de Auditoría · {audit.hotelName || 'Hotel Principal'}
              </p>
              <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#f1f5f9', margin: '0 0 4px' }}>
                {audit.roomNumber.toLowerCase().startsWith('hab') ? audit.roomNumber : `Habitación ${audit.roomNumber}`}
              </h1>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px', fontWeight: 500 }}>
                Fecha: {audit.date}
              </p>

              {/* Big score */}
              <div style={{
                display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                background: `rgba(${scoreColor === '#10b981' ? '16,185,129' : scoreColor === '#f59e0b' ? '245,158,11' : '239,68,68'},0.12)`,
                border: `2px solid ${scoreColor}40`,
                borderRadius: '20px', padding: '18px 28px', marginBottom: '16px'
              }}>
                <p style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px' }}>Puntaje Obtenido</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '50px', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{finalScore}</span>
                  <span style={{ fontSize: '20px', color: '#475569', fontWeight: 600 }}>/ {maxScore}</span>
                </div>
                <div style={{ width: '140px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', height: '5px', margin: '10px 0 6px' }}>
                  <div style={{ width: `${percentage}%`, height: '100%', borderRadius: '999px', background: `linear-gradient(90deg,${scoreColor},${scoreColor}99)` }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 800, color: scoreColor }}>{percentage}% · {passed ? '✓ Aprobado' : '✗ Requiere Atención'}</span>
              </div>

              {/* Persons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px' }}>
                {[
                  audit.roomAttendant && { label: 'Camarera / Encargado', val: audit.roomAttendant },
                  audit.supervisor && { label: 'Supervisor', val: audit.supervisor },
                  audit.auditorName && { label: 'Auditor', val: audit.auditorName }
                ].filter(Boolean).map((p: any) => (
                  <div key={p.label} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '9px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 2px' }}>{p.label}</p>
                    <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, margin: 0 }}>{p.val}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Stats grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { icon: <CheckCircle2 style={{ width: '18px', height: '18px' }} />, val: passedItemsCount, label: 'Cumplen', color: '#10b981', rgb: '16,185,129' },
              { icon: <AlertTriangle style={{ width: '18px', height: '18px' }} />, val: failedItemsCount, label: 'Fallas', color: '#ef4444', rgb: '239,68,68' },
              { icon: <FileText style={{ width: '18px', height: '18px' }} />, val: pendingItemsCount, label: 'Sin Evaluar', color: '#64748b', rgb: '100,116,139' },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '14px 10px', textAlign: 'center',
                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none'
              }}>
                <div style={{ display: 'inline-flex', width: '34px', height: '34px', borderRadius: '10px', background: `rgba(${s.rgb},0.12)`, alignItems: 'center', justifyContent: 'center', color: s.color, marginBottom: '4px' }}>
                  {s.icon}
                </div>
                <p style={{ fontSize: '22px', fontWeight: 900, color: '#f1f5f9', margin: '0 0 2px' }}>{s.val}</p>
                <p style={{ fontSize: '9px', color: '#475569', fontWeight: 600, margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Export buttons ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
          <button
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '13px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff',
              fontSize: '13px', fontWeight: 800, boxShadow: '0 4px 16px rgba(239,68,68,0.35)',
              opacity: isGenerating ? 0.7 : 1
            }}
          >
            {isGenerating ? <Loader2 style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} /> : <Download style={{ width: '16px', height: '16px' }} />}
            Exportar PDF
          </button>

          <button
            onClick={handleDownloadWord}
            disabled={isGenerating}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '13px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff',
              fontSize: '13px', fontWeight: 800, boxShadow: '0 4px 16px rgba(59,130,246,0.35)',
              opacity: isGenerating ? 0.7 : 1
            }}
          >
            {isGenerating ? <Loader2 style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} /> : <Download style={{ width: '16px', height: '16px' }} />}
            Exportar Word
          </button>
        </div>

        {/* ── Detailed Breakdown: Failed items ── */}
        {failedItems.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <XCircle style={{ width: '16px', height: '16px', color: '#f87171' }} />
              <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                Observaciones y Fallas Encontradas ({failedItems.length})
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {failedItems.map((item, idx) => (
                <div key={idx} style={{
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '14px', padding: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                    <div>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {item.sectionTitle}
                      </span>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fca5a5', margin: '2px 0 0' }}>
                        {item.itemText}
                      </h4>
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: 800, color: '#f87171',
                      background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '6px', padding: '2px 8px', flexShrink: 0
                    }}>
                      -{item.penalty} pts
                    </span>
                  </div>

                  {item.observation && (
                    <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '6px 0 0', background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '8px', lineHeight: 1.4 }}>
                      <strong style={{ color: '#94a3b8' }}>Nota:</strong> {item.observation}
                    </p>
                  )}

                  {(item.photoBase64 || item.photoUrl) && (
                    <div style={{ marginTop: '10px', borderRadius: '10px', overflow: 'hidden', maxWidth: '200px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <img src={item.photoBase64 || item.photoUrl || ''} alt="Evidencia" style={{ width: '100%', height: 'auto', display: 'block' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Detailed Breakdown: Passed items ── */}
        {passedItems.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <CheckCircle2 style={{ width: '16px', height: '16px', color: '#10b981' }} />
              <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                Ítems Conformes ({passedItems.length})
              </h3>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px', overflow: 'hidden', padding: '6px 14px'
            }}>
              {passedItems.map((item, idx) => (
                <div key={idx} style={{
                  padding: '10px 0',
                  borderBottom: idx < passedItems.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px'
                }}>
                  <div>
                    <span style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>{item.sectionTitle}</span>
                    <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 500 }}>{item.itemText}</span>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', flexShrink: 0 }}>✓ OK</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
