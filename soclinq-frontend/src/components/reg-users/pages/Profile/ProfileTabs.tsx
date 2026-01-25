import Account from "./AccountSection";
import Device from "./DeviceTrackingSection";
import Emergency from "./EmergencyContactSection";
import Activity from "./ActivityHistorySection";

export default function ProfileTabs({ tab, setTab, profile, setProfile }: any) {
  return (
    <>
      <nav>
        {["account", "device", "emergency", "activity"].map((t) => (
          <button key={t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>

      {tab === "account" && <Account />}
      {tab === "device" && <Device />}
      {tab === "emergency" && <Emergency />}
      {tab === "activity" && <Activity />}
    </>
  );
}
