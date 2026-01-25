type Activity = {
    text: string;
    time: string;
  };
  
  const ACTIVITIES: Activity[] = [
    { text: "GBV Analysis Completed", time: "5 minutes ago" },
    { text: "New Campaign Published", time: "1 hour ago" },
    { text: "High Priority Alert", time: "3 hours ago" },
  ];
  
  export const RecentActivity: React.FC = () => {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Activity</h3>
          <p className="card-description">Latest updates from your dashboard</p>
        </div>
  
        <div className="card-body">
          {ACTIVITIES.map((a, i) => (
            <div
              key={i}
              style={{
                padding: "0.75rem",
                borderRadius: "8px",
                background: "var(--bg-light)",
                marginBottom: "0.5rem",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--navy)" }}>
                {a.text}
              </div>
              <div
                style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
              >
                {a.time}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  