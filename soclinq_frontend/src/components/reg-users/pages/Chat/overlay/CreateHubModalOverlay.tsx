"use client";

import { useState } from "react";

export default function CreateHubModalOverlay() {
  const [open, setOpen] = useState(false);

  if (!open) return null;

  return (
    <div>
      {/* Replace with your CreateHubModal */}
      Create hub modal
    </div>
  );
}
