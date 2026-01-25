export function haptic(
    type: "light" | "medium" | "heavy" = "medium"
  ) {
    if (!("vibrate" in navigator)) return;
  
    const pattern =
      type === "light"
        ? [10]
        : type === "medium"
        ? [30]
        : [60, 40, 60];
  
    navigator.vibrate(pattern);
  }
  