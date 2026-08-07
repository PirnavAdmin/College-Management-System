import PagePlaceholder from "../../shared/components/PagePlaceholder";
import "./PublishResults.css";
import { useMemo, useState } from "react";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import PageHeader from "../../shared/components/PageHeader";

const initialResults = [
  {
    id: 1,
    student: "Rahul Kumar",
    rollNo: "INT001",
    subject: "Mathematics",
    internal: 18,
    practical: 0,
    external: 70,
  },
  {
    id: 2,
    student: "Priya Sharma",
    rollNo: "INT002",
    subject: "Physics",
    internal: 19,
    practical: 18,
    external: 48,
  },
  {
    id: 3,
    student: "Arjun Reddy",
    rollNo: "INT003",
    subject: "Chemistry",
    internal: 17,
    practical: 19,
    external: 45,
  },
  {
    id: 4,
    student: "Sneha Patel",
    rollNo: "INT004",
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

export default function PublishResults() {
  const [filters, setFilters] = useState({
    board: "State Board",
    academicYear: "2026-27",
    academicLevel: "Intermediate 1st Year",
    group: "MPC",
    exam: "Mid-1",
    publishDate: "",
  });

const [results, setResults] = useState(initialResults);

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

  setNewResult((prev) => ({
    ...prev,
    [name]: value,
  }));
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

    subject: newResult.subject,

    internal: Number(newResult.internal) || 0,

    practical: Number(newResult.practical) || 0,

    external: Number(newResult.external) || 0,
  };

  setResults((prev) => [...prev, newData]);

  setNewResult({
    student: "",
    rollNo: "",
    subject: "",
    internal: "",
    practical: "",
    external: "",
  });

  setMessage("Student Result Added Successfully.");
};

const editResult = (id) => {

  const selected = results.find(
    (item) => item.id === id
  );

  setEditingId(id);

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

  setResults((prev) =>
    prev.map((item) =>
      item.id === editingId
        ? {
            ...item,

            student: newResult.student,

            rollNo: newResult.rollNo,

            subject: newResult.subject,

            internal: Number(newResult.internal),

            practical: Number(newResult.practical),

            external: Number(newResult.external),
          }
        : item
    )
  );

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
};

const cancelEdit = () => {

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

const deleteResult = (id) => {

  const confirmDelete = window.confirm(
    "Delete this result?"
  );

  if (!confirmDelete) return;

  setResults((prev) =>
    prev.filter((item) => item.id !== id)
  );

  setMessage("Student Result Deleted Successfully.");

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

  return (
    <div className="publishResults">

      <PageHeader
        title="Publish Results"
        subtitle="Publish Intermediate Examination Results"
        actions={
          <Button onClick={publishResults}>
            View Results
          </Button>
        }
      />

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
              onChange={(e) =>
                setFilters({
                  ...filters,
                  academicLevel: e.target.value,
                })
              }
            >
              <option>Intermediate 1st Year</option>
              <option>Intermediate 2nd Year</option>
            </select>

          </label>

          <label>
            Group

            <select
              value={filters.group}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  group: e.target.value,
                })
              }
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
      <input
        name="subject"
        value={newResult.subject}
        onChange={handleNewResultChange}
      />
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
      <Button onClick={addResult}>
        Add Result
      </Button>
    )}

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

            {results.map((item) => {

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
      Edit
    </Button>

    <Button
      variant="danger"
      onClick={() => deleteResult(item.id)}
    >
      Delete
    </Button>

  </div>

</td>
                </tr>

              );

            })}

          </tbody>

        </table>

          </div>
          
        <div className="marks-footer">

          <span>{message}</span>

        </div>

      </Card>

    </div>
  );
}

