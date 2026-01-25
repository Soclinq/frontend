"use client";

import { useEffect, useRef, useState } from "react";
import NotificationDropdown from "./NotificationDropdown";
import ProfileDropdown from "./ProfileDropdown";
import {
  MdMenu,
  MdMoreVert,
} from "react-icons/md";
import {
  FiShield,
  FiMapPin,
  FiUsers,
  FiNavigation,
} from "react-icons/fi";

import type { Tab } from "@/app/member/page"
import UserStat from "./UserStat";
import styles from "./styles/AppHeader.module.css";

interface AppHeaderProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  sidebarCollapsed: boolean;
  setDrawerOpen: (v: boolean) => void;
  alerts: number;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
}


export default function AppHeader({
  activeTab,
  sidebarCollapsed,
  setActiveTab, // ✅ ADD THIS
  setDrawerOpen,
  alerts,
  activeId,
  setActiveId,
}: AppHeaderProps) {
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [statsOpen, setStatsOpen] = useState(false);
  const statsRef = useRef<HTMLDivElement | null>(null);

  const navigate = (tab: Tab) => {
    setActiveTab(tab);
    setActiveId(null);
    setDrawerOpen(false);
  };
  
  /* ================= SCROLL BEHAVIOR ================= */
  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;

      if (current < 20) setShowHeader(true);
      else if (current > lastScrollY) setShowHeader(false);
      else setShowHeader(true);

      setLastScrollY(current);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastScrollY]);

  /* ================= CLOSE DROPDOWN ON OUTSIDE CLICK ================= */
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (
        statsRef.current &&
        !statsRef.current.contains(e.target as Node)
      ) {
        setStatsOpen(false);
      }
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header
      className={`${styles.header} ${
        !showHeader ? styles.hidden : ""
      }`}
    >
      <div className={styles.inner}>
        {/* ================= LEFT ================= */}
        <div>
          <button
            className={styles.menuBtn}
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <MdMenu size={22} />
          </button>

          {/* {!sidebarCollapsed && (
            <h2 className={styles.title}>{activeTab}</h2>
          )} */}
        </div>

        {/* ================= RIGHT ================= */}
        <div className={styles.right}>
          {/* ===== DESKTOP STATS ===== */}
          <div className={styles.statsDesktop}>
            <UserStat
              id="status"
              label="Safe"
              icon={FiShield}
              color="var(--green)"
              activeId={activeId}
              setActiveId={setActiveId}
            />
            <UserStat
              id="location"
              label="Location"
              icon={FiMapPin}
              color="var(--blue)"
              activeId={activeId}
              setActiveId={setActiveId}
            />
            <UserStat
              id="community"
              label="Community"
              icon={FiUsers}
              color="var(--purple)"
              activeId={activeId}
              setActiveId={setActiveId}
            />
            <UserStat
              id="tracking"
              label="Tracking"
              icon={FiNavigation}
              color="var(--orange)"
              activeId={activeId}
              setActiveId={setActiveId}
            />
          </div>

          {/* ===== MOBILE STATS DROPDOWN ===== */}
          <div className={styles.statsMobile} ref={statsRef}>
  
            {statsOpen && (
              <div className={styles.statsDropdown}>
                <UserStat
                  id="status"
                  label="Safe"
                  icon={FiShield}
                  color="var(--green)"
                  activeId={activeId}
                  setActiveId={setActiveId}
                />
                <UserStat
                  id="location"
                  label="Location"
                  icon={FiMapPin}
                  color="var(--blue)"
                  activeId={activeId}
                  setActiveId={setActiveId}
                />
                <UserStat
                  id="community"
                  label="Community"
                  icon={FiUsers}
                  color="var(--purple)"
                  activeId={activeId}
                  setActiveId={setActiveId}
                />
                <UserStat
                  id="tracking"
                  label="Tracking"
                  icon={FiNavigation}
                  color="var(--orange)"
                  activeId={activeId}
                  setActiveId={setActiveId}
                />
              </div>
            )}
          </div>

          {/* ===== ICON GROUP ===== */}
          <div className={styles.subGroup}>
          <button
              className={styles.iconBtn}
              aria-label="Open stats"
              onClick={() => setStatsOpen((v) => !v)}
            >
              <MdMoreVert size={20} />
            </button>

          <NotificationDropdown alerts={alerts} />
          <ProfileDropdown
            onProfile={() => navigate("profile")}
          />
          </div>
        </div>
      </div>
    </header>
  );
}
