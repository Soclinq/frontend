import { QuickStats } from "./QuickStats";

export const WelcomeHeader: React.FC = () => {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="welcome-header">
      <h1 className="welcome-title">Welcome back to Linqmi NGO</h1>
      <p className="welcome-subtitle">
        Your humanitarian intelligence dashboard • {today}
      </p>

      <QuickStats />
    </div>
  );
};
