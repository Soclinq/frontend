import { useEffect, useState } from "react";

export function useProfile() {
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState({
    name: "User Name",
    email: "user@email.com",
    photo: null as string | null,
    trackingEnabled: true,
    locationEnabled: true,
    emergencyContacts: [
      { id: "1", name: "John Doe", phone: "+234800000000" },
    ],
    activity: [
      { id: "1", action: "Logged in", time: "2 mins ago" },
      { id: "2", action: "Location shared", time: "10 mins ago" },
    ],
  });

  /* PLACEHOLDER FETCH */
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return {
    loading,
    profile,
    setProfile,
  };
}
