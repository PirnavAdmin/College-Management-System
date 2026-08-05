import PagePlaceholder from "../../shared/components/PagePlaceholder";
import "./FeeCollection.css";

export default function FeeCollection() {
  return <PagePlaceholder title="Fee Collection" fields={["Student", "Receipt Number", "Payment Date", "Amount", "Discount", "Fine", "Payment Mode", "Transaction Number"]} />;
}
