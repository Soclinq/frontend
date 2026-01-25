"use client";

export default function SosPopup() {
  return (
    <div
      className="popup"
      id="popup"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sos-title"
      aria-describedby="sos-desc"
    >
      <div className="popup-content">
        <h2 id="sos-title">
          <i className="fas fa-exclamation-triangle"></i> Emergency SOS
        </h2>
        <p id="sos-desc">
          With Linqmi, you can send real-time distress alerts to your community
          and agencies instantly.
        </p>
        <div className="cta">
          <button className="btn trigger" type="button">
            <i className="fa-solid fa-bolt"></i> Trigger SOS (Demo)
          </button>
          <button className="btn close" type="button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
