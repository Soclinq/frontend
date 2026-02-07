"use client";

import { useState } from "react";
import ChangeLGAModal from "../ChangeLGAModal";
import { useChatUI } from "../state/ChatUIContext";
import type { LGAGroupBlock } from "../GroupsContainer";

export default function ChangeLGAModalOverlay() {
  const ui = useChatUI();
  const [open, setOpen] = useState(false);
  const [lgaGroups, setLgaGroups] = useState<LGAGroupBlock[]>([]);
  const [currentLGA, setCurrentLGA] = useState<LGAGroupBlock | null>(null);

  return (
    <ChangeLGAModal
      open={open}
      loading={false}
      lgaGroups={lgaGroups}
      currentLGA={currentLGA}
      onSelect={(lga) => {
        setCurrentLGA(lga);
        setOpen(false);

        // if active community chat doesn't exist in new LGA → go home
        if (ui.activeChat?.kind === "COMMUNITY") {
          const exists = lga.hubs.some(
            (h) => h.id === ui.activeChat?.id
          );
          if (!exists) ui.goHome();
        }
      }}
      onClose={() => setOpen(false)}
    />
  );
}
