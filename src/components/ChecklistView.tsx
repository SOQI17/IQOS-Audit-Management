import React, { useRef, useState } from 'react';
import { AppState, AuditItemState } from '../types';
import {
  Camera, Check, X, CheckCircle2, MessageSquare,
  Image as ImageIcon, Loader2, Folder, Trash2, ArrowLeft
} from 'lucide-react';
import { saveAuditToCloud } from '../lib/firebase';

interface ChecklistViewProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

// ─────────────────────────────────────────────────────────
// PhotoPicker — bottom sheet con 3 opciones
// ─────────────────────────────────────────────────────────
interface PhotoPickerProps {
  itemId: string;
  photoBase64: string | null;
  isUploading: boolean;
  onFile: (itemId: string, file: File) => void;
  onRemove: () => void;
}

function PhotoPicker({ itemId, photoBase64, isUploading, onFile, onRemove }: PhotoPickerProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const cameraRef  = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

  const handleSelect = (ref: React.RefObject<HTMLInputElement>) => {
    setSheetOpen(false);
    setTimeout(() => ref.current?.click(), 180);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(itemId, file);
    e.target.value = '';
  };

  return (
    <>
      {/* Hidden inputs */}
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" onChange={handleChange} style={{ display: 'none' }} />
      <input ref={galleryRef} type="file" accept="image/*" onChange={handleChange} style={{ display: 'none' }} />
      <input ref={fileRef}    type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleChange} style={{ display: 'none' }} />

      {photoBase64 ? (
        /* Preview */
        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
          <img src={photoBase64} alt="Evidencia"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          {/* Small uploading badge — NOT blocking the photo */}
          {isUploading && (
            <div style={{
              position: 'absolute', bottom: '8px', left: '8px',
              background: 'rgba(0,0,0,0.75)', borderRadius: '8px',
              padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px',
              backdropFilter: 'blur(4px)'
            }}>
              <Loader2 style={{ width: '12px', height: '12px', color: '#818cf8', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '10px', color: '#818cf8', fontWeight: 700 }}>Subiendo...</span>
            </div>
          )}
          {/* Controls */}
          <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px' }}>
            <button onClick={() => setSheetOpen(true)}
              style={{ padding: '7px', background: 'rgba(0,0,0,0.65)', borderRadius: '8px', border: 'none', cursor: 'pointer', backdropFilter: 'blur(4px)', display: 'flex' }}>
              <Camera style={{ width: '14px', height: '14px', color: '#fff' }} />
            </button>
            <button onClick={onRemove}
              style={{ padding: '7px', background: 'rgba(220,38,38,0.8)', borderRadius: '8px', border: 'none', cursor: 'pointer', backdropFilter: 'blur(4px)', display: 'flex' }}>
              <Trash2 style={{ width: '14px', height: '14px', color: '#fff' }} />
            </button>
          </div>
        </div>
      ) : (
        /* Trigger button */
        <button onClick={() => setSheetOpen(true)} style={{
          width: '100%', aspectRatio: '4/3', borderRadius: '12px',
          border: '2px dashed rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.05)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '8px', cursor: 'pointer'
        }}>
          {isUploading ? (
            <Loader2 style={{ width: '24px', height: '24px', color: '#818cf8', animation: 'spin 1s linear infinite' }} />
          ) : (
            <>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera style={{ width: '20px', height: '20px', color: '#818cf8' }} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '1px' }}>Añadir Foto</span>
            </>
          )}
        </button>
      )}

      {/* Bottom Sheet */}
      {sheetOpen && (
        <>
          <div onClick={() => setSheetOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, backdropFilter: 'blur(3px)' }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
            background: '#1e293b', borderRadius: '20px 20px 0 0',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
            animation: 'slideUp 0.22s ease',
            paddingBottom: 'env(safe-area-inset-bottom, 16px)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.15)' }} />
            </div>
            <p style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '6px 16px 10px' }}>
              Agregar evidencia
            </p>
            <div style={{ padding: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { ref: cameraRef,  icon: <Camera style={{ width: '22px', height: '22px', color: '#fff' }} />, bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)', glow: 'rgba(99,102,241,0.4)', rowBg: 'rgba(99,102,241,0.1)', title: 'Tomar Foto', sub: 'Usa la cámara trasera' },
                { ref: galleryRef, icon: <ImageIcon style={{ width: '22px', height: '22px', color: '#fff' }} />, bg: 'linear-gradient(135deg,#10b981,#059669)', glow: 'rgba(16,185,129,0.35)', rowBg: 'rgba(16,185,129,0.08)', title: 'Galería / Álbum', sub: 'Desde tus fotos guardadas' },
                { ref: fileRef,    icon: <Folder style={{ width: '22px', height: '22px', color: '#fff' }} />, bg: 'linear-gradient(135deg,#f59e0b,#d97706)', glow: 'rgba(245,158,11,0.35)', rowBg: 'rgba(245,158,11,0.08)', title: 'Subir Archivo', sub: 'PDF, imagen u otro archivo' },
              ].map((opt, i) => (
                <button key={i} onClick={() => handleSelect(opt.ref)} style={{
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '14px',
                  borderRadius: '14px', border: 'none', cursor: 'pointer', background: opt.rowBg, width: '100%'
                }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: opt.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px ${opt.glow}` }}>
                    {opt.icon}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 2px' }}>{opt.title}</p>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{opt.sub}</p>
                  </div>
                </button>
              ))}
              <button onClick={() => setSheetOpen(false)} style={{
                width: '100%', padding: '13px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#64748b', fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginTop: '2px'
              }}>
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────
// ChecklistView — Flex column so bottom nav is ALWAYS visible
// ─────────────────────────────────────────────────────────
export function ChecklistView({ state, setState }: ChecklistViewProps) {
  const { audit, config } = state;
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingItems, setUploadingItems] = useState<Record<string, boolean>>({});
  const tabsRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeSection = config[activeSectionIdx];

  // Live score
  let totalPenalty = 0;
  Object.values(audit.itemStates).forEach(item => {
    if (item.isCompliant === false) totalPenalty += item.penalty;
  });
  const currentScore = Math.max(0, audit.maxScore - totalPenalty);
  const pct = Math.round((currentScore / audit.maxScore) * 100);
  const scoreColor = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';

  // Progress
  const totalItems = config.reduce((s, sec) => s + sec.items.length, 0);
  const evaluatedItems = Object.values(audit.itemStates).filter(i => i.isCompliant !== null).length;
  const progress = totalItems > 0 ? Math.round((evaluatedItems / totalItems) * 100) : 0;

  const updateItemState = (itemId: string, updates: Partial<AuditItemState>) => {
    setState(prev => {
      const current = prev.audit.itemStates[itemId] || {
        id: itemId, isCompliant: null, observation: '', photoBase64: null,
        penalty: prev.config.flatMap(s => s.items).find(i => i.id === itemId)?.defaultPenalty || 0
      };
      return {
        ...prev,
        audit: { ...prev.audit, itemStates: { ...prev.audit.itemStates, [itemId]: { ...current, ...updates } } }
      };
    });
  };

  const handlePhotoFile = async (itemId: string, file: File) => {
    // Show preview instantly — don't wait for upload
    const reader = new FileReader();
    reader.onloadend = () => updateItemState(itemId, { photoBase64: reader.result as string });
    reader.readAsDataURL(file);

    // Upload silently in background
    setUploadingItems(prev => ({ ...prev, [itemId]: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'qaudit_preset');
      const res = await fetch('https://api.cloudinary.com/v1_1/eztjzc2k/image/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        updateItemState(itemId, { photoUrl: data.secure_url });
      }
    } catch (err) {
      console.warn('Cloudinary upload failed (photo still saved locally):', err);
    } finally {
      setUploadingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const goToSection = (idx: number) => {
    setActiveSectionIdx(idx);
    // Scroll content to top
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    // Scroll tab into view
    setTimeout(() => {
      const btn = tabsRef.current?.children[idx] as HTMLElement;
      btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 60);
  };

  const handleFinish = async () => {
    setIsSaving(true);
    let finalPenalty = 0;
    Object.values(audit.itemStates).forEach(item => {
      if (item.isCompliant === false) finalPenalty += item.penalty;
    });
    const finalScore = Math.max(0, audit.maxScore - finalPenalty);

    const cleanItemStates: Record<string, AuditItemState> = {};
    Object.keys(audit.itemStates).forEach(key => {
      cleanItemStates[key] = { ...audit.itemStates[key], photoBase64: null };
    });

    const auditDataToSave = {
      hotelName: audit.hotelName, roomNumber: audit.roomNumber,
      auditorName: audit.auditorName, roomAttendant: audit.roomAttendant,
      supervisor: audit.supervisor, date: audit.date,
      maxScore: audit.maxScore, itemStates: cleanItemStates
    };
    const localId = `local_${Date.now()}`;

    try {
      const timeout = new Promise<null>(r => setTimeout(() => r(null), 4000));
      const newId = await Promise.race([saveAuditToCloud(auditDataToSave, finalScore), timeout]);
      setState(prev => ({
        ...prev, view: 'report',
        savedAudits: [{ id: newId || localId, ...auditDataToSave, finalScore, timestamp: Date.now() }, ...prev.savedAudits]
      }));
    } catch (e) {
      console.error(e);
      setState(prev => ({
        ...prev, view: 'report',
        savedAudits: [{ id: localId, ...auditDataToSave, finalScore, timestamp: Date.now() }, ...prev.savedAudits]
      }));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    /*
     * KEY LAYOUT: display:flex + flexDirection:column + height:100%
     * This makes the bottom nav always visible — it never gets pushed off screen.
     * The scrollable area (ref=scrollRef) takes all remaining space (flex:1).
     */
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'linear-gradient(180deg,#0f172a,#1a1f35)' }}>

      {/* ── 1. Score bar (fixed top strip) ── */}
      <div style={{
        flexShrink: 0,
        background: 'rgba(15,23,42,0.98)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '10px 16px'
      }}>
        {/* Back + room info row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <button
            onClick={() => setState(prev => ({ ...prev, view: 'rooms' }))}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0,
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '999px', padding: '6px 12px',
              cursor: 'pointer', color: '#94a3b8', fontSize: '11px', fontWeight: 700
            }}
          >
            <ArrowLeft style={{ width: '13px', height: '13px' }} />
            Atrás
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {audit.hotelName}
            </p>
            <h2 style={{ fontSize: '15px', fontWeight: 900, color: '#f1f5f9', margin: 0 }}>
              Habitación {audit.roomNumber}
            </h2>
          </div>

          {/* Score pill */}
          <div style={{
            flexShrink: 0, textAlign: 'center',
            background: `rgba(${scoreColor === '#10b981' ? '16,185,129' : scoreColor === '#f59e0b' ? '245,158,11' : '239,68,68'},0.12)`,
            border: `1px solid ${scoreColor}50`, borderRadius: '10px', padding: '5px 12px'
          }}>
            <p style={{ fontSize: '9px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 1px' }}>Score</p>
            <p style={{ fontSize: '20px', fontWeight: 900, color: scoreColor, margin: 0, lineHeight: 1 }}>
              {currentScore}<span style={{ fontSize: '11px', color: '#334155' }}>/{audit.maxScore}</span>
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: '999px', height: '3px' }}>
            <div style={{ width: `${progress}%`, height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', transition: 'width 0.3s ease' }} />
          </div>
          <span style={{ fontSize: '9px', fontWeight: 700, color: '#334155', flexShrink: 0 }}>{progress}%</span>
        </div>
      </div>

      {/* ── 2. Section tabs ── */}
      <div
        ref={tabsRef}
        style={{
          flexShrink: 0,
          display: 'flex', gap: '7px', padding: '10px 16px',
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none'
        }}
      >
        {config.map((section, idx) => {
          const done = section.items.every(item => audit.itemStates[item.id]?.isCompliant !== undefined && audit.itemStates[item.id]?.isCompliant !== null);
          const active = activeSectionIdx === idx;
          return (
            <button key={section.id} onClick={() => goToSection(idx)} style={{
              whiteSpace: 'nowrap', padding: '7px 14px', borderRadius: '999px',
              fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: 'none',
              flexShrink: 0, transition: 'all 0.18s',
              background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : done ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
              color: active ? '#fff' : done ? '#34d399' : '#64748b',
              outline: done && !active ? '1px solid rgba(16,185,129,0.3)' : 'none',
              boxShadow: active ? '0 4px 12px rgba(99,102,241,0.35)' : 'none'
            }}>
              {done && !active ? '✓ ' : ''}{section.title}
            </button>
          );
        })}
      </div>

      {/* ── 3. Scrollable items area ── */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 16px 12px' }}
      >
        {/* Section label */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 6px rgba(99,102,241,0.6)' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>{activeSection.title}</h3>
          </div>
          <span style={{
            fontSize: '9px', fontWeight: 800, color: '#818cf8',
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.22)',
            borderRadius: '6px', padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '1px'
          }}>
            {activeSectionIdx + 1}/{config.length}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activeSection.items.map(item => {
            const itemState = audit.itemStates[item.id];
            const isCompliant = itemState?.isCompliant;
            const showFail = isCompliant === false;

            return (
              <div key={item.id} style={{
                borderRadius: '14px', overflow: 'hidden',
                border: showFail ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.07)',
                background: showFail ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)'
              }}>
                <div style={{ padding: '13px 13px 11px' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: showFail ? 700 : 500, color: showFail ? '#fca5a5' : '#e2e8f0', lineHeight: 1.45, display: 'block' }}>
                      {item.text}
                    </span>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: showFail ? '#f87171' : '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '3px 0 0' }}>
                      Penalidad: -{item.defaultPenalty} pts
                    </p>
                  </div>

                  {/* PASS / FAIL */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      onClick={() => updateItemState(item.id, { isCompliant: true, penalty: item.defaultPenalty })}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                        padding: '12px 8px', borderRadius: '10px', fontSize: '13px', fontWeight: 800,
                        cursor: 'pointer', border: 'none',
                        background: isCompliant === true ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.06)',
                        color: isCompliant === true ? '#fff' : '#64748b',
                        boxShadow: isCompliant === true ? '0 3px 12px rgba(16,185,129,0.35)' : 'none',
                        transform: isCompliant === true ? 'scale(1.02)' : 'scale(1)'
                      }}
                    >
                      <Check style={{ width: '14px', height: '14px' }} /> PASS
                    </button>
                    <button
                      onClick={() => updateItemState(item.id, { isCompliant: false, penalty: item.defaultPenalty })}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                        padding: '12px 8px', borderRadius: '10px', fontSize: '13px', fontWeight: 800,
                        cursor: 'pointer', border: 'none',
                        background: isCompliant === false ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(255,255,255,0.06)',
                        color: isCompliant === false ? '#fff' : '#64748b',
                        boxShadow: isCompliant === false ? '0 3px 12px rgba(239,68,68,0.35)' : 'none',
                        transform: isCompliant === false ? 'scale(1.02)' : 'scale(1)'
                      }}
                    >
                      <X style={{ width: '14px', height: '14px' }} /> FAIL
                    </button>
                  </div>
                </div>

                {/* Evidence panel */}
                {showFail && (
                  <div style={{ padding: '12px 13px', borderTop: '1px solid rgba(239,68,68,0.2)', background: 'rgba(0,0,0,0.12)' }}>
                    <p style={{ fontSize: '10px', fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 10px' }}>
                      Evidencia · -{item.defaultPenalty} pts
                    </p>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>
                      <MessageSquare style={{ width: '11px', height: '11px' }} /> Observación
                    </label>
                    <textarea
                      value={itemState?.observation || ''}
                      onChange={e => updateItemState(item.id, { observation: e.target.value })}
                      placeholder="Describe el problema encontrado..."
                      rows={2}
                      style={{
                        width: '100%', padding: '9px 11px', borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.05)', color: '#f1f5f9',
                        fontSize: '14px', resize: 'none', outline: 'none',
                        fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '12px', lineHeight: 1.5
                      }}
                    />

                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      <Camera style={{ width: '11px', height: '11px' }} /> Fotografía
                    </label>
                    <PhotoPicker
                      itemId={item.id}
                      photoBase64={itemState?.photoBase64 || null}
                      isUploading={uploadingItems[item.id] || false}
                      onFile={handlePhotoFile}
                      onRemove={() => updateItemState(item.id, { photoBase64: null, photoUrl: null })}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. Bottom navigation — ALWAYS visible, never scrolls away ── */}
      <div style={{
        flexShrink: 0,
        background: 'rgba(15,23,42,0.98)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'
      }}>
        <button
          onClick={() => goToSection(Math.max(0, activeSectionIdx - 1))}
          disabled={activeSectionIdx === 0}
          style={{
            padding: '13px', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
            cursor: activeSectionIdx === 0 ? 'not-allowed' : 'pointer', border: 'none',
            background: 'rgba(255,255,255,0.06)', color: activeSectionIdx === 0 ? '#2d3748' : '#94a3b8',
            opacity: activeSectionIdx === 0 ? 0.35 : 1
          }}
        >
          ← Anterior
        </button>

        {activeSectionIdx < config.length - 1 ? (
          <button
            onClick={() => goToSection(activeSectionIdx + 1)}
            style={{
              padding: '13px', borderRadius: '12px', fontSize: '14px', fontWeight: 800,
              cursor: 'pointer', border: 'none',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: '#fff', boxShadow: '0 4px 16px rgba(99,102,241,0.4)'
            }}
          >
            Siguiente →
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={isSaving}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '13px', borderRadius: '12px', fontSize: '14px', fontWeight: 800,
              cursor: 'pointer', border: 'none',
              background: 'linear-gradient(135deg,#10b981,#059669)',
              color: '#fff', boxShadow: '0 4px 16px rgba(16,185,129,0.35)',
              opacity: isSaving ? 0.7 : 1
            }}
          >
            {isSaving
              ? <><Loader2 style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} /> Guardando...</>
              : <><CheckCircle2 style={{ width: '15px', height: '15px' }} /> Finalizar</>
            }
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        textarea::placeholder { color: #2d3748; }
      `}</style>
    </div>
  );
}
