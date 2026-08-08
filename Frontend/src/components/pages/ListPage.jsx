import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import DataTable from "@/components/common/DataTable.jsx";
import { ConfirmDialog, Modal, Toast, StatusBadge } from "@/components/common/Ui.jsx";
import { modules } from "@/config/modules.js";
import { configFor, deleteRow, useRows } from "@/data/store.js";

function Section({ slug, secondary, onToast, heading, onView }) {
  const config = configFor(slug, secondary);
  const rows = useRows(slug, secondary);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(timer);
  }, [slug, secondary]);

  const sectionQuery = secondary ? "?section=secondary" : "";

  return (
    <>
      {heading ? <h2 style={{ fontSize: 16, margin: "22px 0 12px" }}>{heading}</h2> : null}
      <DataTable
        title={config.title}
        columns={config.columns}
        rows={rows}
        loading={loading}
        addLabel={config.addLabel}
        onAdd={() => navigate(`/dashboard/${slug}/add${sectionQuery}`)}
        onEdit={(row) => navigate(`/dashboard/${slug}/${row.id}/edit${sectionQuery}`)}
        onDelete={(row) => setDeleting(row)}
        onView={onView ? (row) => onView(row) : (row) => setViewing(row)}
      />

      {deleting ? (
        <ConfirmDialog
          message={`Delete "${deleting.name || deleting.title || deleting.receipt || deleting.number || deleting.subject || "this record"}"? This action cannot be undone.`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteRow(slug, secondary, deleting.id);
            setDeleting(null);
            onToast("Record deleted successfully");
          }}
        />
      ) : null}

      {viewing && !onView ? (
        <Modal title="Record details" onClose={() => setViewing(null)} footer={<button className="cms-btn cms-btn-ghost" onClick={() => setViewing(null)}>Close</button>}>
          <div className="cms-kv">
            {config.columns.map((c) => (
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

export default function ListPage({ slug }) {
  const config = modules[slug];
  const [toast, setToast] = useState("");
  const navigate = useNavigate();

  return (
    <DashboardLayout title={config.title} subtitle={config.subtitle} breadcrumb={config.breadcrumb}>
      <Section slug={slug} secondary={false} onToast={setToast} onView={slug === "students" ? (row) => navigate(`/dashboard/students/${row.id}`) : null} />
      {config.secondary ? <Section slug={slug} secondary onToast={setToast} heading={config.secondary.title} /> : null}
      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}


