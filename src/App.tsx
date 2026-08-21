/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
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
              console.warn('Firebase loading timed out, using local defaults.');
              const localAuditsRaw = localStorage.getItem('qaudit_saved_audits');
              let localAudits: any[] = [];
              if (localAuditsRaw) { try { localAudits = JSON.parse(localAuditsRaw); } catch (e) {} }
              setState(prev => ({ ...prev, user, savedAudits: localAudits }));
            }
          } catch (e) {
            console.error('Error during initial data load:', e);
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
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#818cf8', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', fontSize: '11px' }}>
            Cargando Sistema...
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0f172a' }}>
      {/* ── Top Bar ── */}
      <header style={{
        background: 'rgba(15,23,42,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 2px 20px rgba(0,0,0,0.5)'
      }}>
        <div style={{
          maxWidth: '1280px', margin: '0 auto', padding: '0 16px',
          height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          {/* Logo */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            onClick={() => setState(prev => ({ ...prev, view: 'dashboard' }))}
          >
            <div style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '10px', width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 14px rgba(99,102,241,0.45)', flexShrink: 0
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 22v-6.57"/><path d="M12 11h.01"/><path d="M12 7h.01"/>
                <path d="M14 15.43V22"/><path d="M15 16a5 5 0 0 0-6 0"/>
                <path d="M16 11h.01"/><path d="M16 7h.01"/><path d="M8 11h.01"/><path d="M8 7h.01"/>
                <rect x="4" y="2" width="16" height="20" rx="2"/>
              </svg>
            </div>
            <span style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.5px', color: '#f1f5f9' }}>
              Q<span style={{ color: '#818cf8' }}>Audit</span>
            </span>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {state.view === 'audit' && (
              <button
                onClick={() => setState(prev => ({ ...prev, view: 'rooms' }))}
                style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  color: '#f87171', fontSize: '11px', fontWeight: 700, letterSpacing: '1px',
                  textTransform: 'uppercase', padding: '7px 14px', borderRadius: '10px',
                  cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >
                Cancelar
              </button>
            )}
            {/* Cloud status dot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                background: state.user ? '#10b981' : '#475569',
                boxShadow: state.user ? '0 0 8px rgba(16,185,129,0.7)' : 'none'
              }} />
              <span style={{
                fontSize: '10px', fontWeight: 700, color: state.user ? '#34d399' : '#475569',
                textTransform: 'uppercase', letterSpacing: '1px',
                display: 'none'  // hidden on mobile, show via CSS below
              }} className="cloud-label">
                {state.user ? 'Sync' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main style={{ height: 'calc(100vh - 56px)', overflowY: 'auto', overscrollBehavior: 'contain' }}>
        {state.view === 'dashboard' && <DashboardView state={state} setState={setState} />}
        {state.view === 'rooms'     && <RoomsDashboardView state={state} setState={setState} />}
        {state.view === 'setup'     && <SetupView state={state} setState={setState} />}
        {state.view === 'config'    && <ConfigView state={state} setState={setState} />}
        {state.view === 'audit'     && <ChecklistView state={state} setState={setState} />}
        {state.view === 'report'    && <ReportView state={state} setState={setState} />}
      </main>

      <style>{`
        @media (min-width: 640px) {
          .cloud-label { display: inline !important; }
        }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        input, textarea, button { font-family: inherit; }
      `}</style>
    </div>
  );
}
