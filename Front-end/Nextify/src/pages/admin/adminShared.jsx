export function DetailField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', wordBreak: 'break-word' }}>{value || '—'}</div>
    </div>
  );
}
