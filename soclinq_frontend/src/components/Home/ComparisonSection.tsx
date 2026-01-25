// components/ComparisonSection.tsx
import React from "react";
import "@/components/Home/ComparisonSection.css";

const ComparisonSection: React.FC = () => {
  return (
    <section className="comparison-section">
      <div className="comparison-container">
        <h2 className="comparison-heading">
          Rethinking Community Safety
        </h2>
        <p className="comparison-subheading">
          See how LINQMI transforms reporting compared to traditional methods
        </p>

        <div className="comparison-grid">
          {/* Traditional Methods */}
          <div className="comparison-card traditional">
            <h3 className="comparison-card-title">Traditional Methods</h3>
            <ul className="comparison-list">
              <li>Slow response times</li>
              <li>Fear of identification</li>
              <li>Lack of data analytics</li>
            </ul>
          </div>

          {/* LINQMI Way */}
          <div className="comparison-card linqmi">
            <h3 className="comparison-card-title">The LINQMI Way</h3>
            <ul className="comparison-list">
              <li>Instant community alerts</li>
              <li>100% anonymous reporting</li>
              <li>Data-driven prevention</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
