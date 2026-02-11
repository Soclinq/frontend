"use client";

import CreateHubModal from "../components/CreateHubModal";
import { useChatUI } from "../state/ChatUIContext";

export default function CreateHubModalOverlay() {
  const ui = useChatUI();

  if (!ui.createHubOpen) return null;

  return (
    <CreateHubModal
      open={ui.createHubOpen}
      currentLGA={ui.currentLGA as any}
      creating={ui.creatingHub}
      onClose={ui.closeCreateHub}
      onSubmit={async (payload) => {
        await ui.createHub(payload);
        ui.closeCreateHub();
      }}
    />
  );
}
