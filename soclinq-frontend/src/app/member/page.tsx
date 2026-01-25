"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";

import Home from "@/components/reg-users/pages/Home";
import Sos from "@/components/reg-users/pages/Sos/Sos";
import Community from "@/components/reg-users/pages/Community/Community";
import Tracking from "@/components/reg-users/pages/Tracking/Tracking";
import Geo from "@/components/reg-users/pages/Geo/Geo";
import Mentorship from "@/components/reg-users/pages/Mentorship/Mentorship";
import Profile from "@/components/reg-users/pages/Profile/Profile";

import {
  MdHome,
  MdWarning,
  MdPeople,
  MdLocationOn,
  MdTrackChanges,
  MdSupportAgent,
  MdMenu,
  MdClose,
  MdPerson,
} from "react-icons/md";

import styles from "./page.module.css";
import AppHeader from "@/components/reg-users/pages/Header/Header";

/* ================= TYPES ================= */

export type Tab =
  | "home"
  | "sos"
  | "community"
  | "tracking"
  | "geo"
  | "mentorship"
  | "profile";

/* ================= CONSTANTS ================= */

const TAB_KEY = "linqmi_active_tab";

const ALL_TABS: Tab[] = [
  "home",
  "sos",
  "community",
  "tracking",
  "geo",
  "mentorship",
  "profile",
];

function isValidTab(tab: string | null): tab is Tab {
  return ALL_TABS.includes(tab as Tab);
}

/* ================= COMPONENT ================= */

export default function Page() {
  const router = useRouter();

  /* ================= STATE ================= */

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "home";

    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("tab");
    if (isValidTab(fromUrl)) return fromUrl;

    const fromStorage = localStorage.getItem(TAB_KEY);
    if (isValidTab(fromStorage)) return fromStorage;

    return "home";
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const alerts = 2;

  /* ================= TAB HISTORY ================= */

  const tabHistoryRef = useRef<Tab[]>([]);

  const navigateTab = (next: Tab) => {
    setActiveTab(current => {
      if (current !== next) {
        tabHistoryRef.current.push(current);

        const url = new URL(window.location.href);
        url.searchParams.set("tab", next);

        window.history.pushState({ tab: next }, "", url);
        localStorage.setItem(TAB_KEY, next);
      }
      return next;
    });
  };

  /* ================= BACK BUTTON HANDLING ================= */

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tabFromUrl = params.get("tab");

      if (isValidTab(tabFromUrl)) {
        setActiveTab(tabFromUrl);
        return;
      }

      if (tabHistoryRef.current.length > 0) {
        const prevTab = tabHistoryRef.current.pop()!;
        setActiveTab(prevTab);
        return;
      }

      router.back(); // fallback to browser back
    };

    window.addEventListener("popstate", handlePopState);
    return () =>
      window.removeEventListener("popstate", handlePopState);
  }, [router]);

  /* ================= NAV ITEMS ================= */

  const navItems: {
    id: Tab;
    label: string;
    icon: any;
    danger?: boolean;
  }[] = [
    { id: "home", label: "Home", icon: MdHome },
    { id: "sos", label: "SOS", icon: MdWarning, danger: true },
    { id: "community", label: "Community", icon: MdPeople },
    { id: "tracking", label: "Tracking", icon: MdTrackChanges },
    { id: "geo", label: "Nearby Alerts", icon: MdLocationOn },
    { id: "mentorship", label: "Mentorship", icon: MdSupportAgent },
  ];

  /* ================= CONTENT ================= */

  const renderContent = () => {
    switch (activeTab) {
      case "sos":
        return <Sos />;
      case "community":
        return <Community />;
      case "tracking":
        return <Tracking />;
      case "geo":
        return <Geo />;
      case "mentorship":
        return <Mentorship />;
      case "profile":
        return <Profile />;
      default:
        return <Home />;
    }
  };

  /* ================= RENDER ================= */

  return (
    <>
      <div className={styles.wrapper}>
        {/* ================= DESKTOP SIDEBAR ================= */}
        <aside
          className={[
            styles.sidebar,
            sidebarCollapsed && styles.sidebarCollapsed,
          ].join(" ")}
        >
          <div className={styles.sidebarHeader}>
            <div className={styles.brand}>
              <button
                className={styles.collapseBtn}
                onClick={() =>
                  setSidebarCollapsed(prev => !prev)
                }
              >
                {sidebarCollapsed ? (
                  <MdMenu size={22} />
                ) : (
                  <MdClose size={22} />
                )}
              </button>

              {!sidebarCollapsed && (
                <span className={styles.logoText}>
                  LINQ<span>MI</span>
                </span>
              )}
            </div>
          </div>

          <nav className={styles.nav}>
            {navItems.map(({ id, label, icon: Icon, danger }) => (
              <button
                key={id}
                onClick={() => {
                  navigateTab(id);
                  setDrawerOpen(false);
                }}
                className={[
                  styles.navItem,
                  activeTab === id && styles.active,
                  danger && styles.danger,
                ].join(" ")}
              >
                <Icon size={18} />
                {!sidebarCollapsed && <span>{label}</span>}
              </button>
            ))}
          </nav>
        </aside>

        {/* ================= MOBILE DRAWER ================= */}
        {drawerOpen && (
          <div
            className={styles.drawerOverlay}
            onClick={() => setDrawerOpen(false)}
          >
            <aside
              className={styles.drawer}
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.drawerHeader}>
                <span className={styles.logoText}>
                  LINQ<span>MI</span>
                </span>
                <button
                  className={styles.collapseBtn}
                  onClick={() => setDrawerOpen(false)}
                >
                  <MdClose size={22} />
                </button>
              </div>

              {navItems.map(({ id, label, icon: Icon, danger }) => (
                <button
                  key={id}
                  onClick={() => {
                    navigateTab(id);
                    setDrawerOpen(false);
                  }}
                  className={[
                    styles.drawerItem,
                    activeTab === id && styles.active,
                    danger && styles.drawerDanger,
                  ].join(" ")}                  
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </aside>
          </div>
        )}

        {/* ================= MAIN ================= */}
        <main className={styles.main}>
          <AppHeader
            activeTab={activeTab}
            setActiveTab={navigateTab}
            sidebarCollapsed={sidebarCollapsed}
            setDrawerOpen={setDrawerOpen}
            alerts={alerts}
            activeId={activeId}
            setActiveId={setActiveId}
          />

          <section className={styles.content}>
            {renderContent()}
          </section>

          <footer className={styles.footer}>
            <span>© LINQMI</span>
            <span>Your safety matters</span>
          </footer>
        </main>
      </div>

      {/* ================= MOBILE BOTTOM NAV ================= */}
      <div className={styles.bottomNav}>
        {navItems.map(({ id, icon: Icon, danger }) => (
          <button
            key={id}
            onClick={() => navigateTab(id)}
            className={[
              styles.drawerItem,
              activeTab === id && styles.active,
              danger && styles.drawerDanger,
            ].join(" ")}
            
          >
            <Icon size={22} />
          </button>
        ))}
      </div>
    </>
  );
}
