/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { AppState } from './types';
import { defaultSections } from './data';
import { SetupView } from './components/SetupView';
import { ConfigView } from './components/ConfigView';
import { ChecklistView } from './components/ChecklistView';
import { ReportView } from './components/ReportView';
import { DashboardView } from './components/DashboardView';
import { RoomsDashboardView } from './components/RoomsDashboardView';
import { auth, loginAnonymously, loadConfigFromCloud, loadAuditsFromCloud } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Back navigation map
const BACK_NAV: Partial<Record<AppState['view'], AppState['view']>> = {
  rooms:  'dashboard',
  setup:  'rooms',
  config: 'rooms',
  audit:  'rooms',
  report: 'rooms',
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<AppState>({
    view: 'dashboard',
    config: defaultSections,
    savedAudits: [],
    user: null,
    audit: {
      hotelName: '',
      roomNumber: '',
      auditorName: '',
      roomAttendant: '',
      supervisor: '',
      date: new Date().toISOString().split('T')[0],
      maxScore: 50,
      itemStates: {}
    }
  });

  // Swipe-back gesture
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    // Right swipe from left edge (first 40px), at least 70px horizontal, not too vertical
    if (touchStartX.current < 40 && dx > 70 && dy < 120) {
      const backView = BACK_NAV[state.view];
      if (backView) setState(prev => ({ ...prev, view: backView }));
    }
  };

  useEffect(() => {
    if (state.savedAudits.length > 0) {
      localStorage.setItem('qaudit_saved_audits', JSON.stringify(state.savedAudits));
    }
  }, [state.savedAudits]);

  useEffect(() => {
    const initApp = async () => {
      await loginAnonymously();
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
            const loadDataPromise = Promise.all([loadConfigFromCloud(), loadAuditsFromCloud()]);
            const result = await Promise.race([loadDataPromise, timeoutPromise]);
            if (result) {
              const [cloudConfig, cloudAudits] = result as [any, any];
              const localAuditsRaw = localStorage.getItem('qaudit_saved_audits');
              let mergedAudits = cloudAudits;
              if (localAuditsRaw) {
                try {
                  const localAudits = JSON.parse(localAuditsRaw);
                  const cloudIds = new Set(cloudAudits.map((a: any) => a.id));
                  const missingLocals = localAudits.filter((a: any) => !cloudIds.has(a.id));
                  mergedAudits = [...cloudAudits, ...missingLocals].sort((a, b) => b.timestamp - a.timestamp);
                } catch (err) { console.error('Error parsing local audits', err); }
              }
              setState(prev => ({ ...prev, user, config: cloudConfig, savedAudits: mergedAudits }));
            } else {
              const localAuditsRaw = localStorage.getItem('qaudit_saved_audits');
              let localAudits: any[] = [];
              if (localAuditsRaw) { try { localAudits = JSON.parse(localAuditsRaw); } catch (e) {} }
              setState(prev => ({ ...prev, user, savedAudits: localAudits }));
            }
          } catch (e) {
            const localAuditsRaw = localStorage.getItem('qaudit_saved_audits');
            let localAudits: any[] = [];
            if (localAuditsRaw) { try { localAudits = JSON.parse(localAuditsRaw); } catch (e) {} }
            setState(prev => ({ ...prev, user, savedAudits: localAudits }));
          } finally {
            setLoading(false);
          }
        } else {
          const localAuditsRaw = localStorage.getItem('qaudit_saved_audits');
          let localAudits: any[] = [];
          if (localAuditsRaw) { try { localAudits = JSON.parse(localAuditsRaw); } catch (e) {} }
          setState(prev => ({ ...prev, user: null, savedAudits: localAudits }));
          setLoading(false);
        }
      });
      return () => unsubscribe();
    };
    initApp();
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '56px', height: '56px',
            border: '3px solid rgba(99,102,241,0.2)',
            borderTopColor: '#6366f1', borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 16px'
          }} />
          <p style={{ color: '#818cf8', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', fontSize: '11px' }}>
            Cargando...
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif", background: '#0f172a', overflow: 'hidden' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Top Bar ── */}
      <header style={{
        background: 'rgba(15,23,42,0.98)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        zIndex: 50, boxShadow: '0 2px 20px rgba(0,0,0,0.5)', flexShrink: 0
      }}>
        <div style={{
          maxWidth: '1280px', margin: '0 auto', padding: '0 16px',
          height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          {/* Logo — IQOS Audit Management */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', minWidth: 0 }}
            onClick={() => setState(prev => ({ ...prev, view: 'dashboard' }))}
          >
            <div style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '10px', width: '32px', height: '32px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 14px rgba(99,102,241,0.45)'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 22v-6.57"/><path d="M12 11h.01"/><path d="M12 7h.01"/>
                <path d="M14 15.43V22"/><path d="M15 16a5 5 0 0 0-6 0"/>
                <path d="M16 11h.01"/><path d="M16 7h.01"/><path d="M8 11h.01"/><path d="M8 7h.01"/>
                <rect x="4" y="2" width="16" height="20" rx="2"/>
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '-0.3px', color: '#f1f5f9', display: 'block', lineHeight: 1 }}>
                IQOS <span style={{ color: '#818cf8' }}>Audit</span>
              </span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#475569', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Management
              </span>
            </div>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {state.view === 'audit' && (
              <button
                onClick={() => setState(prev => ({ ...prev, view: 'rooms' }))}
                style={{
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171', fontSize: '11px', fontWeight: 700, letterSpacing: '1px',
                  textTransform: 'uppercase', padding: '7px 14px', borderRadius: '10px',
                  cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >
                Cancelar
              </button>
            )}
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
              background: state.user ? '#10b981' : '#475569',
              boxShadow: state.user ? '0 0 8px rgba(16,185,129,0.7)' : 'none'
            }} />
          </div>
        </div>
      </header>

      {/* ── Main — fills remaining height, each view manages its own scroll ── */}
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {state.view === 'dashboard' && (
          <div style={{ height: '100%', overflowY: 'auto', overscrollBehavior: 'contain' }}>
            <DashboardView state={state} setState={setState} />
          </div>
        )}
        {state.view === 'rooms' && (
          <div style={{ height: '100%', overflowY: 'auto', overscrollBehavior: 'contain' }}>
            <RoomsDashboardView state={state} setState={setState} />
          </div>
        )}
        {state.view === 'setup' && (
          <div style={{ height: '100%', overflowY: 'auto', overscrollBehavior: 'contain' }}>
            <SetupView state={state} setState={setState} />
          </div>
        )}
        {state.view === 'config' && (
          <div style={{ height: '100%', overflowY: 'auto', overscrollBehavior: 'contain' }}>
            <ConfigView state={state} setState={setState} />
          </div>
        )}
        {/* ChecklistView manages its own internal scroll via flex layout */}
        {state.view === 'audit' && <ChecklistView state={state} setState={setState} />}
        {state.view === 'report' && (
          <div style={{ height: '100%', overflowY: 'auto', overscrollBehavior: 'contain' }}>
            <ReportView state={state} setState={setState} />
          </div>
        )}
      </main>

      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        input, textarea, button, select { font-family: inherit; }
      `}</style>
    </div>
  );
}
