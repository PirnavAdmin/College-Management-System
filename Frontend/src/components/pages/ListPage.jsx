import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import DataTable from "@/components/common/DataTable.jsx";
import { ConfirmDialog, FilterBar, Modal, Toast, StatusBadge } from "@/components/common/Ui.jsx";
import { getApiErrorMessage } from "@/api/axios.js";
import { configFor, deleteRow, useRows } from "@/data/store.js";

function SummaryCards({ config }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!config.summary?.fetch) return;
    let mounted = true;
    config.summary
      .fetch()
      .then((res) => {
        if (!mounted) return;
        setSummary(config.summary.map(res.data));
      })
      .catch(() => {
        if (mounted) setSummary(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => (mounted = false);
  }, [config.summary]);

  if (!config.summary?.fetch || loading || !summary) return null;

  const colorFor = (label) => {
    const l = label.toLowerCase();
    if (l === "active") return { text: "#16a34a", bg: "#dcfce7" };
    if (l === "inactive") return { text: "#dc2626", bg: "#fee2e2" };
    return { text: "#2563eb", bg: "#dbeafe" };
  };

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
      {summary.map((card) => {
        const c = colorFor(card.label);
        return (
          <div
            key={card.label}
            className="cms-card"
            style={{ flex: "1 1 0", padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: c.bg,
                color: c.text,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {card.value}
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "var(--cms-muted)" }}>{card.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function Section({ slug, config, secondary, onToast, heading, onView }) {
  const sectionConfig = configFor(config, secondary);
  const storeRows = useRows(slug, secondary, config);
  const usesApi = Boolean(sectionConfig?.api?.fetchRows || sectionConfig?.api?.getAll);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const navigate = useNavigate();

  const loadRows = useCallback(async (nextSearch = "", nextFilters = {}) => {
    if (!usesApi) return;
    setLoading(true);
    setError("");
    try {
      const loadedRows = sectionConfig.api.fetchRows
        ? await sectionConfig.api.fetchRows({ search: nextSearch, filters: nextFilters })
        : sectionConfig.api.toRows((await sectionConfig.api.getAll()).data);
      setRows(loadedRows);
    } catch (err) {
      setRows([]);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [sectionConfig, usesApi]);

  useEffect(() => {
    setLoading(true);
    if (usesApi && !(sectionConfig.preserveLocalRows && storeRows.length > 0)) {
      loadRows("", {});
      return undefined;
    }
    const timer = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(timer);
  }, [slug, secondary, usesApi, loadRows, sectionConfig.preserveLocalRows, storeRows.length]);

  const sectionQuery = secondary ? "?section=secondary" : "";
  const displayedRows = sectionConfig.preserveLocalRows && storeRows.length > 0 ? storeRows : usesApi ? rows : storeRows;

  const setFilter = (name, value) => {
    if (name === "__reset__") {
      setFilters({});
      loadRows(search, {});
      return;
    }
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleSearch = useCallback((value) => {
    setSearch(value);
    loadRows(value, filters);
  }, [filters, loadRows]);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      if (usesApi && (sectionConfig.api.deleteRow || sectionConfig.api.delete)) {
        await (sectionConfig.api.deleteRow || sectionConfig.api.delete)(deleting.id);
        await loadRows(search, filters);
      } else {
        deleteRow(slug, secondary, deleting.id, config);
      }
      setDeleting(null);
      onToast("Record deleted successfully");
    } catch (err) {
      onToast(getApiErrorMessage(err));
    }
  };

  return (
    <>
      {heading ? <h2 style={{ fontSize: 16, margin: "22px 0 12px" }}>{heading}</h2> : null}
      {!secondary ? <SummaryCards config={sectionConfig} /> : null}
      {usesApi && sectionConfig.filters?.length ? (
        <FilterBar fields={sectionConfig.filters} values={filters} onChange={setFilter} onApply={() => loadRows(search, filters)} />
      ) : null}
      {error ? (
        <div className="cms-card" style={{ marginBottom: 16 }}>
          <div className="cms-card-body">
            <div className="cms-empty">{error}</div>
            <button className="cms-btn cms-btn-ghost" onClick={() => loadRows(search, filters)}>Retry</button>
          </div>
        </div>
      ) : null}
      <DataTable
        title={sectionConfig.title}
        columns={sectionConfig.columns}
        rows={displayedRows}
        loading={loading}
        addLabel={sectionConfig.addLabel}
        onSearchChange={sectionConfig.api?.fetchRows ? handleSearch : null}
        onAdd={() => navigate(`/dashboard/${slug}/add${sectionQuery}`)}
        onEdit={(row) => navigate(`/dashboard/${slug}/${row.id}/edit${sectionQuery}`)}
        onDelete={(row) => setDeleting(row)}
        onView={onView ? (row) => onView(row) : (row) => setViewing(row)}
      />

      {deleting ? (
        <ConfirmDialog
          message={`Delete "${deleting.name || deleting.title || deleting.receipt || deleting.number || deleting.subject || "this record"}"? This action cannot be undone.`}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      ) : null}

      {viewing && !onView ? (
        <Modal title="Record details" onClose={() => setViewing(null)} footer={<button className="cms-btn cms-btn-ghost" onClick={() => setViewing(null)}>Close</button>}>
          <div className="cms-kv">
            {sectionConfig.columns.map((c) => (
              <div key={c.key}>
                <span>{c.label}</span>
                {c.badge ? <StatusBadge value={viewing[c.key]} /> : <strong>{String(viewing[c.key] ?? "-")}</strong>}
              </div>
            ))}
          </div>
        </Modal>
      ) : null}
    </>
  );
}

export default function ListPage({ slug, config }) {
  const [toast, setToast] = useState("");
  const navigate = useNavigate();

  return (
    <DashboardLayout title={config.title} subtitle={config.subtitle} breadcrumb={config.breadcrumb}>
      <Section slug={slug} config={config} secondary={false} onToast={setToast} onView={slug === "students" ? (row) => navigate(`/dashboard/students/${row.id}`) : null} />
      {config.secondary ? <Section slug={slug} config={config} secondary onToast={setToast} heading={config.secondary.title} /> : null}
      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}