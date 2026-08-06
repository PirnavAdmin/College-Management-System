import {
  FiUser,
  FiBookOpen,
  FiCalendar,
  FiUsers,
  FiAward,
  FiTrendingUp,
  FiDollarSign,
  FiPhone,
  FiMail,
  FiHome,
  FiClipboard,
  FiDownload,
  FiPrinter,
  FiEdit,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowLeft,
  FiEye,
  FiFileText,
  FiPercent,
  FiSearch,
} from "react-icons/fi";
import "./StudentProfile.css";

const student = {
  photo: "",
  name: "Sai Charan Reddy",
  studentId: "STU-2026-0148",
  admissionNo: "ADM/2026/0148",
  rollNo: "26-MPC-A-14",
  status: "Active",
  gender: "Male",
  dob: "12 March 2009",
  bloodGroup: "O+",
  aadhaar: "XXXX XXXX 4821",
  mobile: "+91 98490 11223",
  email: "saicharan.reddy@collegemail.in",
  address: "12-4-89, Ashok Nagar, Vijayawada, Andhra Pradesh - 520007",
  parentMobile: "+91 98661 55420",
};

const academic = {
  board: "BIEAP",
  academicYear: "2025 - 2026",
  level: "Intermediate First Year",
  group: "MPC",
  section: "Section A",
  admissionDate: "05 June 2025",
  admissionType: "Regular",
  medium: "English",
  previousSchool: "Sri Vidya High School, Vijayawada",
  previousHallTicket: "1234567890",
  category: "BC",
  scholarship: "Approved",
};

const father = [
  { label: "Father Name", value: "Ramesh Reddy" },
  { label: "Occupation", value: "Agriculturist" },
  { label: "Mobile Number", value: "+91 98661 55420" },
  { label: "Aadhaar Number", value: "XXXX XXXX 7712" },
];

const mother = [
  { label: "Mother Name", value: "Lakshmi Devi" },
  { label: "Occupation", value: "Homemaker" },
  { label: "Mobile Number", value: "+91 90000 33218" },
  { label: "Aadhaar Number", value: "XXXX XXXX 3390" },
];

const guardian = [
  { label: "Guardian Name", value: "Venkat Rao" },
  { label: "Relationship", value: "Uncle (Paternal)" },
  { label: "Mobile Number", value: "+91 93910 77451" },
  { label: "Address", value: "8-2-14, Gandhi Nagar, Vijayawada - 520003" },
];

const fee = {
  total: 48000,
  paid: 36000,
  pending: 12000,
  scholarship: 6000,
  discount: 2000,
  lastPayment: "18 July 2026",
  dueDate: "20 August 2026",
};

const attendance = {
  percent: 92,
  workingDays: 168,
  present: 155,
  absent: 9,
  leave: 4,
  late: 6,
};

const performance = {
  internal: "23 / 25",
  practical: "28 / 30",
  midAverage: "86.4%",
  overall: "88.2%",
  rank: "4 of 96",
  remarks: "Consistent performer in Mathematics and Physics.",
};

const stats = [
  { label: "Subjects", value: "6", icon: <FiBookOpen size={20} /> },
  { label: "Attendance", value: "92%", icon: <FiCalendar size={20} /> },
  { label: "Assignments", value: "24", icon: <FiClipboard size={20} /> },
  { label: "Exams", value: "8", icon: <FiAward size={20} /> },
  { label: "Practicals", value: "12", icon: <FiTrendingUp size={20} /> },
  { label: "Overall %", value: "88.2%", icon: <FiPercent size={20} /> },
  { label: "Fee Paid", value: "75%", icon: <FiDollarSign size={20} /> },
  { label: "Parent Contacts", value: "3", icon: <FiPhone size={20} /> },
];

const activities = [
  {
    title: "Admission Completed",
    desc: "Intermediate First Year admission confirmed under MPC group.",
    date: "05 June 2025",
    icon: <FiCheckCircle size={18} />,
  },
  {
    title: "Fee Paid",
    desc: "Second instalment of Rs. 18,000 received via UPI.",
    date: "18 July 2026",
    icon: <FiDollarSign size={18} />,
  },
  {
    title: "Attendance Updated",
    desc: "Monthly attendance register verified by class in-charge.",
    date: "31 July 2026",
    icon: <FiCalendar size={18} />,
  },
  {
    title: "Internal Marks Uploaded",
    desc: "Mid Exam II internal marks published for all six subjects.",
    date: "28 July 2026",
    icon: <FiClipboard size={18} />,
  },
  {
    title: "Parent Meeting",
    desc: "Progress review attended by father, Ramesh Reddy.",
    date: "12 July 2026",
    icon: <FiUsers size={18} />,
  },
  {
    title: "Hall Ticket Generated",
    desc: "Hall ticket issued for Intermediate Public Examination.",
    date: "02 July 2026",
    icon: <FiAward size={18} />,
  },
  {
    title: "Profile Updated",
    desc: "Contact number and residential address updated by admin.",
    date: "24 June 2026",
    icon: <FiEdit size={18} />,
  },
];

const documents = [
  "SSC Memo",
  "Transfer Certificate (TC)",
  "Study Certificate",
  "Aadhaar Card",
  "Caste Certificate",
  "Income Certificate",
  "Bonafide Certificate",
];

const inr = (n) => "Rs. " + n.toLocaleString("en-IN");

function Info({ label, value, wide }) {
  return (
    <div className={wide ? "sp-span-2" : undefined}>
      <span className="sp-info-label">{label}</span>
      <div className="sp-info-value">{value}</div>
    </div>
  );
}

function attendanceTone(p) {
  if (p >= 90) return "green";
  if (p >= 75) return "orange";
  return "red";
}

export default function StudentProfile() {
  const feePercent = Math.round((fee.paid / fee.total) * 100);
  const feeStatus = fee.pending === 0 ? "Paid" : fee.paid > 0 ? "Partial" : "Pending";
  const feeBadge =
    feeStatus === "Paid" ? "sp-badge-green" : feeStatus === "Partial" ? "sp-badge-orange" : "sp-badge-red";
  const tone = attendanceTone(attendance.percent);
  const ringColor = tone === "green" ? "#15803d" : tone === "orange" ? "#b45309" : "#b91c1c";

  return (
    <div className="sp-root">
      <header className="sp-header">
        <div>
          <h1 className="sp-title">Student Profile</h1>
          <p className="sp-subtitle">View complete student academic information.</p>
        </div>
        <div className="sp-header-actions">
          <div className="sp-search-group">
            <input
              type="search"
              className="sp-search-input"
              placeholder="Search by admission number or name"
            />
            <button type="button" className="sp-btn sp-btn-primary">
              <FiSearch size={16} /> Search
            </button>
          </div>
          <button type="button" className="sp-btn sp-btn-primary">
            <FiEdit size={16} /> Edit Profile
          </button>
          <button type="button" className="sp-btn">
            <FiPrinter size={16} /> Print
          </button>
          <button type="button" className="sp-btn">
            <FiDownload size={16} /> Download PDF
          </button>
        </div>
      </header>

      {/* Profile */}
      <section className="sp-card">
        <div className="sp-profile">
          <div className="sp-profile-left">
            <div className="sp-avatar">
              {student.photo ? (
                <img src={student.photo} alt={student.name} />
              ) : (
                <FiUser size={58} />
              )}
            </div>
            <h2 className="sp-profile-name">{student.name}</h2>
            <p className="sp-profile-meta">{student.studentId}</p>
            <p className="sp-profile-meta">Admission: {student.admissionNo}</p>
            <p className="sp-profile-meta">Roll No: {student.rollNo}</p>
            <span className="sp-badge sp-badge-green">
              <FiCheckCircle size={14} /> {student.status}
            </span>
          </div>

          <div className="sp-info-grid">
            <Info label="Student ID" value={student.studentId} />
            <Info label="Admission No" value={student.admissionNo} />
            <Info label="Roll No" value={student.rollNo} />
            <Info label="Student Name" value={student.name} />
            <Info label="Gender" value={student.gender} />
            <Info label="Date of Birth" value={student.dob} />
            <Info label="Blood Group" value={student.bloodGroup} />
            <Info label="Aadhaar Number" value={student.aadhaar} />
            <Info label="Mobile Number" value={student.mobile} />
            <Info label="Email" value={student.email} wide />
            <Info label="Parent Mobile Number" value={student.parentMobile} />
            <Info label="Address" value={student.address} wide />
          </div>
        </div>
      </section>

      {/* Academic */}
      <section className="sp-card">
        <div className="sp-card-head">
          <FiBookOpen size={19} />
          <h3 className="sp-card-title">Academic Information</h3>
        </div>
        <div className="sp-info-grid sp-cols-4">
          <Info label="Board" value={academic.board} />
          <Info label="Academic Year" value={academic.academicYear} />
          <Info label="Academic Level" value={academic.level} />
          <Info label="Group" value={academic.group} />
          <Info label="Section" value={academic.section} />
          <Info label="Admission Date" value={academic.admissionDate} />
          <Info label="Admission Type" value={academic.admissionType} />
          <Info label="Medium" value={academic.medium} />
          <Info label="Previous School" value={academic.previousSchool} wide />
          <Info label="Previous Hall Ticket Number" value={academic.previousHallTicket} />
          <Info label="Student Category" value={academic.category} />
          <div>
            <span className="sp-info-label">Scholarship Status</span>
            <div>
              <span className="sp-badge sp-badge-green">
                <FiAward size={14} /> {academic.scholarship}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Parents */}
      <section className="sp-card">
        <div className="sp-card-head">
          <FiUsers size={19} />
          <h3 className="sp-card-title">Parent &amp; Guardian Details</h3>
        </div>
        <div className="sp-parent-grid">
          <div className="sp-parent-block">
            <h4>
              <FiUser size={16} /> Father Details
            </h4>
            <div className="sp-stack">
              {father.map((f) => (
                <Info key={f.label} label={f.label} value={f.value} />
              ))}
            </div>
          </div>
          <div className="sp-parent-block">
            <h4>
              <FiUser size={16} /> Mother Details
            </h4>
            <div className="sp-stack">
              {mother.map((f) => (
                <Info key={f.label} label={f.label} value={f.value} />
              ))}
            </div>
          </div>
          <div className="sp-parent-block">
            <h4>
              <FiHome size={16} /> Guardian Details
            </h4>
            <div className="sp-stack">
              {guardian.map((f) => (
                <Info key={f.label} label={f.label} value={f.value} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Fees */}
      <section className="sp-card">
        <div className="sp-card-head">
          <FiDollarSign size={19} />
          <h3 className="sp-card-title">Fee Details</h3>
        </div>
        <div className="sp-tiles">
          <div className="sp-tile">
            <div className="sp-tile-label">Total Fee</div>
            <div className="sp-tile-value">{inr(fee.total)}</div>
          </div>
          <div className="sp-tile">
            <div className="sp-tile-label">Paid Fee</div>
            <div className="sp-tile-value sp-green">{inr(fee.paid)}</div>
          </div>
          <div className="sp-tile">
            <div className="sp-tile-label">Pending Fee</div>
            <div className="sp-tile-value sp-red">{inr(fee.pending)}</div>
          </div>
          <div className="sp-tile">
            <div className="sp-tile-label">Scholarship</div>
            <div className="sp-tile-value sp-blue">{inr(fee.scholarship)}</div>
          </div>
          <div className="sp-tile">
            <div className="sp-tile-label">Discount</div>
            <div className="sp-tile-value">{inr(fee.discount)}</div>
          </div>
          <div className="sp-tile">
            <div className="sp-tile-label">Last Payment Date</div>
            <div className="sp-tile-value" style={undefined}>
              <span className="sp-info-value">{fee.lastPayment}</span>
            </div>
          </div>
          <div className="sp-tile">
            <div className="sp-tile-label">Due Date</div>
            <div className="sp-tile-value">
              <span className="sp-info-value">{fee.dueDate}</span>
            </div>
          </div>
          <div className="sp-tile">
            <div className="sp-tile-label">Payment Status</div>
            <div className="sp-tile-value">
              <span className={"sp-badge " + feeBadge}>
                {feeStatus === "Paid" ? <FiCheckCircle size={14} /> : <FiAlertCircle size={14} />}
                {feeStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="sp-progress-row">
          <span>Payment Progress</span>
          <span>{feePercent}% collected</span>
        </div>
        <div className="sp-progress">
          <div className="sp-progress-bar" style={{ width: feePercent + "%" }} />
        </div>
      </section>

      {/* Attendance */}
      <section className="sp-card">
        <div className="sp-card-head">
          <FiCalendar size={19} />
          <h3 className="sp-card-title">Attendance</h3>
        </div>
        <div className="sp-attendance">
          <div
            className="sp-ring"
            style={{
              background: `conic-gradient(${ringColor} ${attendance.percent * 3.6}deg, #eef1f7 0deg)`,
            }}
          >
            <div className="sp-ring-inner">
              <div>
                <div className="sp-ring-value">{attendance.percent}%</div>
                <div className="sp-ring-label">Overall</div>
              </div>
            </div>
          </div>

          <div>
            <div className="sp-tiles">
              <div className="sp-tile">
                <div className="sp-tile-label">Working Days</div>
                <div className="sp-tile-value">{attendance.workingDays}</div>
              </div>
              <div className="sp-tile">
                <div className="sp-tile-label">Present Days</div>
                <div className="sp-tile-value sp-green">{attendance.present}</div>
              </div>
              <div className="sp-tile">
                <div className="sp-tile-label">Absent Days</div>
                <div className="sp-tile-value sp-red">{attendance.absent}</div>
              </div>
              <div className="sp-tile">
                <div className="sp-tile-label">Leave Days</div>
                <div className="sp-tile-value sp-orange">{attendance.leave}</div>
              </div>
              <div className="sp-tile">
                <div className="sp-tile-label">Late Entries</div>
                <div className="sp-tile-value sp-orange">{attendance.late}</div>
              </div>
            </div>

            <div className="sp-progress-row">
              <span>Attendance Progress</span>
              <span>{attendance.percent}%</span>
            </div>
            <div className="sp-progress">
              <div
                className={"sp-progress-bar sp-bar-" + tone}
                style={{ width: attendance.percent + "%" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Performance */}
      <section className="sp-card">
        <div className="sp-card-head">
          <FiTrendingUp size={19} />
          <h3 className="sp-card-title">Academic Performance</h3>
        </div>
        <div className="sp-info-grid sp-cols-4">
          <Info label="Internal Marks" value={performance.internal} />
          <Info label="Practical Marks" value={performance.practical} />
          <Info label="Mid Exam Average" value={performance.midAverage} />
          <Info label="Overall Percentage" value={performance.overall} />
          <Info label="Rank" value={performance.rank} />
          <Info label="Remarks" value={performance.remarks} wide />
          <div>
            <span className="sp-info-label">Performance</span>
            <div>
              <span className="sp-badge sp-badge-green">
                <FiAward size={14} /> Excellent
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="sp-card">
        <div className="sp-card-head">
          <FiClipboard size={19} />
          <h3 className="sp-card-title">Quick Statistics</h3>
        </div>
        <div className="sp-stats">
          {stats.map((s) => (
            <div className="sp-stat" key={s.label}>
              <div className="sp-stat-icon">{s.icon}</div>
              <div>
                <div className="sp-stat-label">{s.label}</div>
                <div className="sp-stat-value">{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="sp-card">
        <div className="sp-card-head">
          <FiClock size={19} />
          <h3 className="sp-card-title">Recent Activities</h3>
        </div>
        <div className="sp-timeline">
          {activities.map((a) => (
            <div className="sp-timeline-item" key={a.title}>
              <div className="sp-timeline-icon">{a.icon}</div>
              <div>
                <div className="sp-timeline-title">{a.title}</div>
                <div className="sp-timeline-desc">{a.desc}</div>
                <div className="sp-timeline-date">
                  <FiCalendar size={13} /> {a.date}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Documents */}
      <section className="sp-card">
        <div className="sp-card-head">
          <FiFileText size={19} />
          <h3 className="sp-card-title">Documents</h3>
        </div>
        <div className="sp-docs">
          {documents.map((d) => (
            <div className="sp-doc" key={d}>
              <div className="sp-doc-top">
                <FiFileText size={20} />
                <span className="sp-doc-name">{d}</span>
              </div>
              <div className="sp-doc-actions">
                <button type="button" className="sp-btn">
                  <FiEye size={15} /> View
                </button>
                <button type="button" className="sp-btn">
                  <FiDownload size={15} /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact quick row */}
      <section className="sp-card">
        <div className="sp-card-head">
          <FiMail size={19} />
          <h3 className="sp-card-title">Contact Summary</h3>
        </div>
        <div className="sp-info-grid">
          <Info label="Student Mobile" value={student.mobile} />
          <Info label="Parent Mobile" value={student.parentMobile} />
          <Info label="Email" value={student.email} />
        </div>
      </section>

      <div className="sp-footer-actions">
        <button type="button" className="sp-btn sp-btn-ghost">
          <FiArrowLeft size={16} /> Back
        </button>
      </div>
    </div>
  );
}
