"use client";

import { useState } from "react";
import {
  FaUsers,
  FaBullhorn,
  FaMobileAlt,
  FaUserSecret,
  FaGraduationCap,
  FaRoute,
  FaMicroscope,
  FaArrowRight,
} from "react-icons/fa";

import "./Features.css"
type Feature = {
  id: number;
  title: string;
  description: string;
  icon: JSX.Element;
  link?: string;
};

const FEATURES: Feature[] = [
  {
    id: 1,
    title: "Community Hub",
    description:
      "A centralized space where citizens, community leaders, and organizations collaborate to share safety updates and insights.",
    icon: <FaUsers />,
    link: "/community",
  },
  {
    id: 2,
    title: "Emergency SOS",
    description:
      "Instant SOS alerts sent to nearby community members and emergency agencies during critical situations.",
    icon: <FaBullhorn />,
    link: "/sos",
  },
  {
    id: 3,
    title: "Device Tracking",
    description:
      "Track registered devices securely to aid recovery and enhance public safety coordination.",
    icon: <FaMobileAlt />,
  },
  {
    id: 4,
    title: "Anonymous Reporting",
    description:
      "Report incidents anonymously while maintaining privacy and data protection.",
    icon: <FaUserSecret />,
  },
  {
    id: 5,
    title: "Education Hub",
    description:
      "Learning resources and public safety education for communities and institutions. (Coming soon)",
    icon: <FaGraduationCap />,
  },
  {
    id: 6,
    title: "Travel Safety",
    description:
      "Location-aware alerts and travel guidance to help citizens stay safe on the move. (Coming soon)",
    icon: <FaRoute />,
  },
  {
    id: 7,
    title: "Criminology Hub",
    description:
      "Research-driven insights and crime pattern analysis for professionals and policymakers. (Coming soon)",
    icon: <FaMicroscope />,
  },
];

export default function Features(): JSX.Element {
  const [flipped, setFlipped] = useState<number | null>(null);

  const toggleFlip = (id: number) => {
    setFlipped((prev) => (prev === id ? null : id));
  };

  return (
    <section className="section">
      <div className="container">
        <h2 className="section-title">Core Features</h2>

        <div className="features" role="list">
          {FEATURES.map((feature) => {
            const isFlipped = flipped === feature.id;

            return (
              <button
                key={feature.id}
                role="listitem"
                className={`feature-card ${isFlipped ? "flipped" : ""}`}
                onClick={() => toggleFlip(feature.id)}
                aria-pressed={isFlipped}
              >
                <div className="feature-inner">
                  {/* FRONT */}
                  <div className="feature-front">
                    <span className="feature-icon">{feature.icon}</span>
                    <h3>{feature.title}</h3>
                  </div>

                  {/* BACK */}
                  <div className="feature-back">
                    <p>{feature.description}</p>

                    {feature.link && (
                      <a
                        href={feature.link}
                        className="feature-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Learn more <FaArrowRight />
                      </a>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
