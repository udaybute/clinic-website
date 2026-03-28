"use client"

// components/dashboard/ConfirmDialog.tsx
// Reusable confirmation dialog.
// Usage:
//   const [confirmOpen, setConfirmOpen] = useState(false)
//   <ConfirmDialog
//     open={confirmOpen}
//     title="Delete patient?"
//     message="This cannot be undone."
//     danger
//     onConfirm={() => { doDelete(); setConfirmOpen(false) }}
//     onCancel={() => setConfirmOpen(false)}
//   />

interface Props {
  open:          boolean
  title:         string
  message:       string
  confirmLabel?: string
  cancelLabel?:  string
  danger?:       boolean
  loading?:      boolean
  onConfirm:     () => void
  onCancel:      () => void
}

export default function ConfirmDialog({
  open, title, message,
  confirmLabel = "Confirm",
  cancelLabel  = "Cancel",
  danger   = false,
  loading  = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        .cdlg-overlay {
          position: fixed; inset: 0;
          background: rgba(10,22,40,.5);
          z-index: 1000;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: cdlgFade .15s ease;
        }
        @keyframes cdlgFade { from { opacity:0 } to { opacity:1 } }
        .cdlg-box {
          background: #fff;
          border-radius: 18px;
          padding: 28px 28px 22px;
          max-width: 420px;
          width: 100%;
          box-shadow: 0 24px 64px rgba(10,22,40,.22);
          animation: cdlgSlide .18s cubic-bezier(.25,0,.25,1);
        }
        @keyframes cdlgSlide { from { opacity:0; transform:translateY(-10px) } to { opacity:1; transform:translateY(0) } }
        .cdlg-icon  { font-size: 2.2rem; margin-bottom: 10px; line-height: 1; }
        .cdlg-title { font-family: 'Cormorant Garamond',serif; font-size: 1.3rem; font-weight: 700; color: #0a1628; margin: 0 0 8px; }
        .cdlg-msg   { font-size: .88rem; color: #64748b; line-height: 1.65; margin: 0 0 24px; }
        .cdlg-foot  { display: flex; gap: 10px; justify-content: flex-end; }
        .cdlg-cancel {
          padding: 9px 20px; border-radius: 9999px;
          border: 1.5px solid rgba(10,22,40,.12);
          background: none; cursor: pointer;
          font-family: 'DM Sans',sans-serif; font-size: .85rem; color: #64748b;
          transition: background .15s;
        }
        .cdlg-cancel:hover { background: rgba(10,22,40,.05); }
        .cdlg-confirm {
          padding: 9px 22px; border-radius: 9999px;
          border: none; cursor: pointer;
          font-family: 'DM Sans',sans-serif; font-size: .85rem; font-weight: 600; color: #fff;
          transition: opacity .15s, transform .1s;
          min-width: 100px; display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .cdlg-confirm:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
        .cdlg-confirm:disabled { opacity: .55; cursor: not-allowed; }
      `}</style>

      <div className="cdlg-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="cdlg-title">
        <div className="cdlg-box" onClick={e => e.stopPropagation()}>
          <div className="cdlg-icon">{danger ? "⚠️" : "❓"}</div>
          <h2 className="cdlg-title" id="cdlg-title">{title}</h2>
          <p className="cdlg-msg">{message}</p>
          <div className="cdlg-foot">
            <button className="cdlg-cancel" onClick={onCancel} disabled={loading}>
              {cancelLabel}
            </button>
            <button
              className="cdlg-confirm"
              style={{ background: danger
                ? "linear-gradient(135deg,#dc2626,#991b1b)"
                : "linear-gradient(135deg,#0d9488,#065f4a)" }}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                  </svg>
                  <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                </>
              ) : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
