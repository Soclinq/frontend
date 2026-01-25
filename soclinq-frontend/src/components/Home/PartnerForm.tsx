"use client";

import { FaTimes } from "react-icons/fa";
import "./PartnerForm.css";

type PartnerFormProps = {
  open: boolean;
  onClose: () => void;
};

export default function PartnerForm({ open, onClose }: PartnerFormProps) {
  if (!open) return null; // 🔥 REQUIRED for modal behavior

  return (
    <div className="pf-overlay" onClick={onClose}>
      <div
        className="pf-card modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pf-title"
      >
        {/* Close button */}
        <button
          className="pf-close"
          onClick={onClose}
          aria-label="Close partner form"
        >
          <FaTimes />
        </button>

        <h3 id="pf-title" className="pf-title">
          Partnership Form
        </h3>

        <p className="pf-subtitle">
          Join SocLinq Global Tech in building safer, more connected communities
          worldwide.
        </p>

        <form className="pf-form" noValidate>
          {/* Name */}
          <div className="pf-field">
            <label htmlFor="pf-name">
              Full Name / Organisation Name <span className="pf-req">*</span>
            </label>
            <input
              id="pf-name"
              name="name"
              type="text"
              placeholder="Your name or organisation"
              required
            />
            <span className="pf-error">
              Please enter a name or organisation.
            </span>
          </div>

          {/* Email */}
          <div className="pf-field">
            <label htmlFor="pf-email">
              Email Address <span className="pf-req">*</span>
            </label>
            <input
              id="pf-email"
              name="email"
              type="email"
              placeholder="Your email"
              required
            />
            <span className="pf-error">Please enter a valid email.</span>
          </div>

          {/* Phone */}
          <div className="pf-field">
            <label htmlFor="pf-phone">Phone Number</label>
            <input
              id="pf-phone"
              name="phone"
              type="tel"
              placeholder="Your phone number"
            />
          </div>

          {/* Partnership type */}
          <div className="pf-field">
            <label htmlFor="pf-type">
              Type of Partnership <span className="pf-req">*</span>
            </label>
            <div className="pf-select">
              <select id="pf-type" name="type" required>
                <option value="">Select type</option>
                <option>Individual</option>
                <option>NGO / Non-Profit</option>
                <option>Government Agency</option>
                <option>Corporate / Business</option>
                <option>Academic / Research Institution</option>
                <option>Other</option>
              </select>
            </div>
            <span className="pf-error">
              Please choose a partnership type.
            </span>
          </div>

          {/* Country */}
          <div className="pf-field">
            <label htmlFor="pf-country">
              Country / Location <span className="pf-req">*</span>
            </label>
            <input
              id="pf-country"
              name="country"
              type="text"
              placeholder="Your country or location"
              required
            />
            <span className="pf-error">
              Please enter your country or location.
            </span>
          </div>

          {/* Areas */}
          <div className="pf-field">
            <label>Area of Interest</label>
            <div className="pf-pills">
              {[
                "Reporting & Community Safety",
                "Travel Safety",
                "Device Tracking",
                "Education Hub",
                "Criminology Hub",
                "General Collaboration",
              ].map((label) => (
                <label key={label} className="pf-pill">
                  <input type="checkbox" name="areas" value={label} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="pf-field">
            <label htmlFor="pf-message">Message / Proposal</label>
            <textarea
              id="pf-message"
              name="message"
              rows={4}
              placeholder="Please share how you would like to partner with us"
            />
          </div>

          {/* Contact method */}
          <div className="pf-field">
            <label htmlFor="pf-contact">Preferred Mode of Contact</label>
            <div className="pf-select">
              <select id="pf-contact" name="contact">
                <option>Email</option>
                <option>Phone</option>
                <option>Virtual Meeting</option>
              </select>
            </div>
          </div>

          <button type="submit" className="pf-btn">
            Become a Partner
          </button>

          <p className="pf-note">
            By submitting this form, you agree that your information may be used
            to contact you about partnership opportunities.
          </p>

          <p className="pf-contacts">
            <strong>Call & SMS:</strong> +2348082428549 &nbsp;|&nbsp;
            <strong> WhatsApp:</strong> +2347079186018
          </p>
        </form>
      </div>
    </div>
  );
}
