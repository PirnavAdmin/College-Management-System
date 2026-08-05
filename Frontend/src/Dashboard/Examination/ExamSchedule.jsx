import PagePlaceholder from "../../shared/components/PagePlaceholder";
import "./ExamSchedule.css";

export default function ExamSchedule() {
  return <PagePlaceholder title="Exam Schedule" fields={["Subject", "Date", "Time", "Hall", "Invigilator"]} />;
}
