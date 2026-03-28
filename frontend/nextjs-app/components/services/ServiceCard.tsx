"use client"
import { Service } from "@/types"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ServiceCard({ service, index = 0 }: { service: Service; index?: number }) {
  const router = useRouter()

  return (
    <div
      className="service-card group"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* IMAGE */}
      <div className="card-image-wrap">
        <img
          src={service.image || "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5"}
          alt={service.name}
          className="card-image"
        />
        <div className="card-image-overlay" />

        {service.category && (
          <span className="category-badge">{service.category}</span>
        )}

        <div className="card-price-chip">
          <span className="price-label">from</span>
          <span className="price-value">${service.price}</span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="card-body">
        <div className="card-meta">
          <span className="duration-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            {service.duration} min
          </span>
        </div>

        <h2 className="card-title">{service.name}</h2>

        <p className="card-desc">
          {service.description ||
            "Advanced dental treatment performed by experienced specialists using modern technology."}
        </p>

        {service.benefits && (
          <ul className="benefits-list">
            {service.benefits.slice(0, 3).map((b: string, i: number) => (
              <li key={i} className="benefit-item">
                <span className="benefit-dot" />
                {b}
              </li>
            ))}
          </ul>
        )}

        <div className="card-actions">
          <Link
            href={`/booking?serviceId=${service.id}`}
            className="btn-primary"
          >
            Book Now
          </Link>

          {/* ✅ Details button — navigates to /services/[id] */}
          <button
            className="btn-ghost"
            onClick={() => router.push(`/services/${service.id}`)}
          >
            Details
          </button>
        </div>
      </div>

      <style jsx>{`
        .service-card {
          background: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(15, 23, 42, 0.07);
          border: 1px solid rgba(15, 23, 42, 0.06);
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 0.35s cubic-bezier(0.22, 1, 0.36, 1);
          opacity: 0;
          animation: fadeUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .service-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 48px rgba(15, 23, 42, 0.13);
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .card-image-wrap { position: relative; height: 200px; overflow: hidden; }
        .card-image { width: 100%; height: 100%; object-fit: cover; transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1); }
        .service-card:hover .card-image { transform: scale(1.07); }
        .card-image-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,14,26,0.55) 0%, transparent 55%); }
        .category-badge {
          position: absolute; top: 14px; left: 14px;
          background: rgba(255,255,255,0.15); backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.3); color: #fff;
          font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
          padding: 4px 12px; border-radius: 99px;
        }
        .card-price-chip { position: absolute; bottom: 14px; left: 14px; display: flex; align-items: baseline; gap: 4px; }
        .price-label { color: rgba(255,255,255,0.7); font-size: 10px; font-weight: 500; }
        .price-value { color: #fff; font-size: 22px; font-weight: 700; letter-spacing: -0.03em; font-family: 'Georgia', serif; }
        .card-body { padding: 20px 22px 24px; }
        .card-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .duration-badge { display: flex; align-items: center; gap: 5px; color: #94a3b8; font-size: 11px; font-weight: 500; }
        .card-title { font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; margin-bottom: 8px; line-height: 1.3; }
        .card-desc { font-size: 13px; color: #64748b; line-height: 1.6; margin-bottom: 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .benefits-list { list-style: none; padding: 0; margin: 0 0 18px; display: flex; flex-direction: column; gap: 6px; }
        .benefit-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #475569; font-weight: 500; }
        .benefit-dot { width: 5px; height: 5px; border-radius: 50%; background: #0ea5e9; flex-shrink: 0; }
        .card-actions { display: flex; gap: 10px; margin-top: 4px; }
        .btn-primary {
          flex: 1; text-align: center; background: #0f172a; color: #fff;
          padding: 11px 16px; border-radius: 10px; font-size: 13px; font-weight: 600;
          letter-spacing: 0.01em; transition: background 0.2s, transform 0.15s;
          text-decoration: none; display: block;
        }
        .btn-primary:hover { background: #1e3a5f; transform: scale(0.98); }
        .btn-ghost {
          flex: 1; border: 1.5px solid #e2e8f0; background: transparent; color: #334155;
          padding: 11px 16px; border-radius: 10px; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: border-color 0.2s, background 0.2s, transform 0.15s;
        }
        .btn-ghost:hover { border-color: #94a3b8; background: #f8fafc; transform: scale(0.98); }
      `}</style>
    </div>
  )
}
