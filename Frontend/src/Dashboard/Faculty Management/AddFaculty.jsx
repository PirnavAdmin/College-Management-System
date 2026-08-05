import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiSave } from "react-icons/fi";
import api, { getApiErrorMessage } from "../../api/axios";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import FormField from "../../shared/components/FormField";
import PageHeader from "../../shared/components/PageHeader";
import { asArray } from "../../shared/utils/responseHelpers";
import "./AddFaculty.css";

const fallbackDepartments = ["Computer Science", "Mathematics", "Physics", "Chemistry", "English", "Commerce"].map((name, index) => ({ id: index + 1, name }));
const initialForm = {
  employeeId: "",
  firstName: "",
  lastName: "",
  gender: "",
  dob: "",
  aadhaar: "",
  mobile: "",
  email: "",
  bloodGroup: "",
  qualification: "",
  designation: "",
  departmentId: "",
  department: "",
  joiningDate: "",
  experience: "",
  username: "",
  password: "",
};

export default function AddFaculty() {
  const { facultyId } = useParams();
  const navigate = useNavigate();
  const editMode = Boolean(facultyId);
  const [form, setForm] = useState(initialForm);
  const [departments, setDepartments] = useState(fallbackDepartments);
  const [loading, setLoading] = useState(editMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchDepartments = async (signal) => {
    try {
      const response = await api.get("/api/v1/departments", { signal, params: { "api-version": "1.0" } });
      const apiDepartments = asArray(response.data).map((item) => ({ id: item.id ?? item.departmentId, name: item.name ?? item.departmentName })).filter((item) => item.id && item.name);
      if (apiDepartments.length) setDepartments(apiDepartments);
    } catch {
      setDepartments(fallbackDepartments);
    }
  };

  const fetchFacultyById = useCallback(async (signal) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/faculty/${facultyId}`, { signal, params: { "api-version": "1.0" } });
      const faculty = response.data?.data || response.data;
      setForm({ ...initialForm, ...faculty, dob: faculty.dateOfBirth?.slice(0, 10) || "", joiningDate: faculty.joiningDate?.slice(0, 10) || "", aadhaar: faculty.aadhaar || faculty.aadhar || "" });
    } catch (fetchError) {
      if (fetchError.name !== "CanceledError") setError(getApiErrorMessage(fetchError));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [facultyId]);

  const saveFaculty = async (payload) => {
    const config = { params: { "api-version": "1.0" } };
    if (editMode) return api.put(`/api/v1/faculty/${facultyId}`, payload, config);
    return api.post("/api/v1/faculty", payload, config);
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchDepartments(controller.signal);
    if (editMode) fetchFacultyById(controller.signal);
    return () => controller.abort();
  }, [editMode, facultyId, fetchFacultyById]);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!form.firstName || !form.lastName || !form.mobile || !form.email || !form.departmentId) {
      setError("First name, last name, mobile, email, and department are required.");
      return;
    }
    const payload = {
      ...form,
      dateOfBirth: form.dob ? `${form.dob}T00:00:00.000Z` : null,
      joiningDate: form.joiningDate ? `${form.joiningDate}T00:00:00.000Z` : null,
      departmentId: Number(form.departmentId),
      experience: Number(form.experience || 0),
    };
    try {
      setSubmitting(true);
      setError("");
      await saveFaculty(payload);
      navigate("/dashboard/faculty");
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="addFaculty">
      <PageHeader title={editMode ? "Edit Faculty" : "Add Faculty"} subtitle="Create or update employee identity, contact, department, and login details." actions={<Link className="btn btn-secondary" to="/dashboard/faculty">Cancel</Link>} />
      <Card>
        {loading ? <p>Loading faculty details...</p> : null}
        {error ? <div className="notice notice-error">{error}</div> : null}
        <form className="addFacultyForm" onSubmit={handleSubmit}>
          <div className="form-grid">
            <FormField label="Employee ID"><input className="input" value={form.employeeId} onChange={(event) => setField("employeeId", event.target.value)} /></FormField>
            <FormField label="First Name"><input className="input" value={form.firstName} onChange={(event) => setField("firstName", event.target.value)} /></FormField>
            <FormField label="Last Name"><input className="input" value={form.lastName} onChange={(event) => setField("lastName", event.target.value)} /></FormField>
            <FormField label="Gender"><select className="select" value={form.gender} onChange={(event) => setField("gender", event.target.value)}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></FormField>
            <FormField label="DOB"><input className="input" type="date" value={form.dob} onChange={(event) => setField("dob", event.target.value)} /></FormField>
            <FormField label="Aadhaar"><input className="input" value={form.aadhaar} onChange={(event) => setField("aadhaar", event.target.value)} /></FormField>
            <FormField label="Mobile"><input className="input" value={form.mobile} onChange={(event) => setField("mobile", event.target.value)} /></FormField>
            <FormField label="Email"><input className="input" type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} /></FormField>
            <FormField label="Blood Group"><input className="input" value={form.bloodGroup} onChange={(event) => setField("bloodGroup", event.target.value)} /></FormField>
            <FormField label="Qualification"><input className="input" value={form.qualification} onChange={(event) => setField("qualification", event.target.value)} /></FormField>
            <FormField label="Designation"><input className="input" value={form.designation} onChange={(event) => setField("designation", event.target.value)} /></FormField>
            <FormField label="Department"><select className="select" value={form.departmentId} onChange={(event) => { const selected = departments.find((item) => String(item.id) === event.target.value); setForm((current) => ({ ...current, departmentId: event.target.value, department: selected?.name || "" })); }}><option value="">Select Department</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FormField>
            <FormField label="Joining Date"><input className="input" type="date" value={form.joiningDate} onChange={(event) => setField("joiningDate", event.target.value)} /></FormField>
            <FormField label="Experience"><input className="input" type="number" value={form.experience} onChange={(event) => setField("experience", event.target.value)} /></FormField>
            <FormField label="Username"><input className="input" value={form.username} onChange={(event) => setField("username", event.target.value)} /></FormField>
            <FormField label="Password"><input className="input" type="password" value={form.password} onChange={(event) => setField("password", event.target.value)} /></FormField>
          </div>
          <div className="page-actions"><Button variant="primary" disabled={submitting}><FiSave /> {submitting ? "Saving..." : editMode ? "Update Faculty" : "Add Faculty"}</Button></div>
        </form>
      </Card>
    </section>
  );
}
