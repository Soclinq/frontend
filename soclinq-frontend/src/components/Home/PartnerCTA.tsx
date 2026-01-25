"use client";

import { useState } from "react";
import { FaHandshake, FaWhatsapp } from "react-icons/fa";
import PartnerForm from "./PartnerForm";
import "./PartnerCTA.css";

export default function PartnerCTA() {
  const [partnerOpen, setPartnerOpen] = useState(false);

  return (
    <>
      <section className="section partner">
        <div className="container">
          <h2 className="section-title">Partner With Us</h2>

          <p className="muted" style={{ maxWidth: 780 }}>
            Partner with Soclinq Global Tech Ltd to empower communities,
            strengthen safety, and build trust.
          </p>

          <div className="cta-row">
            <button
              className="btn primary"
              onClick={() => setPartnerOpen(true)}
            >
              <FaHandshake />
              Partner With Us
            </button>


                <button
                  type="button"
                  className="pf-whatsapp-btn"
                  onClick={() =>
                    window.open(
                      "https://wa.me/2348082428549?text=Hello%20Soclinq%20Team",
                      "_blank"
                    )
                  }
                  aria-label="Chat with Soclinq on WhatsApp"
                >
                  <FaWhatsapp/> WhatsApp
                </button>

          </div>
        </div>
      </section>

      <PartnerForm open={partnerOpen} onClose={() => setPartnerOpen(false)} />
    </>
  );
}
