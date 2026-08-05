import Card from "./Card";
import PageHeader from "./PageHeader";

export default function PagePlaceholder({ title, fields = [], groups = [] }) {
  return (
    <>
      <PageHeader
        title={title}
        subtitle="This module structure is ready. Implementation pending."
      />
      <Card className="placeholder">
        <h2>{title}</h2>
        <p>This module structure is ready. Implementation pending.</p>
        {fields.length ? (
          <div className="placeholder-fields">
            {fields.map((field) => (
              <span className="badge badge-muted" key={field}>
                {field}
              </span>
            ))}
          </div>
        ) : null}
        {groups.map((group) => (
          <div className="placeholder-fields" key={group.title}>
            <span className="badge">{group.title}</span>
            {group.fields.map((field) => (
              <span className="badge badge-muted" key={`${group.title}-${field}`}>
                {field}
              </span>
            ))}
          </div>
        ))}
      </Card>
    </>
  );
}
