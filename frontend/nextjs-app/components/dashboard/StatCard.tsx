// components/dashboard/StatCard.tsx
// Status: ✅ No errors found — reproduced as-is

interface Props {
  label:   string
  value:   string | number
  sub?:    string
  icon:    string
  trend?:  { value: string; up: boolean }
  color:   string
  delay?:  number
}

export default function StatCard({ label, value, sub, icon, trend, color, delay = 0 }: Props) {
  return (
    <>
      <style>{`
        .sc-wrap {
          background: #fff;
          border-radius: 18px;
          padding: 22px 24px;
          border: 1px solid rgba(10,22,40,.07);
          box-shadow: 0 2px 16px rgba(10,22,40,.05);
          display: flex; flex-direction: column; gap: 14px;
          position: relative; overflow: hidden;
          transition: transform .3s cubic-bezier(.34,1.56,.64,1), box-shadow .3s;
          animation: scSlideIn .5s ease both;
        }
        .sc-wrap:hover { transform: translateY(-4px); box-shadow: 0 8px 32px rgba(10,22,40,.10); }
        @keyframes scSlideIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .sc-glow {
          position: absolute; top: -30px; right: -30px;
          width: 100px; height: 100px; border-radius: 50%;
          opacity: .08; filter: blur(20px); pointer-events: none;
        }
        .sc-top { display: flex; align-items: flex-start; justify-content: space-between; }
        .sc-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.2rem; flex-shrink: 0;
        }
        .sc-trend {
          font-size: .72rem; font-weight: 600; padding: 3px 9px; border-radius: 50px;
          display: flex; align-items: center; gap: 3px;
        }
        .sc-trend.up   { color: #16a34a; background: rgba(22,163,74,.1); }
        .sc-trend.down { color: #dc2626; background: rgba(220,38,38,.1); }
        .sc-value {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2rem; font-weight: 700; color: #0a1628; line-height: 1;
        }
        .sc-label { font-size: .8rem; font-weight: 500; color: #64748b; }
        .sc-sub   { font-size: .72rem; color: #94a3b8; margin-top: 2px; }
      `}</style>

      <div className="sc-wrap" style={{ animationDelay: `${delay}ms` }}>
        <div className="sc-glow" style={{ background: color }} />
        <div className="sc-top">
          <div className="sc-icon" style={{ background: `${color}18` }}>{icon}</div>
          {trend && (
            <div className={`sc-trend ${trend.up ? "up" : "down"}`}>
              {trend.up ? "↑" : "↓"} {trend.value}
            </div>
          )}
        </div>
        <div>
          <div className="sc-value">{value}</div>
          <div className="sc-label">{label}</div>
          {sub && <div className="sc-sub">{sub}</div>}
        </div>
      </div>
    </>
  )
}