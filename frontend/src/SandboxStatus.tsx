import React, { useEffect, useState } from 'react';

interface SandboxInfo {
  status: 'running' | 'stopped' | 'loading';
  parties: string[];
  ledgerId: string;
  sdkVersion: string;
}

export const SandboxStatus: React.FC = () => {
  const [info, setInfo] = useState<SandboxInfo>({ status: 'loading', parties: [], ledgerId: '', sdkVersion: '' });

  useEffect(() => {
    fetch('/api/sandbox/status')
      .then(r => r.json())
      .then(setInfo)
      .catch(() => setInfo(prev => ({ ...prev, status: 'stopped' })));
  }, []);

  const colour = { running: '#22c55e', stopped: '#ef4444', loading: '#f59e0b' }[info.status];

  return (
    <div style={{ background: '#1e293b', color: '#e2e8f0', borderRadius: 8, padding: 20, fontFamily: 'monospace' }}>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Canton Sandbox</h2>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: colour, display: 'inline-block' }} />
        <span style={{ textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 }}>{info.status}</span>
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8' }}>
        <div>Ledger ID: {info.ledgerId || '—'}</div>
        <div>SDK: {info.sdkVersion || '—'}</div>
        <div>Parties: {info.parties.length}</div>
      </div>
    </div>
  );
};
