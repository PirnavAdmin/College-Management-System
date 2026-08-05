import PagePlaceholder from "../../shared/components/PagePlaceholder";
import "./CreateExamination.css";

export default function CreateExamination() {
  return <PagePlaceholder title="Create Examination" fields={["Exam Name", "Board", "Academic Year", "Academic Level", "Group", "Exam Type", "Start Date", "End Date"]} />;
}
