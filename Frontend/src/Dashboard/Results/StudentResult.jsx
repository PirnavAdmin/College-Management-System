import PagePlaceholder from "../../shared/components/PagePlaceholder";
import "./StudentResult.css";

export default function StudentResult() {
  return <PagePlaceholder title="Student Result" fields={["Student Name", "Roll No", "Subject", "Internal", "Practical", "External", "Total", "Grade", "Result"]} />;
}
