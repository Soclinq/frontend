"use client";

import { useEffect, useRef, useState } from "react";
import {
  FaDownload,
  FaPlayCircle,
  FaFlag,
  FaExclamationTriangle,
  FaPeopleArrows,
  FaUserSecret,
  FaBell,
} from "react-icons/fa";

import "./Hero.css";

const SLIDES = [
  {
    title: "Linking Communities for Public Safety",
    text:
      "Connecting citizens, NGOs, and agencies to enhance safety and prevent crime.",
    bg: "https://soclinqglobaltech.com/wp-content/uploads/2025/09/slide-1.png",
    illusIcon: <FaPeopleArrows />,
    illusText: "Community-powered safety, smarter coordination.",
    ctas: [
      { icon: <FaDownload />, label: "Download LINQMI App", type: "primary" },
      { icon: <FaPlayCircle />, label: "Watch Demo", type: "secondary" },
    ],
  },
  {
    title: "Report Crime Easily",
    text:
      "Send anonymous or direct crime reports with instant alerts to authorities.",
    bg: "https://soclinqglobaltech.com/wp-content/uploads/2025/09/slide-2.png",
    illusIcon: <FaUserSecret />,
    illusText: "Anonymous mode respected and protected.",
    ctas: [{ icon: <FaFlag />, label: "Report Now", type: "primary" }],
  },
  {
    title: "Emergency SOS",
    text:
      "One-click SOS alerts for emergencies — notify community and agencies fast.",
    bg: "https://soclinqglobaltech.com/wp-content/uploads/2025/09/slide-3.png",
    illusIcon: <FaBell />,
    illusText: "High-priority alerts with instant reach.",
    ctas: [
      {
        icon: <FaExclamationTriangle />,
        label: "Trigger SOS",
        type: "primary",
      },
    ],
  },
];

const AUTO_DELAY = 6000;
const SWIPE_THRESHOLD = 60;

export default function Hero() {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startX = useRef<number | null>(null);

  /* ---------------- Auto slide (with reset) ---------------- */
  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, AUTO_DELAY);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    startTimer();
    return stopTimer;
  }, []);

  /* ---------------- Manual navigation ---------------- */
  const goTo = (i: number) => {
    setIndex(i);
    startTimer(); // 🔥 reset timing
  };

  const next = () => goTo((index + 1) % SLIDES.length);
  const prev = () => goTo((index - 1 + SLIDES.length) % SLIDES.length);

  /* ---------------- Swipe handlers ---------------- */
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null) return;

    const diff = startX.current - e.changedTouches[0].clientX;

    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      diff > 0 ? next() : prev();
    }

    startX.current = null;
  };

  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label="Highlights"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="slides">
        {SLIDES.map((slide, i) => (
          <div
            key={i}
            className={`slide ${i === index ? "active" : ""}`}
          >
            <div className="slide-content">
              {/* TEXT */}
              <div className="slide-text">
                <h1>{slide.title}</h1>
                <p>{slide.text}</p>

                <div className="cta">
                  {slide.ctas.map((cta, c) => (
                    <button key={c} className={`btn ${cta.type}`}>
                      {cta.icon}
                      <span>{cta.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ILLUSTRATION CARD (MISSING PART — NOW INCLUDED ✅) */}
              <div className="slide-illus">
                <div className="card">
                  {slide.illusIcon}
                  <div>{slide.illusText}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* DOTS */}
      <div className="dots" role="tablist" aria-label="Slide dots">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={`dot ${i === index ? "active" : ""}`}
            aria-label={`Slide ${i + 1}`}
            onClick={() => goTo(i)} // 🔥 resets timer
          />
        ))}
      </div>
    </section>
  );
}
