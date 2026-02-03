"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import styles from "./styles/ProfileTabs.module.css";

import Account from "./AccountSection";
import Device from "./DeviceTrackingSection";
import Emergency from "./EmergencyContactSection";
import Activity from "./ActivityHistorySection";
import MiscellaneousSettingsSection from "./MiscellaneousSection";

import type { UserProfile } from "@/types/profile";

export type ProfileTabKey =
  | "account"
  | "device"
  | "emergency"
  | "activity"
  | "miscellaneous";

type Props = {
  tab: ProfileTabKey;
  setTab: (t: ProfileTabKey) => void;
  profile: UserProfile;

  patchProfile: (fn: (prev: UserProfile) => UserProfile) => void;
  refreshProfile: () => Promise<void>;
  refreshing?: boolean;
};

const TABS: { key: ProfileTabKey; label: string }[] = [
  { key: "account", label: "Account" },
  { key: "device", label: "Device" },
  { key: "emergency", label: "Emergency" },
  { key: "activity", label: "Activity" },
  { key: "miscellaneous", label: "Settings" },
];

export default function ProfileTabs({
  tab,
  setTab,
  profile,
  patchProfile,
  refreshProfile,
  refreshing,
}: Props) {
  const navRef = useRef<HTMLElement | null>(null);

  const tabBtnRefs = useRef<Record<ProfileTabKey, HTMLButtonElement | null>>({
    account: null,
    device: null,
    emergency: null,
    activity: null,
    miscellaneous: null,
  });

  const sectionRefs = useRef<Record<ProfileTabKey, HTMLDivElement | null>>({
    account: null,
    device: null,
    emergency: null,
    activity: null,
    miscellaneous: null,
  });

  const sectionOrder = useMemo(() => TABS.map((t) => t.key), []);

  const [indicator, setIndicator] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  const [showTop, setShowTop] = useState(false);

  // ✅ scroll to section using window scroll
  const scrollToTab = useCallback(
    (key: ProfileTabKey) => {
      const node = sectionRefs.current[key];
      if (!node) return;

      setTab(key);

      const offsetTop =
        node.getBoundingClientRect().top + window.scrollY - 100;

      window.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });
    },
    [setTab]
  );

  // ✅ scroll to top button
  const scrollToTop = useCallback(() => {
    setTab("account");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [setTab]);

  // ✅ scrollspy for window scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const best = [...entries]
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0)
          )[0];

        if (!best) return;

        const key = best.target.getAttribute("data-tab") as ProfileTabKey | null;
        if (!key) return;

        setTab(key);
      },
      {
        root: null, // ✅ window scroll
        threshold: [0.2, 0.35, 0.5, 0.65],
        rootMargin: "-20% 0px -70% 0px",
      }
    );

    sectionOrder.forEach((key) => {
      const el = sectionRefs.current[key];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sectionOrder, setTab]);

  // ✅ show scroll-to-top when far down
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ✅ underline + horizontal scroll centering
  const updateIndicator = useCallback(() => {
    const nav = navRef.current;
    const btn = tabBtnRefs.current[tab];
    if (!nav || !btn) return;

    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    const left = btnRect.left - navRect.left + nav.scrollLeft;
    const width = Math.max(2, btnRect.width);

    setIndicator({ left, width });

    const desiredScrollLeft =
      btn.offsetLeft - Math.round((nav.clientWidth - btn.clientWidth) / 2);

    nav.scrollTo({ left: desiredScrollLeft, behavior: "smooth" });
  }, [tab]);

  useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => updateIndicator());
    return () => cancelAnimationFrame(raf);
  }, [tab, updateIndicator]);

  useEffect(() => {
    const onResize = () => updateIndicator();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [updateIndicator]);

  return (
    <section className={styles.wrap}>
      {/* ✅ Sticky tab bar now sticks to window */}
      <nav ref={navRef} className={styles.tabNav} aria-label="Profile tabs">
        <span
          className={styles.indicator}
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: `${indicator.width}px`,
          }}
          aria-hidden="true"
        />

        {TABS.map((t) => {
          const active = tab === t.key;

          return (
            <button
              key={t.key}
              ref={(el) => {
                tabBtnRefs.current[t.key] = el;
              }}
              type="button"
              className={`${styles.tabBtn} ${active ? styles.active : ""}`}
              onClick={() => scrollToTab(t.key)}
              aria-current={active ? "page" : undefined}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* ===== Account ===== */}
      <div
        data-tab="account"
        ref={(el) => {
          sectionRefs.current.account = el;
        }}
        className={styles.sectionBlock}
      >
        <div className={styles.sectionTitleRow}>
          <h2 className={styles.sectionTitle}>Account</h2>
          {refreshing ? (
            <span className={styles.sectionHint}>Refreshing…</span>
          ) : null}
        </div>

        <Account
          profile={profile}
          patchProfile={patchProfile}
          refreshProfile={refreshProfile}
        />
      </div>

      {/* ===== Device ===== */}
      <div
        data-tab="device"
        ref={(el) => {
          sectionRefs.current.device = el;
        }}
        className={styles.sectionBlock}
      >
        <div className={styles.sectionTitleRow}>
          <h2 className={styles.sectionTitle}>Device & Location</h2>
        </div>

        <Device
          profile={profile}
          patchProfile={patchProfile}
          refreshProfile={refreshProfile}
        />
      </div>

      {/* ===== Emergency ===== */}
      <div
        data-tab="emergency"
        ref={(el) => {
          sectionRefs.current.emergency = el;
        }}
        className={styles.sectionBlock}
      >
        <div className={styles.sectionTitleRow}>
          <h2 className={styles.sectionTitle}>Emergency Contacts</h2>
        </div>

        <Emergency
          profile={profile}
          patchProfile={patchProfile}
          refreshProfile={refreshProfile}
        />
      </div>

      {/* ===== Activity ===== */}
      <div
        data-tab="activity"
        ref={(el) => {
          sectionRefs.current.activity = el;
        }}
        className={styles.sectionBlock}
      >
        <div className={styles.sectionTitleRow}>
          <h2 className={styles.sectionTitle}>Activity History</h2>
        </div>

        <Activity />
      </div>

      {/* ===== Settings ===== */}
      <div
        data-tab="miscellaneous"
        ref={(el) => {
          sectionRefs.current.miscellaneous = el;
        }}
        className={styles.sectionBlock}
      >
        <div className={styles.sectionTitleRow}>
          <h2 className={styles.sectionTitle}>Settings</h2>
        </div>

        <MiscellaneousSettingsSection
          profile={profile}
          patchProfile={patchProfile}
          refreshProfile={refreshProfile}
        />
      </div>

      {/* ✅ Scroll to top */}
      <button
        type="button"
        className={`${styles.scrollTopBtn} ${showTop ? styles.showTop : ""}`}
        onClick={scrollToTop}
        aria-label="Scroll to top"
      >
        ↑
      </button>
    </section>
  );
}
