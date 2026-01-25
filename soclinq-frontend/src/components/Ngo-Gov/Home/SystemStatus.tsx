const STATUSES = [
    { label: "Data Encryption", value: "Active" },
    { label: "Anonymization", value: "100%" },
    { label: "API Status", value: "Online" },
  ];
  
  export const SystemStatus: React.FC = () => {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">System Status</h3>
          <p className="card-description">Security & compliance</p>
        </div>
  
        <div className="card-body">
          {STATUSES.map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.75rem",
                background: "#dcfce7",
                borderRadius: "8px",
                marginBottom: "0.5rem",
                fontSize: "0.875rem",
              }}
            >
              <span>{s.label}</span>
              <strong>{s.value}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  };
  