import PagePlaceholder from "../../shared/components/PagePlaceholder";
import "./CreateTimetable.css";

export default function CreateTimetable() {
  return <PagePlaceholder title="Create Timetable" fields={["Board", "Academic Year", "Academic Level", "Group", "Section", "Day", "Period", "Subject", "Faculty", "Room"]} />;
}
