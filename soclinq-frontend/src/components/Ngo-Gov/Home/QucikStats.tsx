type Stat = {
    label: string;
    value: number | string;
    meta: string;
  };
  
  const STATS: Stat[] = [
    { label: "Active Reports", value: 24, meta: "+12% today" },
    { label: "Pending Analysis", value: 8, meta: "-5% today" },
    { label: "Active Campaigns", value: 15, meta: "+8% today" },
    { label: "Critical Alerts", value: 3, meta: "+2 today" },
  ];
  
  export const QuickStats: React.FC = () => {
    return (
      <div className="quick-stats-grid">
        {STATS.map((stat) => (
          <div className="quick-stat" key={stat.label}>
            <div className="quick-stat-label">{stat.label}</div>
            <div className="quick-stat-value">{stat.value}</div>
            <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>
              {stat.meta}
            </div>
          </div>
        ))}
      </div>
    );
  };
  