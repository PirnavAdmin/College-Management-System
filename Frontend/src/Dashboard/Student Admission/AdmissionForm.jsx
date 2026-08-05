import PagePlaceholder from "../../shared/components/PagePlaceholder";
import "./AdmissionForm.css";

export default function AdmissionForm() {
  return <PagePlaceholder title="Admission Form" groups={[{ title: "Student Details", fields: ["Admission No", "Admission Date", "Student Photo", "First Name", "Last Name", "Gender", "DOB", "Aadhaar", "Blood Group", "Nationality", "Religion", "Caste", "Category"] }, { title: "Parent Details", fields: ["Father Name", "Mother Name", "Guardian", "Parent Mobile", "Parent Email", "Occupation", "Annual Income"] }, { title: "Address & Academic", fields: ["Address", "City", "District", "State", "Pincode", "Board", "Academic Year", "Academic Level", "Group", "Section"] }, { title: "Previous School & Documents", fields: ["Previous School", "Previous Board", "Previous Percentage", "Birth Certificate", "TC", "Study Certificate", "Aadhaar document", "Community Certificate", "Income Certificate", "Passport Photo"] }]} />;
}
