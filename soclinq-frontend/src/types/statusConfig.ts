// statusConfig.ts
import {
    FiShield,
    FiMapPin,
    FiUsers,
    FiNavigation,
    FiAlertTriangle,
  } from "react-icons/fi";
  
  export const STATUS_CONFIG = {
    safe: {
      label: "Status",
      icon: FiShield,
      color: "var(--green)",
      note: "You are currently marked as safe.",
    },
    location_on: {
      label: "Location",
      icon: FiMapPin,
      color: "var(--blue)",
      note: "Your location services are enabled.",
    },
    community_active: {
      label: "Community",
      icon: FiUsers,
      color: "var(--purple)",
      note: "You are active in your community.",
    },
    tracking_enabled: {
      label: "Tracking",
      icon: FiNavigation,
      color: "var(--orange)",
      note: "Live tracking is currently enabled.",
    },
    warning: {
      label: "Alert",
      icon: FiAlertTriangle,
      color: "var(--yellow)",
      note: "Attention required. Check details.",
    },
  } as const;
  