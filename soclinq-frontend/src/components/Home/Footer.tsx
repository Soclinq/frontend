"use client";

import {
  FaFacebookF,
  FaTwitter,
  FaLinkedinIn,
  FaEnvelope,
} from "react-icons/fa";

import "./Footer.css"
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        {/* Brand */}
        <div className="footer-brand">
          <img
            src="https://soclinqglobaltech.com/wp-content/uploads/2025/09/logo.png"
            alt="LINQMI Logo"
            className="footer-logo"
          />
          <p className="footer-desc">
            LINQMI empowers communities with safety, trust, and innovative
            digital solutions.
          </p>
        </div>

        {/* Links */}
        <div>
          <h4>Quick Links</h4>
          <a href="#">Home</a>
          <a href="#">Features</a>
          <a href="#">NGO / Government</a>
        </div>

        <div>
          <h4>Policy</h4>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Use</a>
        </div>

        <div>
          <h4>Support</h4>
          <a href="#">Help Center</a>
          <a href="#">Contact Us</a>
        </div>

        {/* Social */}
        <div>
          <h4>Follow Us</h4>
          <div className="social-icons">
            <a href="#" aria-label="Facebook">
              <FaFacebookF />
            </a>
            <a href="#" aria-label="Twitter">
              <FaTwitter />
            </a>
            <a href="#" aria-label="LinkedIn">
              <FaLinkedinIn />
            </a>
            <a href="#" aria-label="Email">
              <FaEnvelope />
            </a>
          </div>
        </div>
      </div>

      <div className="subfooter">
        © {new Date().getFullYear()} LINQMI. All rights reserved.
      </div>
    </footer>
  );
}
