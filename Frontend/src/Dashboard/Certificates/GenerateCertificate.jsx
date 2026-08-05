import PagePlaceholder from "../../shared/components/PagePlaceholder";
import "./GenerateCertificate.css";

export default function GenerateCertificate() {
  return <PagePlaceholder title="Generate Certificate" fields={["Student", "Certificate Type", "Purpose", "Issue Date", "Remarks"]} />;
}
