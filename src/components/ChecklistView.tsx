import React, { useRef, useState } from 'react';
import { AppState, AuditItemState, AuditSectionConfig } from '../types';
import {
  Camera, Check, X, CheckCircle2, MessageSquare,
  Image as ImageIcon, Loader2, Folder, Trash2
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

  const cameraRef   = useRef<HTMLInputElement>(null);
  const galleryRef  = useRef<HTMLInputElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);

  const handleSelect = (ref: React.RefObject<HTMLInputElement>) => {
    setSheetOpen(false);
    // small delay so sheet closes smoothly before the OS dialog opens
    setTimeout(() => ref.current?.click(), 150);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(itemId, file);
    // reset so same file can be picked again
    e.target.value = '';
  };

  return (
    <>
      {/* ── Hidden inputs ── */}
      <input ref={cameraRef}  type="file" accept="image/*"                     capture="environment" onChange={handleChange} style={{ display: 'none' }} />
      <input ref={galleryRef} type="file" accept="image/*"                                           onChange={handleChange} style={{ display: 'none' }} />
      <input ref={fileRef}    type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={handleChange} style={{ display: 'none' }} />

      {/* ── Preview or trigger ── */}
      {photoBase64 ? (
        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
          <img
            src={photoBase64}
            alt="Evidencia"
            style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: isUploading ? 0.45 : 1 }}
          />
          {isUploading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
              <Loader2 style={{ width: '28px', height: '28px', color: '#fff', animation: 'spin 1s linear infinite' }} />
            </div>
          )}
          {/* Replace / Remove controls */}
          <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setSheetOpen(true)}
              style={{ padding: '7px', background: 'rgba(0,0,0,0.65)', borderRadius: '8px', border: 'none', cursor: 'pointer', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center' }}
              title="Cambiar foto"
            >
              <Camera style={{ width: '14px', height: '14px', color: '#fff' }} />
            </button>
            <button
              onClick={onRemove}
              style={{ padding: '7px', background: 'rgba(239,68,68,0.75)', borderRadius: '8px', border: 'none', cursor: 'pointer', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center' }}
              title="Eliminar foto"
            >
              <Trash2 style={{ width: '14px', height: '14px', color: '#fff' }} />
            </button>
          </div>
        </div>
      ) : isUploading ? (
        <div style={{
          width: '100%', aspectRatio: '4/3', borderRadius: '12px',
          border: '2px dashed rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.06)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px'
        }}>
          <Loader2 style={{ width: '24px', height: '24px', color: '#818cf8', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '1px' }}>Subiendo...</span>
        </div>
      ) : (
        <button
          onClick={() => setSheetOpen(true)}
          style={{
            width: '100%', aspectRatio: '4/3', borderRadius: '12px',
            border: '2px dashed rgba(99,102,241,0.35)', background: 'rgba(99,102,241,0.05)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Camera style={{ width: '20px', height: '20px', color: '#818cf8' }} />
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '1px' }}>Añadir Foto</span>
          <span style={{ fontSize: '10px', color: '#475569', fontWeight: 500 }}>Toca para agregar evidencia</span>
        </button>
      )}

      {/* ── Bottom Sheet Overlay ── */}
      {sheetOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSheetOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              zIndex: 100, backdropFilter: 'blur(3px)'
            }}
          />
          {/* Sheet */}
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
            background: '#1e293b', borderRadius: '20px 20px 0 0',
            padding: '0 0 env(safe-area-inset-bottom)',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.25s ease'
          }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.15)' }} />
            </div>

            <div style={{ padding: '8px 16px 4px' }}>
              <p style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
                Agregar evidencia fotográfica
              </p>
            </div>

            {/* Options */}
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

              {/* Camera */}
              <button
                onClick={() => handleSelect(cameraRef)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                  background: 'rgba(99,102,241,0.12)', transition: 'background 0.15s'
                }}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}>
                  <Camera style={{ width: '22px', height: '22px', color: '#fff' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 2px' }}>Tomar Foto</p>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: 500 }}>Usa la cámara del dispositivo</p>
                </div>
              </button>

              {/* Gallery */}
              <button
                onClick={() => handleSelect(galleryRef)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                  background: 'rgba(16,185,129,0.08)', transition: 'background 0.15s'
                }}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(16,185,129,0.35)' }}>
                  <ImageIcon style={{ width: '22px', height: '22px', color: '#fff' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 2px' }}>Galería / Álbum</p>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: 500 }}>Selecciona una imagen guardada</p>
                </div>
              </button>

              {/* File */}
              <button
                onClick={() => handleSelect(fileRef)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                  background: 'rgba(245,158,11,0.08)', transition: 'background 0.15s'
                }}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(245,158,11,0.35)' }}>
                  <Folder style={{ width: '22px', height: '22px', color: '#fff' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 2px' }}>Subir Archivo</p>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: 500 }}>PDF, Word, imagen desde archivos</p>
                </div>
              </button>

              {/* Cancel */}
              <button
                onClick={() => setSheetOpen(false)}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#64748b', fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginTop: '4px'
                }}
              >
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
// Main ChecklistView
// ─────────────────────────────────────────────────────────
export function ChecklistView({ state, setState }: ChecklistViewProps) {
  const { audit, config } = state;
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingItems, setUploadingItems] = useState<Record<string, boolean>>({});
  const sectionTabsRef = useRef<HTMLDivElement>(null);

  const activeSection = config[activeSectionIdx];

  // Live score
  let totalPenalty = 0;
  Object.values(audit.itemStates).forEach(item => {
    if (item.isCompliant === false) totalPenalty += item.penalty;
  });
  const currentScore = Math.max(0, audit.maxScore - totalPenalty);
  const pct = Math.round((currentScore / audit.maxScore) * 100);
  const scoreColor = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';

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
    // Immediate local preview
    const reader = new FileReader();
    reader.onloadend = () => updateItemState(itemId, { photoBase64: reader.result as string });
    reader.readAsDataURL(file);

    // Upload to Cloudinary
    setUploadingItems(prev => ({ ...prev, [itemId]: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'qaudit_preset');
      const res = await fetch('https://api.cloudinary.com/v1_1/eztjzc2k/image/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Cloudinary upload failed');
      const data = await res.json();
      updateItemState(itemId, { photoUrl: data.secure_url });
    } catch (err) {
      console.error('Error uploading to Cloudinary:', err);
    } finally {
      setUploadingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const goToSection = (idx: number) => {
    setActiveSectionIdx(idx);
    // Scroll tab into view
    setTimeout(() => {
      const tabs = sectionTabsRef.current;
      if (tabs) {
        const btn = tabs.children[idx] as HTMLElement;
        if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 50);
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
      hotelName: audit.hotelName, roomNumber: audit.roomNumber, auditorName: audit.auditorName,
      roomAttendant: audit.roomAttendant, supervisor: audit.supervisor, date: audit.date,
      maxScore: audit.maxScore, itemStates: cleanItemStates
    };
    const localId = `local_${Date.now()}`;

    try {
      const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), 4000));
      const savePromise = saveAuditToCloud(auditDataToSave, finalScore);
      const newId = await Promise.race([savePromise, timeoutPromise]);

      setState(prev => ({
        ...prev, view: 'report',
        savedAudits: [{ id: newId || localId, ...auditDataToSave, finalScore, timestamp: Date.now() }, ...prev.savedAudits]
      }));

      if (!newId) {
        alert('Nota: No se pudo sincronizar con Firebase. El reporte está disponible localmente.');
      }
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

  // Progress across all sections
  const totalItems = config.reduce((s, sec) => s + sec.items.length, 0);
  const evaluatedItems = Object.values(audit.itemStates).filter(i => i.isCompliant !== null).length;
  const progress = totalItems > 0 ? Math.round((evaluatedItems / totalItems) * 100) : 0;

  return (
    <div style={{ background: 'linear-gradient(180deg,#0f172a 0%,#1a1f35 100%)', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── Sticky Score Bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '10px 16px'
      }}>
        {/* Room info row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 2px' }}>
              {audit.hotelName}
            </p>
            <h2 style={{ fontSize: '16px', fontWeight: 900, color: '#f1f5f9', margin: 0 }}>
              Habitación {audit.roomNumber}
            </h2>
          </div>
          {/* Live score pill */}
          <div style={{
            background: `rgba(${scoreColor === '#10b981' ? '16,185,129' : scoreColor === '#f59e0b' ? '245,158,11' : '239,68,68'},0.15)`,
            border: `1px solid ${scoreColor}40`,
            borderRadius: '12px', padding: '6px 14px', textAlign: 'center'
          }}>
            <p style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 1px' }}>Score</p>
            <p style={{ fontSize: '22px', fontWeight: 900, color: scoreColor, margin: 0, lineHeight: 1 }}>
              {currentScore}<span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>/{audit.maxScore}</span>
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: '999px', height: '4px' }}>
            <div style={{ width: `${progress}%`, height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', transition: 'width 0.3s ease' }} />
          </div>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#475569', flexShrink: 0 }}>{progress}%</span>
        </div>
      </div>

      {/* ── Section Tabs ── */}
      <div
        ref={sectionTabsRef}
        style={{
          display: 'flex', gap: '8px', padding: '12px 16px',
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none', msOverflowStyle: 'none'
        }}
      >
        {config.map((section, idx) => {
          const sectionPassed = section.items.every(item => audit.itemStates[item.id]?.isCompliant !== undefined && audit.itemStates[item.id]?.isCompliant !== null);
          const active = activeSectionIdx === idx;
          return (
            <button
              key={section.id}
              onClick={() => goToSection(idx)}
              style={{
                whiteSpace: 'nowrap', padding: '8px 16px', borderRadius: '999px',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: 'none',
                transition: 'all 0.2s', flexShrink: 0,
                background: active
                  ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                  : 'rgba(255,255,255,0.05)',
                color: active ? '#fff' : '#64748b',
                boxShadow: active ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
                outline: sectionPassed && !active ? '1px solid rgba(16,185,129,0.3)' : 'none'
              }}
            >
              {sectionPassed && !active ? '✓ ' : ''}{section.title}
            </button>
          );
        })}
      </div>

      {/* ── Items ── */}
      <div style={{ flex: 1, padding: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px rgba(99,102,241,0.6)' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>{activeSection.title}</h3>
          </div>
          <span style={{
            fontSize: '10px', fontWeight: 800, color: '#818cf8',
            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: '7px', padding: '3px 8px', textTransform: 'uppercase', letterSpacing: '1px'
          }}>
            {activeSectionIdx + 1}/{config.length}
          </span>
        </div>

        {activeSection.items.map(item => {
          const itemState = audit.itemStates[item.id];
          const isCompliant = itemState?.isCompliant;
          const showFail = isCompliant === false;

          return (
            <div
              key={item.id}
              style={{
                borderRadius: '14px', overflow: 'hidden',
                border: showFail ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.07)',
                background: showFail ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)',
                transition: 'all 0.2s'
              }}
            >
              {/* Item row */}
              <div style={{ padding: '14px 14px 12px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: showFail ? 700 : 500, color: showFail ? '#fca5a5' : '#e2e8f0', lineHeight: 1.4, display: 'block' }}>
                    {item.text}
                  </span>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: showFail ? '#f87171' : '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '4px 0 0' }}>
                    Penalidad: -{item.defaultPenalty} pts
                  </p>
                </div>

                {/* PASS / FAIL buttons — full width on mobile */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    onClick={() => updateItemState(item.id, { isCompliant: true, penalty: item.defaultPenalty })}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '11px 8px', borderRadius: '10px', fontSize: '13px', fontWeight: 800,
                      cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                      background: isCompliant === true
                        ? 'linear-gradient(135deg,#10b981,#059669)'
                        : 'rgba(255,255,255,0.06)',
                      color: isCompliant === true ? '#fff' : '#64748b',
                      boxShadow: isCompliant === true ? '0 4px 14px rgba(16,185,129,0.35)' : 'none',
                      transform: isCompliant === true ? 'scale(1.02)' : 'scale(1)'
                    }}
                  >
                    <Check style={{ width: '15px', height: '15px' }} />
                    PASS
                  </button>
                  <button
                    onClick={() => updateItemState(item.id, { isCompliant: false, penalty: item.defaultPenalty })}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '11px 8px', borderRadius: '10px', fontSize: '13px', fontWeight: 800,
                      cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                      background: isCompliant === false
                        ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                        : 'rgba(255,255,255,0.06)',
                      color: isCompliant === false ? '#fff' : '#64748b',
                      boxShadow: isCompliant === false ? '0 4px 14px rgba(239,68,68,0.35)' : 'none',
                      transform: isCompliant === false ? 'scale(1.02)' : 'scale(1)'
                    }}
                  >
                    <X style={{ width: '15px', height: '15px' }} />
                    FAIL
                  </button>
                </div>
              </div>

              {/* ── Evidence panel on FAIL ── */}
              {showFail && (
                <div style={{ padding: '14px', borderTop: '1px solid rgba(239,68,68,0.2)', background: 'rgba(0,0,0,0.15)' }}>
                  <p style={{ fontSize: '10px', fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px' }}>
                    Evidencia de Fallo · -{item.defaultPenalty} pts
                  </p>

                  {/* Observation */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    <MessageSquare style={{ width: '12px', height: '12px' }} />
                    Observación
                  </label>
                  <textarea
                    value={itemState?.observation || ''}
                    onChange={e => updateItemState(item.id, { observation: e.target.value })}
                    placeholder="Describe el problema encontrado..."
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 12px',
                      borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.05)', color: '#f1f5f9',
                      fontSize: '14px', resize: 'none', outline: 'none',
                      fontFamily: 'inherit', boxSizing: 'border-box',
                      marginBottom: '14px', lineHeight: 1.5
                    }}
                  />

                  {/* Photo */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    <Camera style={{ width: '12px', height: '12px' }} />
                    Fotografía
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

      {/* ── Bottom Nav — fixed ── */}
      <div style={{
        position: 'sticky', bottom: 0, zIndex: 20,
        background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'
      }}>
        <button
          onClick={() => goToSection(Math.max(0, activeSectionIdx - 1))}
          disabled={activeSectionIdx === 0}
          style={{
            padding: '13px', borderRadius: '12px', fontSize: '13px', fontWeight: 700,
            cursor: activeSectionIdx === 0 ? 'not-allowed' : 'pointer', border: 'none',
            background: 'rgba(255,255,255,0.05)', color: activeSectionIdx === 0 ? '#334155' : '#94a3b8',
            opacity: activeSectionIdx === 0 ? 0.4 : 1
          }}
        >
          ← Anterior
        </button>

        {activeSectionIdx < config.length - 1 ? (
          <button
            onClick={() => goToSection(activeSectionIdx + 1)}
            style={{
              padding: '13px', borderRadius: '12px', fontSize: '13px', fontWeight: 800,
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
            disabled={isSaving || Object.values(uploadingItems).some(Boolean)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '13px', borderRadius: '12px', fontSize: '13px', fontWeight: 800,
              cursor: 'pointer', border: 'none',
              background: isSaving ? 'rgba(16,185,129,0.5)' : 'linear-gradient(135deg,#10b981,#059669)',
              color: '#fff', boxShadow: '0 4px 16px rgba(16,185,129,0.35)',
              opacity: (isSaving || Object.values(uploadingItems).some(Boolean)) ? 0.7 : 1
            }}
          >
            {isSaving || Object.values(uploadingItems).some(Boolean)
              ? <><Loader2 style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} /> Guardando...</>
              : <><CheckCircle2 style={{ width: '15px', height: '15px' }} /> Finalizar</>
            }
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        div::-webkit-scrollbar { display: none; }
        textarea::placeholder { color: #334155; }
        input::placeholder { color: #334155; }
      `}</style>
    </div>
  );
}
