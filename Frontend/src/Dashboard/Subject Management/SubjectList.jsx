import { useEffect, useMemo, useState } from "react";
import { getSubjects } from "../../api/authApi";
import { Link, useNavigate } from "react-router-dom";
import {
  FiBookOpen,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiEye,
  FiGrid,
  FiLayers,
  FiMenu,
  FiPlus,
  FiRotateCcw,
  FiSearch,
  FiSettings,
  FiTrash2,
  FiUsers,
  FiX,
  FiBell,
} from "react-icons/fi";


import "./SubjectManagement.css";

const BOARDS = ["State Board", "CBSE", "ICSE"];
const GROUPS = ["MPC", "BiPC", "CEC", "MEC", "HEC"];
const ACADEMIC_LEVELS = ["First Year", "Second Year"];
const SUBJECT_TYPES = ["Theory", "Practical", "Language", "Elective"];




const INITIAL_FILTERS = {
  search: "",
  board: "",
  group: "",
  level: "",
  type: "",
};

export default function SubjectList() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [subjects, setSubjects] = useState([]);

  /*useEffect(() => {
  async function fetchSubjects() {
    try {
      const response = await getSubjects();
      console.log(response.data);
      setSubjects(response.data);
    } catch (error) {
      console.error("Error loading subjects:", error);
    }
  }

  fetchSubjects();
}, []);*/
useEffect(() => {
  async function fetchSubjects() {
    try {
      console.log("Calling GET /api/Subjects...");

      const response = await getSubjects();

      console.log("API Success");
      console.log("Full Response:", response);
      console.log("Response Data:", response.data);

      setSubjects(response.data);

      console.log("Subjects State:", response.data);
    } catch (error) {
      console.log("API Failed");

      console.error("Error Object:", error);

      if (error.response) {
        console.log("Status:", error.response.status);
        console.log("Response:", error.response.data);
      } else if (error.request) {
        console.log("Request was sent but no response received.");
      } else {
        console.log("Error Message:", error.message);
      }
    }
  }

  fetchSubjects();
}, []);


  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setPage(1);
  };

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return subjects.filter((subject) => {
      const matchesTerm =
        term === "" ||
        subject.subjectName.toLowerCase().includes(term) ||
        subject.subjectCode.toLowerCase().includes(term)
      return (
  matchesTerm &&
  (filters.board === "" || subject.board === filters.board) &&
  (filters.group === "" || subject.group === filters.group) &&
  (filters.level === "" ||
    subject.academicLevel === filters.level) &&
  (filters.type === "" ||
    subject.subjectType === filters.type)
);
    });
  }, [filters, subjects]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const rows = filtered.slice(startIndex, startIndex + rowsPerPage);

  const goToAddSubject = () => {
  navigate("/subjects/add");
};

  return (
    <div className="sm-root">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="sm-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      {/* Sidebar */}
      <aside className={sidebarOpen ? "sm-sidebar is-open" : "sm-sidebar"}>
        <div className="sm-brand">
          <span className="sm-brand-mark">
            <FiLayers size={18} />
          </span>
          CMS
        </div>
        <nav className="sm-nav">
          <Link to="/subjects" className="sm-nav-item">
            <FiGrid size={16} /> Dashboard
          </Link>
        
          <Link to="/subjects" className="sm-nav-item is-active">
            <FiBookOpen size={16} /> Subject Management
          </Link>
          <Link to="/subjects/add" className="sm-nav-item">
            <FiPlus size={16} /> Add Subject
          </Link>
          <span className="sm-nav-label">Administration</span>
          <Link to="/subjects" className="sm-nav-item">
            <FiUsers size={16} /> Students
          </Link>
          <Link to="/subjects" className="sm-nav-item">
            <FiSettings size={16} /> Settings
          </Link>
        </nav>
      </aside>

      <div className="sm-main">
        {/* Navbar */}
        <header className="sm-navbar">
          <button
            type="button"
            className="sm-icon-btn sm-menu-btn"
            aria-label="Toggle menu"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? <FiX size={18} /> : <FiMenu size={18} />}
          </button>
          <div className="sm-navbar-search">
            <FiSearch size={16} />
            <input type="search" placeholder="Search anything..." aria-label="Global search" />
          </div>
          <div className="sm-spacer" />
          <button type="button" className="sm-icon-btn" aria-label="Notifications">
            <FiBell size={18} />
          </button>
          <div className="sm-avatar">
            <span>AD</span>
            <small>
              Admin User
              <br />
              Administrator
            </small>
          </div>
        </header>

        <main className="sm-content">
          {/* Breadcrumb */}
          <nav className="sm-breadcrumb" aria-label="Breadcrumb">
            <Link to="/subjects">Dashboard</Link>
            <span>/</span>
            <Link to="/subjects">Subject Management</Link>
            <span>/</span>
            <span className="is-current">Subject List</span>
          </nav>

          {/* Header */}
          <div className="sm-header">
            <div>
              <h1>Subject List</h1>
              <p>Manage all subjects configured for your intermediate college.</p>
            </div>
            <div className="sm-actions">
              <button type="button" className="sm-btn sm-btn-outline" onClick={resetFilters}>
                <FiRotateCcw size={16} /> Reset Filters
              </button>
              <button 
  type="button" 
  className="sm-btn sm-btn-primary" 
  onClick={goToAddSubject}
>
  <FiPlus size={16} /> Add New Subject
</button>
            </div>
          </div>

          {/* Stats */}
          <div className="sm-stats">
            <div className="sm-card sm-stat">
              <span className="sm-stat-icon">
                <FiBookOpen size={18} />
              </span>
              <div>
                <b>{subjects.length}</b>
                <span>Total Subjects</span>
              </div>
            </div>
            
            <div className="sm-card sm-stat">
              <span className="sm-stat-icon">
                <FiGrid size={18} />
              </span>
              <div>
                <b>{GROUPS.length}</b>
                <span>Groups</span>
              </div>
            </div>
            <div className="sm-card sm-stat">
              <span className="sm-stat-icon">
                <FiUsers size={18} />
              </span>
              <div>
                <b>{BOARDS.length}</b>
                <span>Boards</span>
              </div>
            </div>
          </div>

          {/* Search + Filters */}
          <section className="sm-card sm-card-pad">
            <div className="sm-search" style={{ marginBottom: 12 }}>
              <FiSearch size={16} />
              <input
                type="search"
                placeholder="Search Subject..."
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                aria-label="Search Subject"
              />
            </div>
            <div className="sm-filter-grid">
              <div className="sm-field">
                <label htmlFor="filter-board">Board</label>
                <select
                  id="filter-board"
                  className="sm-select"
                  value={filters.board}
                  onChange={(event) => updateFilter("board", event.target.value)}
                >
                  <option value="">All Boards</option>
                  {BOARDS.map((board) => (
                    <option key={board} value={board}>
                      {board}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm-field">
                <label htmlFor="filter-group">Group</label>
                <select
                  id="filter-group"
                  className="sm-select"
                  value={filters.group}
                  onChange={(event) => updateFilter("group", event.target.value)}
                >
                  <option value="">All Groups</option>
                  {GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm-field">
                <label htmlFor="filter-level">Academic Level</label>
                <select
                  id="filter-level"
                  className="sm-select"
                  value={filters.level}
                  onChange={(event) => updateFilter("level", event.target.value)}
                >
                  <option value="">All Levels</option>
                  {ACADEMIC_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm-field">
                <label htmlFor="filter-type">Subject Type</label>
                <select
                  id="filter-type"
                  className="sm-select"
                  value={filters.type}
                  onChange={(event) => updateFilter("type", event.target.value)}
                >
                  <option value="">All Types</option>
                  {SUBJECT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              
            </div>
          </section>

          {/* Table */}
          <section className="sm-card">
            {rows.length === 0 ? (
              <div className="sm-empty">
                <div className="sm-empty-art">
                  <FiBookOpen size={38} />
                </div>
                <h3>No Subjects Found</h3>
                <p>Try adjusting your filters, or create a new subject to get started.</p>
                <button type="button" className="sm-btn sm-btn-primary" onClick={goToAddSubject}>
                  <FiPlus size={16} /> Add New Subject
                </button>
              </div>
            ) : (
              <>
                <div className="sm-table-wrap">
                  <table className="sm-table">
                    <thead>
                      <tr>
                        <th>Subject Name</th>
                        <th>Subject Code</th>
                        <th>Board</th>
                        <th>Group</th>
                        <th>Academic Level</th>
                        <th>Subject Type</th>
                        <th>Maximum Marks</th>
                        <th>Passing Marks</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((subject) => (
                        <tr key={subject.id}>
                          

                          <td className="sm-strong">{subject.subjectName}</td>

                          <td>
  <span className="sm-code">
    {subject.subjectCode}
  </span>
</td>
                          <td>{subject.board}</td>
                          <td>{subject.group}</td>
                         <td>{subject.academicLevel}</td>
                          <td>
  <span className="sm-badge sm-badge-blue">
    {subject.subjectType}
  </span>
</td>
                         <td>{subject.totalMarks}</td>
                          <td>{subject.passingMarks}</td>
                          <td>
                            <div className="sm-row-actions">
                              <button
                                type="button"
                                className="sm-act view"
                                aria-label={`View ${subject.name}`}
                              >
                                <FiEye size={15} />
                              </button>
                              <button
                                type="button"
                                className="sm-act edit"
                                aria-label={`Edit ${subject.name}`}
                              >
                                <FiEdit2 size={15} />
                              </button>
                              <button
                                type="button"
                                className="sm-act delete"
                                aria-label={`Delete ${subject.name}`}
                              >
                                <FiTrash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="sm-pagination">
                  <div className="sm-rows">
                    <label htmlFor="rows-per-page">Rows per page</label>
                    <select
                      id="rows-per-page"
                      value={rowsPerPage}
                      onChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(1);
                      }}
                    >
                      {[5, 10, 25, 50].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    <span>
                      Showing {startIndex + 1}-{Math.min(startIndex + rowsPerPage, filtered.length)}{" "}
                      of {filtered.length}
                    </span>
                  </div>
                  <div className="sm-pages">
                    <button
                      type="button"
                      className="sm-page"
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                      disabled={currentPage === 1}
                    >
                      <FiChevronLeft size={14} /> Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
                      <button
                        key={number}
                        type="button"
                        className={number === currentPage ? "sm-page is-active" : "sm-page"}
                        onClick={() => setPage(number)}
                      >
                        {number}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="sm-page"
                      onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next <FiChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}