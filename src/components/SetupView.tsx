import React, { useState } from 'react';
import { AppState } from '../types';
import { Building, DoorClosed, User, Calendar, ArrowRight, ArrowLeft, Users, UserCheck } from 'lucide-react';

interface SetupViewProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '13px 14px 13px 42px',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
  background: 'rgba(255,255,255,0.05)', color: '#f1f5f9',
  fontSize: '15px', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'border-color 0.2s',
  WebkitAppearance: 'none'
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 800,
  color: '#64748b', marginBottom: '6px',
  textTransform: 'uppercase', letterSpacing: '1px'
};

const iconWrapStyle: React.CSSProperties = {
  position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
  pointerEvents: 'none', display: 'flex', alignItems: 'center'
};

export function SetupView({ state, setState }: SetupViewProps) {
  const [formData, setFormData] = useState({
    hotelName: state.audit.hotelName,
    roomNumber: state.audit.roomNumber,
    auditorName: state.audit.auditorName,
    roomAttendant: state.audit.roomAttendant || '',
    supervisor: state.audit.supervisor || '',
    date: state.audit.date || new Date().toISOString().split('T')[0]
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    setState(prev => ({ ...prev, view: 'audit', audit: { ...prev.audit, ...formData } }));
  };

  return (
    <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)', minHeight: '100%' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '20px 16px 40px' }}>

        {/* Back */}
        <button
          type="button"
          onClick={() => setState(prev => ({ ...prev, view: 'rooms' }))}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '20px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#64748b', fontSize: '11px', fontWeight: 700,
            letterSpacing: '1px', textTransform: 'uppercase', padding: 0
          }}
        >
          <ArrowLeft style={{ width: '13px', height: '13px' }} />
          Volver
        </button>

        {/* Title */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, color: '#818cf8', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 4px' }}>
            Módulo 01 · Rooms Audit
          </p>
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#f1f5f9', margin: 0, letterSpacing: '-0.5px' }}>
            Nueva Auditoría
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
            Completa los datos de la habitación a inspeccionar
          </p>
        </div>

        <form onSubmit={handleStart}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>

            {/* Hotel */}
            <div>
              <label style={labelStyle}>Nombre del Hotel</label>
              <div style={{ position: 'relative' }}>
                <span style={iconWrapStyle}><Building style={{ width: '17px', height: '17px', color: '#475569' }} /></span>
                <input type="text" name="hotelName" required value={formData.hotelName}
                  onChange={handleChange} placeholder="Ej. Grand Plaza Hotel" style={inputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>

            {/* Room Number */}
            <div>
              <label style={labelStyle}>Número de Habitación</label>
              <div style={{ position: 'relative' }}>
                <span style={iconWrapStyle}><DoorClosed style={{ width: '17px', height: '17px', color: '#475569' }} /></span>
                <input type="text" name="roomNumber" required value={formData.roomNumber}
                  onChange={handleChange} placeholder="Ej. 402" style={{ ...inputStyle, fontSize: '18px', fontWeight: 700 }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>

            {/* Auditor */}
            <div>
              <label style={labelStyle}>Nombre del Auditor</label>
              <div style={{ position: 'relative' }}>
                <span style={iconWrapStyle}><User style={{ width: '17px', height: '17px', color: '#475569' }} /></span>
                <input type="text" name="auditorName" required value={formData.auditorName}
                  onChange={handleChange} placeholder="Ej. Carlos Mendoza" style={inputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>

            {/* Room Attendant */}
            <div>
              <label style={labelStyle}>Encargado de Habitaciones</label>
              <div style={{ position: 'relative' }}>
                <span style={iconWrapStyle}><Users style={{ width: '17px', height: '17px', color: '#475569' }} /></span>
                <input type="text" name="roomAttendant" required value={formData.roomAttendant}
                  onChange={handleChange} placeholder="Ej. Ana López" style={inputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>

            {/* Supervisor */}
            <div>
              <label style={labelStyle}>Supervisor</label>
              <div style={{ position: 'relative' }}>
                <span style={iconWrapStyle}><UserCheck style={{ width: '17px', height: '17px', color: '#475569' }} /></span>
                <input type="text" name="supervisor" required value={formData.supervisor}
                  onChange={handleChange} placeholder="Ej. Roberto Gómez" style={inputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label style={labelStyle}>Fecha</label>
              <div style={{ position: 'relative' }}>
                <span style={iconWrapStyle}><Calendar style={{ width: '17px', height: '17px', color: '#475569' }} /></span>
                <input type="date" name="date" required value={formData.date}
                  onChange={handleChange} style={{ ...inputStyle, colorScheme: 'dark' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>
          </div>

          {/* Config link */}
          <button
            type="button"
            onClick={() => setState(prev => ({ ...prev, view: 'config' }))}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#475569', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px',
              padding: '0 0 20px', display: 'block', textDecoration: 'underline',
              textUnderlineOffset: '3px'
            }}
          >
            Configuración de Penalidades
          </button>

          {/* Submit FAB-style */}
          <button
            type="submit"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '16px', borderRadius: '14px', cursor: 'pointer',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              border: '1px solid rgba(99,102,241,0.5)',
              color: '#fff', fontSize: '14px', fontWeight: 800,
              letterSpacing: '0.5px', textTransform: 'uppercase',
              boxShadow: '0 6px 24px rgba(99,102,241,0.45)'
            }}
          >
            Iniciar Auditoría
            <ArrowRight style={{ width: '18px', height: '18px' }} />
          </button>
        </form>
      </div>
    </div>
  );
}
