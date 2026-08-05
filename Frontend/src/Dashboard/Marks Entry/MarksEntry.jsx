import PagePlaceholder from "../../shared/components/PagePlaceholder";
import "./MarksEntry.css";

export default function MarksEntry() {
  return <PagePlaceholder title="Marks Entry" fields={["Board", "Academic Year", "Academic Level", "Group", "Section", "Exam", "Subject", "Roll No", "Student Name", "Internal", "Practical", "Theory", "Total"]} />;
}
