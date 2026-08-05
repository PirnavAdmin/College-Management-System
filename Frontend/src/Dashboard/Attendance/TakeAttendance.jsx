import PagePlaceholder from "../../shared/components/PagePlaceholder";
import "./TakeAttendance.css";

export default function TakeAttendance() {
  return <PagePlaceholder title="Take Attendance" groups={[{ title: "Filters", fields: ["Date", "Board", "Academic Year", "Academic Level", "Group", "Section", "Subject", "Faculty"] }, { title: "Attendance Table", fields: ["Roll No", "Student Name", "Present", "Absent", "Late", "Leave"] }]} />;
}
