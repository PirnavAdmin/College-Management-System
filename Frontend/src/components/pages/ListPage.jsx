import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import DataTable from "@/components/common/DataTable.jsx";
import { ConfirmDialog, Modal, Toast, StatusBadge } from "@/components/common/Ui.jsx";
import { configFor, deleteRow, setRows, useRows } from "@/data/store.js";
import { getApiErrorMessage } from "@/api/axios.js";

function Section({ slug, config, secondary, onToast, heading, onView }) {
  const sectionConfig = configFor(config, secondary);
  const rows = useRows(slug, secondary, config);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    let active = true;

    if (!sectionConfig.api?.getAll || (sectionConfig.preserveLocalRows && rows.length > 0)) {
      const timer = setTimeout(() => setLoading(false), 450);
      return () => clearTimeout(timer);
    }

    sectionConfig.api.getAll()
      .then((response) => {
        if (active) setRows(slug, secondary, sectionConfig.api.toRows(response.data));
      })
      .catch((error) => {
        if (active) onToast(getApiErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [slug, secondary, sectionConfig, onToast, rows.length]);

  const sectionQuery = secondary ? "?section=secondary" : "";

  return (
    <>
      {heading ? <h2 style={{ fontSize: 16, margin: "22px 0 12px" }}>{heading}</h2> : null}
      <DataTable
        title={sectionConfig.title}
        columns={sectionConfig.columns}
        rows={rows}
        loading={loading}
        addLabel={sectionConfig.addLabel}
        onAdd={() => navigate(`/dashboard/${slug}/add${sectionQuery}`)}
        onEdit={(row) => navigate(`/dashboard/${slug}/${row.id}/edit${sectionQuery}`)}
        onDelete={(row) => setDeleting(row)}
        onView={onView ? (row) => onView(row) : (row) => setViewing(row)}
      />

      {deleting ? (
        <ConfirmDialog
          message={`Delete "${deleting.name || deleting.title || deleting.receipt || deleting.number || deleting.subject || "this record"}"? This action cannot be undone.`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              if (sectionConfig.api?.delete) await sectionConfig.api.delete(deleting.id);
              deleteRow(slug, secondary, deleting.id, config);
              onToast("Record deleted successfully");
            } catch (error) {
              onToast(getApiErrorMessage(error));
            } finally {
              setDeleting(null);
            }
          }}
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
