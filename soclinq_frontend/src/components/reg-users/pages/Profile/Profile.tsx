"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MdArrowBack } from "react-icons/md";

import { useUser } from "@/context/UserContext";
import ProfileHeader from "./ProfileHeader";
import ProfileTabs from "./ProfileTabs";
import styles from "./styles/Profile.module.css";
import DeviceTrackingSection from "./DeviceTrackingSection";
import AccountSection from "./AccountSection";
import EmergencyContactsSection from "./EmergencyContactSection";
import ActivityHistorySection from "./ActivityHistorySection";
export default function Profile() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [tab, setTab] = useState("account");

  if (loading) {
    return <p className={styles.loading}>Loading profile…</p>;
  }

//   if (!user) {
//     return <p className={styles.loading}>No user session found.</p>;
//   }

  return (
    <section className={styles.profile}>
      <button
        className={styles.backBtn}
        onClick={() => router.back()}
        aria-label="Go back"
      >
        <MdArrowBack />
        Back
      </button>

      <ProfileHeader />
      <AccountSection />
      <EmergencyContactsSection />
      <ActivityHistorySection />
      <DeviceTrackingSection />
    </section>
  );
}
