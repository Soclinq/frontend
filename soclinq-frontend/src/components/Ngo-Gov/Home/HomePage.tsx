import { WelcomeHeader } from "./WelcomeHeader";
import { QuickAccessGrid } from "./QuickAccessGrid";
import { RecentActivity } from "./RecentActivity";
import { SystemStatus } from "./SystemStatus";

export const HomePage: React.FC = () => {
  return (
    <section>
      <WelcomeHeader />

      <QuickAccessGrid />

      <div className="grid grid-2" style={{ marginTop: "1.5rem" }}>
        <RecentActivity />
        <SystemStatus />
      </div>
    </section>
  );
};
