"use client";

const PLATFORM_LABELS = {
  youtube: "YouTube",
  twitter: "Twitter",
  tiktok: "TikTok",
  instagram: "Instagram",
  web: "Web",
  other: "Other",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function truncate(value, max = 72) {
  if (!value) return "Untitled drop";
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export default function ContentList({ items = [], onSelect, onToggleProcessed }) {
  if (!items.length) {
    return <div className="empty">No content found</div>;
  }

  return (
    <>
      <div className="table-wrap content-table-desktop">
        <table>
          <thead>
            <tr>
              <th>Platform</th>
              <th>Title</th>
              <th>Created</th>
              <th>Processed</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="content-table-row" onClick={() => onSelect?.(item)} style={{ cursor: "pointer" }}>
                <td>
                  <span className="content-platform-pill">
                    {PLATFORM_LABELS[item.platform] || item.platform || "Other"}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {truncate(item.title || item.source_url)}
                  </div>
                  {item.source_url ? (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                      {truncate(item.source_url, 56)}
                    </div>
                  ) : null}
                </td>
                <td>{formatDate(item.created_at)}</td>
                <td onClick={(event) => event.stopPropagation()}>
                  <label className="content-checkbox-row compact">
                    <input
                      type="checkbox"
                      checked={!!item.processed}
                      onChange={(event) => onToggleProcessed?.(item.id, event.target.checked)}
                    />
                    <span>{item.processed ? "Yes" : "No"}</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="content-mobile-list">
        {items.map((item) => (
          <button key={item.id} type="button" className="content-mobile-card content-card-layer" onClick={() => onSelect?.(item)}>
            <div className="content-mobile-card-top">
              <span className="content-platform-pill">
                {PLATFORM_LABELS[item.platform] || item.platform || "Other"}
              </span>
              <span className="content-mobile-date">{formatDate(item.created_at)}</span>
            </div>
            <div className="content-mobile-title">{truncate(item.title || item.source_url, 96)}</div>
            {item.source_url ? (
              <div className="content-mobile-url">{truncate(item.source_url, 88)}</div>
            ) : null}
            <div className="content-mobile-footer" onClick={(event) => event.stopPropagation()}>
              <label className="content-checkbox-row compact">
                <input
                  type="checkbox"
                  checked={!!item.processed}
                  onChange={(event) => onToggleProcessed?.(item.id, event.target.checked)}
                />
                <span>{item.processed ? "Processed" : "Unprocessed"}</span>
              </label>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
