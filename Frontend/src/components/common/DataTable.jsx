import { useMemo, useState } from "react";
import { Search, Plus, Pencil, Trash2, Eye, Download } from "lucide-react";
import { StatusBadge, Loader } from "./Ui.jsx";

const PAGE_SIZE = 5;

export default function DataTable({
  columns,
  rows,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onView,
  addLabel = "Add New",
  title,
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageRows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="cms-card">
      <div className="cms-toolbar">
        <div className="cms-search">
          <Search size={16} />
          <input
            value={query}
            placeholder={`Search ${title || "records"}...`}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="cms-toolbar-right">
          <button className="cms-btn cms-btn-ghost" onClick={() => window.print()}>
            <Download size={15} /> Export
          </button>
          {onAdd ? (
            <button className="cms-btn cms-btn-primary" onClick={onAdd}>
              <Plus size={16} /> {addLabel}
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1}>
                    <div className="cms-empty">No records found for your search.</div>
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr key={row.id}>
                    {columns.map((c) => (
                      <td key={c.key} className={c.strong ? "cms-strong" : ""}>
                        {c.badge ? <StatusBadge value={row[c.key]} /> : c.render ? c.render(row) : row[c.key]}
                      </td>
                    ))}
                    <td>
                      <div className="cms-actions" style={{ justifyContent: "flex-end" }}>
                        {onView ? (
                          <button className="cms-action-btn view" title="View" aria-label="View record" onClick={() => onView(row)}>
                            <Eye size={15} />
                          </button>
                        ) : null}
                        {onEdit ? (
                          <button className="cms-action-btn edit" title="Edit" aria-label="Edit record" onClick={() => onEdit(row)}>
                            <Pencil size={15} />
                          </button>
                        ) : null}
                        {onDelete ? (
                          <button className="cms-action-btn danger" title="Delete" aria-label="Delete record" onClick={() => onDelete(row)}>
                            <Trash2 size={15} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="cms-pagination">
        <span className="cms-page-info">
          Showing {filtered.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1}-
          {Math.min(current * PAGE_SIZE, filtered.length)} of {filtered.length} records
        </span>
        <button className="cms-page-btn" disabled={current === 1} onClick={() => setPage(current - 1)}>
          Prev
        </button>
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            className={`cms-page-btn ${current === i + 1 ? "is-active" : ""}`}
            onClick={() => setPage(i + 1)}
          >
            {i + 1}
          </button>
        ))}
        <button className="cms-page-btn" disabled={current === totalPages} onClick={() => setPage(current + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}



