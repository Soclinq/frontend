"use client";

import ChangeLGAModal from "../components/ChangeLGAModal";
import { useChatUI } from "../state/ChatUIContext";

export default function ChangeLGAModalOverlay() {
  const ui = useChatUI();

  return (
    <ChangeLGAModal
      open={ui.changeLGAOpen}
      loading={false}
      lgaGroups={ui.lgaGroups}
      currentLGA={ui.currentLGA}
      onSelect={(lga) => {
        ui.setCurrentLGAById(lga.lga.id);
        ui.closeChangeLGA();

        // if active community chat doesn't exist in new LGA → go home
        if (ui.activeChat?.kind === "COMMUNITY") {
          const exists = lga.hubs.some(
            (h) => h.id === ui.activeChat?.id
          );
          if (!exists) ui.goHome();
        }
      }}
      onClose={ui.closeChangeLGA}
    />
  );
}
