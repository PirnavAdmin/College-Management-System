import PagePlaceholder from "../../shared/components/PagePlaceholder";
import "./PublishResults.css";
import { useMemo, useState } from "react";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import PageHeader from "../../shared/components/PageHeader";
import { FaEdit, FaTrash, FaEye } from "react-icons/fa";

const initialResults = [
  {
  id: 1,
  student: "Rahul Kumar",
  rollNo: "INT001",

  group: "MPC",
  academicLevel: "Intermediate 1st Year",

  subject: "Mathematics",
  marks: 80,
  internal: 0,
  practical: 0,
  external: 0,
},
  {
    id: 2,
    student: "Priya Sharma",
    rollNo: "INT002",
     group: "MPC",
     academicLevel: "Intermediate 1st Year",
    subject: "Physics",
    marks: 85,
    internal: 19,
    practical: 18,
    external: 48,
  },
  {
    id: 3,
    student: "Arjun Reddy",
    rollNo: "INT003",
     group: "MPC",
  academicLevel: "Intermediate 1st Year",
    subject: "Chemistry",
    marks: 85,
    internal: 17,
    practical: 19,
    external: 45,
  },
  {
    id: 4,
    student: "Sneha Patel",
    rollNo: "INT004",
     group: "BIPC",
  academicLevel: "Intermediate 1st Year",
    subject: "English",
    internal: 20,
    practical: 0,
    external: 68,
  },
];

const calculateGrade = (total) => {
  if (total >= 91) return "A+";
  if (total >= 81) return "A";
  if (total >= 71) return "B";
  if (total >= 61) return "C";
  if (total >= 50) return "D";
  return "F";
};

const SUBJECTS = {
  MPC: {
    "Intermediate 1st Year": [
      { name: "English", practical: false },
      { name: "Second Language (Telugu/Sanskrit/Hindi/Urdu)", practical: false },
      { name: "Mathematics 1A", practical: false },
      { name: "Mathematics 1B", practical: false },
      { name: "Physics", practical: true },
      { name: "Chemistry", practical: true },
    ],

    "Intermediate 2nd Year": [
      { name: "English", practical: false },
      { name: "Second Language (Telugu/Sanskrit/Hindi/Urdu)", practical: false },
      { name: "Mathematics 2A", practical: false },
      { name: "Mathematics 2B", practical: false },
      { name: "Physics", practical: true },
      { name: "Chemistry", practical: true },
    ],
  },

  BiPC: {
    "Intermediate 1st Year": [
      { name: "English", practical: false },
      { name: "Second Language (Telugu/Sanskrit/Hindi/Urdu)", practical: false },
      { name: "Botany", practical: true },
      { name: "Zoology", practical: true },
      { name: "Physics", practical: true },
      { name: "Chemistry", practical: true },
    ],

    "Intermediate 2nd Year": [
      { name: "English", practical: false },
      { name: "Second Language (Telugu/Sanskrit/Hindi/Urdu)", practical: false },
      { name: "Botany", practical: true },
      { name: "Zoology", practical: true },
      { name: "Physics", practical: true },
      { name: "Chemistry", practical: true },
    ],
  },

  MEC: {
    "Intermediate 1st Year": [
      { name: "English", practical: false },
      { name: "Second Language (Telugu/Sanskrit/Hindi/Urdu)", practical: false },
      { name: "Mathematics 1A", practical: false },
      { name: "Mathematics 1B", practical: false },
      { name: "Economics I", practical: false },
      { name: "Commerce I", practical: false },
    ],

    "Intermediate 2nd Year": [
      { name: "English", practical: false },
      { name: "Second Language (Telugu/Sanskrit/Hindi/Urdu)", practical: false },
      { name: "Mathematics 2A", practical: false },
      { name: "Mathematics 2B", practical: false },
      { name: "Economics II", practical: false },
      { name: "Commerce II", practical: false },
    ],
  },

  CEC: {
    "Intermediate 1st Year": [
      { name: "English", practical: false },
      { name: "Second Language (Telugu/Sanskrit/Hindi/Urdu)", practical: false },
      { name: "Civics I", practical: false },
      { name: "Economics I", practical: false },
      { name: "Commerce I", practical: false },
    ],

    "Intermediate 2nd Year": [
      { name: "English", practical: false },
      { name: "Second Language (Telugu/Sanskrit/Hindi/Urdu)", practical: false },
      { name: "Civics II", practical: false },
      { name: "Economics II", practical: false },
      { name: "Commerce II", practical: false },
    ],
  },

  HEC: {
    "Intermediate 1st Year": [
      { name: "English", practical: false },
      { name: "Second Language (Telugu/Sanskrit/Hindi/Urdu)", practical: false },
      { name: "History I", practical: false },
      { name: "Economics I", practical: false },
      { name: "Civics I", practical: false },
    ],

    "Intermediate 2nd Year": [
      { name: "English", practical: false },
      { name: "Second Language (Telugu/Sanskrit/Hindi/Urdu)", practical: false },
      { name: "History II", practical: false },
      { name: "Economics II", practical: false },
      { name: "Civics II", practical: false },
    ],
  },
};

export default function PublishResults() {
  const [filters, setFilters] = useState({
  board: "State Board",
  academicYear: "2026-27",
  academicLevel: "Intermediate 1st Year",
  group: "MPC",
  exam: "Mid-1",
  publishDate: "",
});

const availableSubjects =
  SUBJECTS[filters.group][filters.academicLevel];

const [results, setResults] = useState(initialResults);

const [searchRollNo, setSearchRollNo] = useState("");

const [filteredResults, setFilteredResults] =
  useState(initialResults);

const [message, setMessage] = useState("");

const [editingId, setEditingId] = useState(null);

const [newResult, setNewResult] = useState({
  student: "",
  rollNo: "",
  subject: "",
  internal: "",
  practical: "",
  external: "",
});

const [search, setSearch] = useState("");

const [showForm, setShowForm] = useState(false);

const [viewStudent, setViewStudent] = useState(null);

const [showView, setShowView] = useState(false);

  const summary = useMemo(() => {
    const passed = results.filter((item) => {
      const total =
        item.internal + item.practical + item.external;
      return total >= 35;
    }).length;

    return {
      totalStudents: results.length,
      passedStudents: passed,
      failedStudents: results.length - passed,
    };
  }, [results]);

  const handleChange = (id, field, value) => {
    let max = 20;

    if (field === "external") max = 60;

    if (field === "practical") max = 20;

    const mark = Math.max(
      0,
      Math.min(max, Number(value) || 0)
    );

    setResults((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: mark,
            }
          : item
      )
    );
  };

  const handleNewResultChange = (e) => {
  const { name, value } = e.target;

  if (name === "subject") {
    const subject = availableSubjects.find(
      (item) => item.name === value
    );

    setNewResult((prev) => ({
      ...prev,
      subject: value,
      practical: subject?.practical ? prev.practical : 0,
    }));

    return;
  }

  setNewResult((prev) => ({
    ...prev,
    [name]: value,
  }));
};

const resetForm = () => {
  setEditingId(null);

  setNewResult({
    student: "",
    rollNo: "",
    subject: "",
    internal: "",
    practical: "",
    external: "",
  });
};

const addResult = () => {

  if (
    !newResult.student ||
    !newResult.rollNo ||
    !newResult.subject
  ) {
    alert("Please fill all required fields.");
    return;
  }

  const newData = {
  id: Date.now(),

  student: newResult.student,

  rollNo: newResult.rollNo,

  group: filters.group,

  academicLevel: filters.academicLevel,

  subject: newResult.subject,

  internal: Number(newResult.internal) || 0,

  practical: Number(newResult.practical) || 0,

  external: Number(newResult.external) || 0,
};

  const updated = [...results, newData];

setResults(updated);

setFilteredResults(updated);

  setNewResult({
    student: "",
    rollNo: "",
    subject: "",
    internal: "",
    practical: "",
    external: "",
  });

  setMessage("Student Result Added Successfully.");
  resetForm();
};

const editResult = (id) => {

  const selected = results.find(
    (item) => item.id === id
  );

  if (!selected) return;

  setEditingId(id);

  setShowForm(true);

  setNewResult({
    student: selected.student,
    rollNo: selected.rollNo,
    subject: selected.subject,
    internal: selected.internal,
    practical: selected.practical,
    external: selected.external,
  });

};

const saveResult = () => {

  const updated = results.map((item) =>
  item.id === editingId
  ? {
      ...item,

      student: newResult.student,

      rollNo: newResult.rollNo,

      group: filters.group,

      academicLevel: filters.academicLevel,

      subject: newResult.subject,

      internal: Number(newResult.internal),

      practical: Number(newResult.practical),

      external: Number(newResult.external),
    }
    : item
);

setResults(updated);

setFilteredResults(updated);

  setEditingId(null);

  setNewResult({
    student: "",
    rollNo: "",
    subject: "",
    internal: "",
    practical: "",
    external: "",
  });

  setMessage("Student Result Updated Successfully.");
  resetForm();
};

const cancelEdit = () => {
  resetForm();
  setShowForm(false);
};

const deleteResult = (id) => {

  if (!window.confirm("Delete this result?"))
    return;

  const updated = results.filter(
    (item) => item.id !== id
  );

  setResults(updated);

  setFilteredResults(updated);

  setMessage("Result deleted successfully.");

};

const viewResult = (student) => {

  setViewStudent(student);

  setShowView(true);

};

const publishResults = () => {

  if (!filters.publishDate) {

    alert("Select Publish Date.");

    return;

  }

  setMessage(
    `Results Published Successfully on ${filters.publishDate}`
  );

};

const searchResults = (e) => {
  e.preventDefault();

  const data = results.filter(
    (item) =>
      item.rollNo
        .toLowerCase()
        .includes(searchRollNo.toLowerCase()) &&
      item.group === filters.group &&
      item.academicLevel === filters.academicLevel
  );

  setFilteredResults(data);
};

const getSubjects = (student) => {

  return SUBJECTS[
      student.group
  ][
      student.academicLevel
  ];

};

const calculateStudentSummary = (student) => {

  const subjects = getSubjects(student);

  let grandTotal = 0;

  const rows = subjects.map(subject => {

      const data = results.find(r =>

          r.rollNo===student.rollNo &&

          r.subject===subject.name

      );

      const internal=data?.internal||0;

      const practical=data?.practical||0;

      const external=data?.external||0;

      const total=

      internal+

      practical+

      external;

      grandTotal+=total;

      return{

          ...subject,

          internal,

          practical,

          external,

          total,

          grade:calculateGrade(total),

          result:total>=35?"Pass":"Fail"

      };

  });

  return{

      rows,

      grandTotal,

      percentage:

      (

      grandTotal/

      (subjects.length*100)

      *100

      ).toFixed(2),

      overallGrade:

      calculateGrade(

      grandTotal/

      subjects.length

      ),

      finalResult:

      rows.every(

      x=>x.result==="Pass"

      )

      ?"Pass"

      :"Fail"

  };

};

  return (
    <div className="publishResults">
      <PageHeader
  title="Publish Results"
  subtitle="Publish Intermediate Examination Results"
  actions={
    <div
      style={{
        display: "flex",
        gap: "10px",
      }}
    >
      <Button
  onClick={() => {
    resetForm();
    setShowForm(true);
  }}
>
  Add Result
</Button>

      <Button onClick={publishResults}>
        View Results
      </Button>
    </div>
  }
/>
     
 {showForm && (
  <Card>

  <h3 style={{ marginBottom: "20px" }}>
    {editingId ? "Edit Result" : "Add Result"}
  </h3>

  <div className="filter-grid">

    <label>
      Student Name
      <input
        name="student"
        value={newResult.student}
        onChange={handleNewResultChange}
      />
    </label>

    <label>
      Roll No
      <input
        name="rollNo"
        value={newResult.rollNo}
        onChange={handleNewResultChange}
        />
    </label>

    <label>
      Subject
      <select
    name="subject"
    value={newResult.subject}
    onChange={handleNewResultChange}
>
    <option value="">Select Subject</option>

    {availableSubjects.map((subject) => (
        <option
        key={subject.name}
        value={subject.name}
        >
            {subject.name}
        </option>
    ))}
</select>
    </label>

    <label>
      Internal
      <input
        type="number"
        name="internal"
        value={newResult.internal}
        onChange={handleNewResultChange}
        />
    </label>

    <label>
      Practical
      <input
    type="number"
    name="practical"
    value={newResult.practical}
    onChange={handleNewResultChange}
    disabled={
      !availableSubjects.find(
        (item) =>
          item.name === newResult.subject
      )?.practical
    }
/>
    </label>

    <label>
      External
      <input
        type="number"
        name="external"
        value={newResult.external}
        onChange={handleNewResultChange}
        />
    </label>

  </div>

  <div
    style={{
      marginTop: 20,
      display: "flex",
      gap: 10,
    }}
    >

    {editingId ? (
  <>
    <Button onClick={saveResult}>
      Save
    </Button>

    <Button
      variant="secondary"
      onClick={cancelEdit}
    >
      Cancel
    </Button>
  </>
) : (
  <>
    <Button onClick={addResult}>
      Add Result
    </Button>

    <Button
      variant="secondary"
      onClick={cancelEdit}
    >
      Cancel
    </Button>
  </>
)}

  </div>
  

</Card>
      )}
      <Card>

        <div className="filter-grid">

          <label>
            Board

            <select
              value={filters.board}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  board: e.target.value,
                })
              }
            >
              <option>State Board</option>
              <option>CBSE</option>
            </select>

          </label>

          <label>
            Academic Year

            <select
              value={filters.academicYear}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  academicYear: e.target.value,
                })
              }
            >
              <option>2026-27</option>
              <option>2025-26</option>
            </select>

          </label>

          <label>
            Academic Level

            <select
              value={filters.academicLevel}
              onChange={(e) => {
  const value = e.target.value;

  setFilters({
    ...filters,
    academicLevel: value,
  });

  const data = results.filter(
    (item) =>
      item.rollNo
        .toLowerCase()
        .includes(searchRollNo.toLowerCase()) &&
      item.group === filters.group &&
      item.academicLevel === value
  );

  setFilteredResults(data);
}}
            >
              <option>Intermediate 1st Year</option>
              <option>Intermediate 2nd Year</option>
            </select>

          </label>

          <label>
            Group

            <select
              value={filters.group}
              onChange={(e) => {
  const value = e.target.value;

  setFilters({
    ...filters,
    group: value,
  });

  const data = filteredResults
.filter(
  (item) =>
    item.rollNo
      .toLowerCase()
      .includes(search.toLowerCase()) &&
    item.group === filters.group &&
    item.academicLevel ===
      filters.academicLevel
)

  setFilteredResults(data);
}}
            >
              <option>MPC</option>
              <option>BiPC</option>
              <option>MEC</option>
              <option>CEC</option>
              <option>HEC</option>
            </select>

          </label>

          <label>
            Exam

            <select
              value={filters.exam}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  exam: e.target.value,
                })
              }
            >
              <option>Mid-1</option>
              <option>Mid-2</option>
              <option>Pre Final</option>
              <option>Final</option>
            </select>

          </label>

          <label>
            Publish Date

            <input
              type="date"
              value={filters.publishDate}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  publishDate: e.target.value,
                })
              }
            />

          </label>

        </div>

      </Card>

      <div className="result-summary">

        <div>
          <span>Total Students</span>
          <strong>{summary.totalStudents}</strong>
        </div>

        <div>
          <span>Passed</span>
          <strong>{summary.passedStudents}</strong>
        </div>

        <div>
          <span>Failed</span>
          <strong>{summary.failedStudents}</strong>
        </div>

      </div>

<Card className="search-card">

  <div className="search-container">

    <input
      type="text"
      placeholder="Search Roll Number..."
      className="search-input"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />

    <select>
      <option>Intermediate 1st Year</option>
      <option>Intermediate 2nd Year</option>
    </select>

    <select>
      <option>MPC</option>
      <option>BiPC</option>
      <option>MEC</option>
      <option>CEC</option>
    </select>

  </div>

</Card>
      <Card className="marks-card" padded={false}>

          <div className="results-table-wrapper">

        <table className="results-table">

          <thead>

            <tr>

              <th>Student Name</th>

              <th>Roll No</th>

              <th>Subject</th>

              <th>Internal</th>

              <th>Practical</th>

              <th>External</th>

              <th>Total</th>

              <th>Grade</th>
              
              <th>Result</th>
              
              <th>Actions</th>
            </tr>

          </thead>

          <tbody>

            {filteredResults
.filter((item) =>
  item.rollNo
    .toLowerCase()
    .includes(search.toLowerCase()) ||
    item.student
  .toLowerCase()
  .includes(search.toLowerCase())
) .map((item) => {

              const total =
                item.internal +
                item.practical +
                item.external;

              const grade = calculateGrade(total);

              const result =
                total >= 35 ? "Pass" : "Fail";

              return (

                <tr key={item.id}>

                  <td>{item.student}</td>

                  <td>{item.rollNo}</td>

                  <td>{item.subject}</td>

                  <td>

                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={item.internal}
                      onChange={(e) =>
                        handleChange(
                          item.id,
                          "internal",
                          e.target.value
                        )
                      }
                    />

                  </td>

                  <td>

                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={item.practical}
                      onChange={(e) =>
                        handleChange(
                          item.id,
                          "practical",
                          e.target.value
                        )
                      }
                    />

                  </td>

                  <td>

                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={item.external}
                      onChange={(e) =>
                        handleChange(
                          item.id,
                          "external",
                          e.target.value
                        )
                      }
                    />

                  </td>

                  <td>{total}</td>

                  <td>{grade}</td>
                  
                  <td>{result}</td>
                  <td>
                    <div style={{
      display: "flex",
      gap: "8px",
    }}
  >

    <Button
      onClick={() => editResult(item.id)}
    >
      <FaEdit style={{ marginRight: 5 }}/>
    </Button>

    <Button
      variant="danger"
      onClick={() => deleteResult(item.id)}
    >
      <FaTrash style={{ marginRight: 5 }}/>
    </Button>

     <Button
  variant="secondary"
  onClick={() => viewResult(item)}
>
  <FaEye style={{ marginRight: 5 }} />
</Button>
  </div>

</td>
                </tr>

              );

            })}

          </tbody>

        </table>
        {showView && viewStudent && (

<Card className="view-result-card">

<h2>

Student Result

</h2>

<p>

<b>Name :</b>

{viewStudent.student}

</p>

<p>

<b>Roll No :</b>

{viewStudent.rollNo}

</p>

<p>

<b>Group :</b>

{viewStudent.group}

</p>

<p>

<b>Academic Level :</b>

{viewStudent.academicLevel}

</p>

<table className="results-table">

<thead>

<tr>

<th>Subject</th>

<th>Marks</th>

<th>Internal</th>

<th>Practical</th>

<th>External</th>

<th>Total</th>

<th>Grade</th>

<th>Result</th>

</tr>

</thead>

<tbody>

{

calculateStudentSummary(viewStudent)

.rows

.map(subject=>(

<tr key={subject.name}>

<td>

{subject.name}

</td>

<td>
  {subject.marks}
</td>

<td>

{subject.internal}

</td>

<td>

{subject.practical}

</td>

<td>

{subject.external}

</td>

<td>

{subject.total}

</td>

<td>

{subject.grade}

</td>

<td>

{subject.result}

</td>

</tr>

))

}

</tbody>

</table>

<div
style={{
display:"grid",
gridTemplateColumns:"repeat(4,1fr)",
gap:"20px",
marginTop:"20px"
}}
>

<div>

<h4>

Grand Total

</h4>

<p>

{

calculateStudentSummary(viewStudent)

.grandTotal

}

</p>

</div>

<div>

<h4>

Percentage

</h4>

<p>

{

calculateStudentSummary(viewStudent)

.percentage

}%

</p>

</div>

<div>

<h4>

Overall Grade

</h4>

<p>

{

calculateStudentSummary(viewStudent)

.overallGrade

}

</p>

</div>

<div>

<h4>

Final Result

</h4>

<p>

{

calculateStudentSummary(viewStudent)

.finalResult

}

</p>

</div>

</div>

<div
style={{
marginTop:20
}}
>

<Button
onClick={()=>setShowView(false)}
>

Close

</Button>

</div>

</Card>

)}

          </div>
          
        <div className="marks-footer">

          <span>{message}</span>

        </div>

      </Card>

    </div>
  );
}

