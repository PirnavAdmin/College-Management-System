import PagePlaceholder from "../../shared/components/PagePlaceholder";
import "./StudentResult.css";
import { useMemo, useState } from "react";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import PageHeader from "../../shared/components/PageHeader";

const initialResults = [
  {
    id: 1,
    studentName: "Rahul Kumar",
    rollNo: "INT001",
    subject: "English",
    internal: 18,
    practical: 0,
    external: 72,
  },
  {
    id: 2,
    studentName: "Rahul Kumar",
    rollNo: "INT001",
    subject: "Physics",
    internal: 19,
    practical: 18,
    external: 48,
  },
  {
    id: 3,
    studentName: "Rahul Kumar",
    rollNo: "INT001",
    subject: "Chemistry",
    internal: 17,
    practical: 19,
    external: 45,
  },
  {
    id: 4,
    studentName: "Rahul Kumar",
    rollNo: "INT001",
    subject: "Mathematics",
    internal: 20,
    practical: 0,
    external: 70,
  },
  {
    id: 5,
    studentName: "Priya Sharma",
    rollNo: "INT002",
    subject: "English",
    internal: 20,
    practical: 0,
    external: 70,
  },
  {
    id: 6,
    studentName: "Priya Sharma",
    rollNo: "INT002",
    subject: "Physics",
    internal: 18,
    practical: 18,
    external: 46,
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

export default function StudentResult() {
const [rollNo, setRollNo] = useState("");

const [results, setResults] = useState(initialResults);

const [filteredResults, setFilteredResults] =
  useState(initialResults);

const [editingId, setEditingId] =
  useState(null);

const [formData, setFormData] = useState({
  studentName: "",
  rollNo: "",
  subject: "",
  internal: "",
  practical: "",
  external: "",
});

  const searchStudent = (e) => {
  e.preventDefault();

  if (!rollNo.trim()) {
    setFilteredResults(results);
    return;
  }

  const data = results.filter((item) =>
    item.rollNo
      .toLowerCase()
      .includes(rollNo.toLowerCase())
  );

  setFilteredResults(data);
};

const handleInputChange = (e) => {
  const { name, value } = e.target;

  setFormData((prev) => ({
    ...prev,
    [name]: value,
  }));
};

const addResult = () => {
  if (
    !formData.studentName ||
    !formData.rollNo ||
    !formData.subject
  ) {
    alert("Fill all fields");
    return;
  }

  const newRow = {
    id: Date.now(),
    studentName: formData.studentName,
    rollNo: formData.rollNo,
    subject: formData.subject,
    internal: Number(formData.internal),
    practical: Number(formData.practical),
    external: Number(formData.external),
  };

  const updated = [...results, newRow];

  setResults(updated);

  setFilteredResults(updated);

  setFormData({
    studentName: "",
    rollNo: "",
    subject: "",
    internal: "",
    practical: "",
    external: "",
  });
};

const editResult = (id) => {
  const row = results.find(
    (item) => item.id === id
  );

  setEditingId(id);

  setFormData({
    studentName: row.studentName,
    rollNo: row.rollNo,
    subject: row.subject,
    internal: row.internal,
    practical: row.practical,
    external: row.external,
  });
};

const saveResult = () => {
  const updated = results.map((item) =>
    item.id === editingId
      ? {
          ...item,
          ...formData,
          internal: Number(formData.internal),
          practical: Number(formData.practical),
          external: Number(formData.external),
        }
      : item
  );

  setResults(updated);

  setFilteredResults(updated);

  setEditingId(null);

  setFormData({
    studentName: "",
    rollNo: "",
    subject: "",
    internal: "",
    practical: "",
    external: "",
  });
};

const cancelEdit = () => {
  setEditingId(null);

  setFormData({
    studentName: "",
    rollNo: "",
    subject: "",
    internal: "",
    practical: "",
    external: "",
  });
};

const deleteResult = (id) => {
  if (!window.confirm("Delete Result?"))
    return;

  const updated = results.filter(
    (item) => item.id !== id
  );

  setResults(updated);

  setFilteredResults(updated);
};


  const summary = useMemo(() => {

  if (filteredResults.length === 0) {
    return {
      grandTotal: 0,
      percentage: 0,
      overallGrade: "-",
      finalResult: "-",
    };
  }

  const grandTotal = filteredResults.reduce(
    (sum, item) =>
      sum +
      item.internal +
      item.practical +
      item.external,
    0
  );

  const maxMarks = filteredResults.length * 100;

  const percentage = (
    (grandTotal / maxMarks) * 100
  ).toFixed(2);

  const failed = filteredResults.some(
    (item) =>
      item.internal +
        item.practical +
        item.external <
      35
  );

  const average = grandTotal / filteredResults.length;

  return {
    grandTotal,
    percentage,
    overallGrade: calculateGrade(average),
    finalResult: failed ? "Fail" : "Pass",
  };

}, [filteredResults]);
  return (
    <div className="studentResult">

      <PageHeader
        title="Student Result"
        subtitle="View Published Student Results"
      />

      <Card className="result-search">

  <form onSubmit={searchStudent}>

    <label>

      Search Roll Number

      <input
        type="text"
        placeholder="Enter Roll Number"
        value={rollNo}
        onChange={(e) => setRollNo(e.target.value)}
      />

    </label>

    <Button type="submit">

      Search

    </Button>

    <Button
      type="button"
      variant="secondary"
      onClick={() => {
        setRollNo("");
        setFilteredResults(results);
      }}
    >

      Reset

    </Button>

  </form>

</Card>

     <Card>

  <h3 style={{ marginBottom: 20 }}>

    {editingId ? "Edit Result" : "Add Result"}

  </h3>

  <div className="filter-grid">

    <label>

      Student Name

      <input
        name="studentName"
        value={formData.studentName}
        onChange={handleInputChange}
      />

    </label>

    <label>

      Roll No

      <input
        name="rollNo"
        value={formData.rollNo}
        onChange={handleInputChange}
      />

    </label>

    <label>

      Subject

      <input
        name="subject"
        value={formData.subject}
        onChange={handleInputChange}
      />

    </label>

    <label>

      Internal

      <input
        type="number"
        name="internal"
        value={formData.internal}
        onChange={handleInputChange}
      />

    </label>

    <label>

      Practical

      <input
        type="number"
        name="practical"
        value={formData.practical}
        onChange={handleInputChange}
      />

    </label>

    <label>

      External

      <input
        type="number"
        name="external"
        value={formData.external}
        onChange={handleInputChange}
      />

    </label>

  </div>

  <div
    style={{
      display: "flex",
      gap: 10,
      marginTop: 20,
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

     <Card>

  <div className="result-overview">

    <div>

      <span>Grand Total</span>

      <strong>

        {summary.grandTotal}

      </strong>

    </div>

    <div>

      <span>Percentage</span>

      <strong>

        {summary.percentage}%

      </strong>

    </div>

    <div>

      <span>Overall Grade</span>

      <strong>

        {summary.overallGrade}

      </strong>

    </div>

    <div>

      <span>Final Result</span>

      <strong
        className={
          summary.finalResult === "Pass"
            ? "pass-result"
            : "fail-result"
        }
      >

        {summary.finalResult}

      </strong>

    </div>

  </div>

</Card>

<Card className="mark-sheet" padded={false}>

  <div className="mark-sheet-top">

    <h2>Student Results</h2>

  </div>

  <div className="mark-table-wrap">

    <table className="mark-table">

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

        {filteredResults.map((item) => {

          const total =
  item.internal +
  item.practical +
  item.external;

const grade = calculateGrade(total);

const result = total >= 35 ? "Pass" : "Fail";

return (

  <tr key={item.id}>

    <td>{item.studentName}</td>

    <td>{item.rollNo}</td>

    <td>{item.subject}</td>

    <td>{item.internal}</td>

    <td>{item.practical}</td>

    <td>{item.external}</td>

    <td>
      <strong>{total}</strong>
    </td>

    <td>{grade}</td>

    <td>

      <span
        className={
          result === "Pass"
            ? "pass"
            : "fail"
        }
      >
        {result}
      </span>

    </td>

    <td>

      <div
        style={{
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

</Card>
    </div>
  );
}
