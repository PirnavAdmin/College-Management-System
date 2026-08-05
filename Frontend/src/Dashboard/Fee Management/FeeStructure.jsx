import PagePlaceholder from "../../shared/components/PagePlaceholder";
import "./FeeStructure.css";

export default function FeeStructure() {
  return <PagePlaceholder title="Fee Structure" fields={["Board", "Academic Year", "Group", "Fee Type", "Amount", "Due Date"]} />;
}
