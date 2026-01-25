type QuickAccessItem = {
    id: string;
    title: string;
    desc: string;
    gradient: string;
  };
  
  const ITEMS: QuickAccessItem[] = [
    {
      id: "trends",
      title: "Anonymized Trends",
      desc: "View real-time data insights",
      gradient: "linear-gradient(135deg, #3b82f6, #06b6d4)",
    },
    {
      id: "analysis",
      title: "Request Analysis",
      desc: "Generate custom reports",
      gradient: "linear-gradient(135deg, #8b5cf6, #ec4899)",
    },
    {
      id: "engage",
      title: "Campaigns",
      desc: "Manage community engagement",
      gradient: "linear-gradient(135deg, #22c55e, #10b981)",
    },
    {
      id: "queue",
      title: "Report Queue",
      desc: "Review pending cases",
      gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    },
    {
      id: "insights",
      title: "Program Insights",
      desc: "Policy design tools",
      gradient: "linear-gradient(135deg, #eab308, #f59e0b)",
    },
    {
      id: "hotspots",
      title: "Hotspot Mapping",
      desc: "Risk zone analysis",
      gradient: "linear-gradient(135deg, #6366f1, #3b82f6)",
    },
  ];
  
  declare const navigateTo: (tabId: string) => void;
  
  export const QuickAccessGrid: React.FC = () => {
    return (
      <>
        <h2 style={{ color: "var(--navy)", marginBottom: "1rem" }}>
          Quick Access
        </h2>
  
        <div className="quick-access-grid">
          {ITEMS.map((item) => (
            <div
              key={item.id}
              className="quick-access-card"
              onClick={() => navigateTo(item.id)}
            >
              <div
                className="quick-access-icon"
                style={{ background: item.gradient }}
              />
              <h3 className="quick-access-title">{item.title}</h3>
              <p className="quick-access-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </>
    );
  };
  