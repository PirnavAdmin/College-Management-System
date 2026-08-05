import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiEdit2, FiPlus, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import api, { getApiErrorMessage } from "../../api/axios";
import { env } from "../../config/env";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import DataTable from "../../shared/components/DataTable";
import EmptyState from "../../shared/components/EmptyState";
import PageHeader from "../../shared/components/PageHeader";
import StatCard from "../../shared/components/StatCard";
import "./GroupList.css";

const STORAGE_KEY = "cms_demo_groups";
const PAGE_SIZE = 5;

const DEFAULT_GROUPS = [
  {
    groupId: 1,
    groupName: "MPC",
    groupCode: "MPC",
    board: "State Board",
    academicYearId: 2025,
    academicYearName: "2025-2026",
    academicLevel: "Intermediate First Year",
    totalSubjects: 6,
    description: "Mathematics, Physics and Chemistry group",
    isActive: true,
  },
  {
    groupId: 2,
    groupName: "BiPC",
    groupCode: "BIPC",
    board: "State Board",
    academicYearId: 2025,
    academicYearName: "2025-2026",
    academicLevel: "Intermediate First Year",
    totalSubjects: 6,
    description: "Biology, Physics and Chemistry group",
    isActive: true,
  },
  {
    groupId: 3,
    groupName: "CEC",
    groupCode: "CEC",
    board: "State Board",
    academicYearId: 2025,
    academicYearName: "2025-2026",
    academicLevel: "Intermediate Second Year",
    totalSubjects: 5,
    description: "Commerce, Economics and Civics group",
    isActive: false,
  },
];

const initialFilters = {
  search: "",
  board: "",
  academicYear: "",
  academicLevel: "",
  status: "",
};

const BOARDS = ["State Board", "CBSE", "ICSE", "Intermediate Board", "University", "Autonomous", "Technical Board"];
const ACADEMIC_YEARS = ["2022-2023", "2023-2024", "2024-2025", "2025-2026"];
const ACADEMIC_LEVELS = ["Intermediate First Year", "Intermediate Second Year", "UG", "PG", "Diploma"];

export default function GroupList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [groups, setGroups] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(location.state?.successMessage || "");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (env.enableMockAuth) {
        setGroups(readDemoGroups().map(normalizeGroup));
        return;
      }

      const response = await api.get("/api/v1/groups");
      setGroups(getGroupsFromResponse(response).map(normalizeGroup));
    } catch (fetchError) {
      setGroups(readDemoGroups().map(normalizeGroup));
      setError(`${getApiErrorMessage(fetchError)} Showing local demo groups.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups, location.key]);

  useEffect(() => {
    if (!message) return undefined;
    const timerId = window.setTimeout(() => setMessage(""), 3500);
    return () => window.clearTimeout(timerId);
  }, [message]);

  const filteredGroups = useMemo(() => {
    const search = appliedFilters.search.trim().toLowerCase();

    return groups.filter((group) => {
      if (appliedFilters.board && group.board !== appliedFilters.board) return false;
      if (appliedFilters.academicYear && group.academicYear !== appliedFilters.academicYear) return false;
      if (appliedFilters.academicLevel && group.academicLevel !== appliedFilters.academicLevel) return false;
      if (appliedFilters.status && group.status !== appliedFilters.status) return false;
      if (!search) return true;
      return `${group.groupName} ${group.groupCode}`.toLowerCase().includes(search);
    });
  }, [appliedFilters, groups]);

  const stats = useMemo(() => {
    const levels = new Set(groups.map((group) => group.academicLevel).filter(Boolean));
    return {
      total: groups.length,
      active: groups.filter((group) => group.status === "Active").length,
      inactive: groups.filter((group) => group.status === "Inactive").length,
      levels: levels.size,
    };
  }, [groups]);

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = filteredGroups.length ? (currentPage - 1) * PAGE_SIZE : 0;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredGroups.length);
  const pageRows = filteredGroups.slice(startIndex, endIndex).map((group, index) => ({
    ...group,
    serialNumber: startIndex + index + 1,
  }));

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const searchGroups = (event) => {
    event.preventDefault();
    setAppliedFilters(filters);
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setPage(1);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      setError("");

      if (env.enableMockAuth) {
        deleteDemoGroup(deleteTarget.groupId);
      } else {
        try {
          await api.delete(`/api/v1/groups/${deleteTarget.groupId}`);
        } catch (deleteError) {
          deleteDemoGroup(deleteTarget.groupId);
          setError(`${getApiErrorMessage(deleteError)} Deleted from local demo groups instead.`);
        }
      }

      setDeleteTarget(null);
      setMessage("Group deleted successfully");
      await fetchGroups();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="groupList">
      <PageHeader
        title="Group Management"
        subtitle="Manage academic groups configured for your intermediate college."
        actions={
          <>
            <Button type="button" onClick={fetchGroups}>
              <FiRefreshCw /> Refresh
            </Button>
            <Link className="btn btn-primary" to="/dashboard/groups/add">
              <FiPlus /> Add Group
            </Link>
          </>
        }
      />

      {message ? <div className="groupNotice groupNoticeSuccess">{message}</div> : null}
      {error ? <div className="notice notice-error">{error}</div> : null}

      <div className="stat-grid groupStats">
        <StatCard label="Total Groups" value={stats.total} icon="G" />
        <StatCard label="Active Groups" value={stats.active} icon="A" />
        <StatCard label="Inactive Groups" value={stats.inactive} icon="I" />
        <StatCard label="Academic Levels" value={stats.levels} icon="L" />
      </div>

      <Card padded={false}>
        <form className="groupFilterToolbar" onSubmit={searchGroups}>
          <input
            className="input"
            placeholder="Search by group name or code"
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
            type="search"
          />
          <select className="select" value={filters.board} onChange={(event) => updateFilter("board", event.target.value)}>
            <option value="">All Boards</option>
            {BOARDS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            className="select"
            value={filters.academicYear}
            onChange={(event) => updateFilter("academicYear", event.target.value)}
          >
            <option value="">All Academic Years</option>
            {ACADEMIC_YEARS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            className="select"
            value={filters.academicLevel}
            onChange={(event) => updateFilter("academicLevel", event.target.value)}
          >
            <option value="">All Academic Levels</option>
            {ACADEMIC_LEVELS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select className="select" value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <div className="groupFilterActions">
            <Button type="submit" variant="primary">
              Search
            </Button>
            <Button type="button" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </form>

        {loading ? (
          <EmptyState title="Loading groups" message="Please wait while groups are loaded." />
        ) : (
          <DataTable
            columns={[
              { key: "serialNumber", label: "S.No" },
              { key: "groupName", label: "Group Name", render: (row) => <strong>{row.groupName || "-"}</strong> },
              { key: "groupCode", label: "Group Code" },
              { key: "board", label: "Board" },
              { key: "academicYear", label: "Academic Year" },
              { key: "academicLevel", label: "Academic Level" },
              { key: "totalSubjects", label: "Total Subjects" },
              {
                key: "status",
                label: "Status",
                render: (row) => <span className={`badge ${row.status === "Active" ? "badge-success" : "badge-muted"}`}>{row.status}</span>,
              },
            ]}
            rows={pageRows}
            empty={<EmptyState title="No groups found" message="Add your first group to get started." />}
            renderActions={(row) => (
              <div className="row-actions">
                <button
                  className="icon-button"
                  type="button"
                  title="Edit"
                  onClick={() => navigate(`/dashboard/groups/edit/${row.groupId}`)}
                >
                  <FiEdit2 />
                </button>
                <button className="icon-button" type="button" title="Delete" onClick={() => setDeleteTarget(row)}>
                  <FiTrash2 />
                </button>
              </div>
            )}
          />
        )}

        <div className="groupPagination">
          <span>
            Showing {filteredGroups.length ? startIndex + 1 : 0}-{endIndex} of {filteredGroups.length}
          </span>
          <div className="groupPageButtons">
            <Button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              Prev
            </Button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <Button
                className={pageNumber === currentPage ? "groupPageActive" : ""}
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </Button>
            ))}
            <Button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {deleteTarget ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setDeleteTarget(null)}>
          <section className="card modal groupDeleteModal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2>Delete Group</h2>
            </div>
            <div className="groupDeleteBody">
              <p>
                Are you sure you want to delete <strong>{deleteTarget.groupName}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="modal-foot">
              <Button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button className="groupDangerButton" type="button" disabled={deleting} onClick={confirmDelete}>
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function getGroupsFromResponse(response) {
  const payload = response?.data ?? response;
  const candidates = [
    payload,
    payload?.data,
    payload?.items,
    payload?.data?.items,
    payload?.data?.content,
    payload?.data?.groups,
    payload?.groups,
    payload?.content,
    payload?.result,
    payload?.value,
    payload?.$values,
  ];
  return candidates.find(Array.isArray) || [];
}

function normalizeGroup(group = {}) {
  const groupId = group.groupId ?? group.id ?? group.groupID ?? group.GroupId;
  const isActive = typeof group.isActive === "boolean" ? group.isActive : String(group.status || "Active") === "Active";
  return {
    ...group,
    id: group.id ?? groupId,
    groupId,
    groupName: group.groupName ?? group.name ?? "",
    groupCode: group.groupCode ?? group.code ?? "",
    board: group.board ?? group.boardName ?? "",
    academicYearId: group.academicYearId ?? group.yearId ?? "",
    academicYear: group.academicYearName ?? group.academicYear ?? String(group.academicYearId ?? ""),
    academicYearName: group.academicYearName ?? group.academicYear ?? "",
    academicLevel: group.academicLevel ?? group.level ?? "",
    totalSubjects: group.totalSubjects ?? group.subjectCount ?? 0,
    description: group.description ?? "",
    isActive,
    status: group.status ?? (isActive ? "Active" : "Inactive"),
  };
}

function readDemoGroups() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Reset local demo groups if storage was manually edited.
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_GROUPS));
  return DEFAULT_GROUPS;
}

function writeDemoGroups(groups) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

function deleteDemoGroup(groupId) {
  writeDemoGroups(readDemoGroups().filter((group) => String(group.groupId) !== String(groupId) && String(group.id) !== String(groupId)));
}
