
import React, { useState } from "react";
import {
  FaUserSecret,
  FaUsers,
  FaRoute,
  FaGraduationCap,
  FaBalanceScale,
  FaMobileAlt,
} from "react-icons/fa";

import "./AboutUs.css"
const AboutUs: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    e.currentTarget.reset();
  };

  return (
    <main className="about-us">

      {/* Hero */}
      <section className="about-us__hero">
        <h1 className="about-us__title">About Soclinq Global Tech</h1>
        <p className="about-us__subtitle">
          Redefining public safety through civic-tech, empowering citizens,
          communities, and institutions to build a safer world together.
        </p>
      </section>

      {/* About Us */}
      <section className="about-us__section">
        <h2 className="about-us__heading">About Us</h2>

        <p>
          At SocLinq Global Tech, we believe safety is more than protection — it
          is the heartbeat of every thriving community.
        </p>

        <p>
          Through the power of civic-tech, we are rewriting what it means to
          protect and serve in a digital age. Our flagship platform, Linqmi, is
          not just technology — it is a lifeline of trust.
        </p>

        <ul className="about-us__list">
          <li>Equipping young people with courage and safety skills</li>
          <li>Rebuilding a culture of reporting</li>
          <li>Reuniting lost devices and missing persons</li>
          <li>Making journeys safer</li>
          <li>Creating a global criminology hub</li>
        </ul>

        <p>
          Technology must serve humanity. Safety is not a privilege — it is a
          right.
        </p>
      </section>

      {/* Mission */}
      <section className="about-us__section">
        <h2 className="about-us__heading">Our Mission</h2>
        <p>
          Our mission is to reimagine public safety as a shared strength that
          empowers every voice, protects every life, and unites every community.
        </p>
      </section>

      {/* Our Story */}
      <section className="about-us__section">
        <h2 className="about-us__heading">Our Story</h2>

        <p>
          SocLinq Global Tech was founded by{" "}
          <strong>Seza Samuel Tsav</strong> and{" "}
          <strong>Sahilah Ain Sathakathulla</strong> with a shared belief that
          safety is a right, not a privilege.
        </p>

        <p>
          While our roots are in Nigeria, our vision is global — to build a
          safer, more connected world.
        </p>
      </section>

      {/* What We Do */}
      <section className="about-us__section">
        <h2 className="about-us__heading">What We Do</h2>

        <ul className="about-us__features">
          <li>
            <FaUserSecret aria-hidden />
            <span> Secure crime and incident reporting</span>
          </li>

          <li>
            <FaUsers aria-hidden />
            <span> Community safety and collaboration</span>
          </li>

          <li>
            <FaRoute aria-hidden />
            <span> Travel safety alerts (coming soon)</span>
          </li>

          <li>
            <FaGraduationCap aria-hidden />
            <span> Public safety education (coming soon)</span>
          </li>

          <li>
            <FaBalanceScale aria-hidden />
            <span> Criminology research hub (coming soon)</span>
          </li>

          <li>
            <FaMobileAlt aria-hidden />
            <span> Lost and stolen device tracking (coming soon)</span>
          </li>
        </ul>
      </section>

      {/* Join Us */}
      <section className="about-us__section about-us__cta">
        <h2 className="about-us__heading">Join Us</h2>
        <p>
          Join the Linqmi community today — share your stories and help make our
          communities safer.
        </p>
        <button type="button" className="about-us__button">
          Become a Member
        </button>
      </section>

      {/* Partnership */}
      <section className="about-us__section">
        <h2 className="about-us__heading">Partner With Us</h2>

        <p>
          We welcome partnerships with individuals, NGOs, governments, and
          organisations worldwide.
        </p>

        <form className="about-us__form" onSubmit={handleSubmit}>
          <label>
            Full Name / Organisation Name
            <input type="text" required />
          </label>

          <label>
            Email Address
            <input type="email" required />
          </label>

          <label>
            Phone Number
            <input type="tel" />
          </label>

          <label>
            Country / Location
            <input type="text" required />
          </label>

          <label>
            Message / Proposal
            <textarea />
          </label>

          <button type="submit" className="about-us__button">
            Become a Partner
          </button>

          {submitted && (
            <p className="about-us__success">
              Thank you for reaching out! Our team will contact you shortly.
            </p>
          )}
        </form>

        <p className="about-us__contact">
          <strong>Call & SMS:</strong> +2348082428549 <br />
          <strong>WhatsApp:</strong> +2347079186018
        </p>
      </section>

    </main>
  );
};

export default AboutUs;
