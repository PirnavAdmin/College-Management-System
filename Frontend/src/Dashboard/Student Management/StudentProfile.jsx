import PagePlaceholder from "../../shared/components/PagePlaceholder";
import "./StudentProfile.css";

export default function StudentProfile() {
  return <PagePlaceholder title="Student Profile" fields={["Student ID", "Admission No", "Roll No", "Student Name", "Photo", "Board", "Academic Year", "Academic Level", "Group", "Section", "Admission Date", "Parent Details", "Fee Details", "Attendance %", "Performance"]} />;
}
