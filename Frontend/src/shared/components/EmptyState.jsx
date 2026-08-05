export default function EmptyState({
  title = "No records found",
  message = "No data is available yet.",
  action,
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}
