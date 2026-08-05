import PagePlaceholder from "../../shared/components/PagePlaceholder";
import "./CreateAssignment.css";

export default function CreateAssignment() {
  return <PagePlaceholder title="Create Assignment" fields={["Title", "Subject", "Faculty", "Description", "Due Date", "Attachment", "Maximum Marks"]} />;
}
