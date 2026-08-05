import PagePlaceholder from "../../shared/components/PagePlaceholder";
import "./Reports.css";

export default function Reports() {
  return <PagePlaceholder title="Reports" groups={[{ title: "Report Filters", fields: ["Board", "Academic Year", "Academic Level", "Group", "Section", "Date Range"] }, { title: "Report Types", fields: ["Admission", "Attendance", "Fee Collection", "Due Fees", "Examinations", "Results", "Faculty Workload", "Student Strength", "Pass/Fail", "Toppers"] }]} />;
}
