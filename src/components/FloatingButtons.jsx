import React from "react";
import { FaWhatsapp, FaInstagram, FaTiktok } from "react-icons/fa";
import './FloatingButtons.css';

export default function FloatingButtons() {
  return (
    <div className="floating-buttons-container">
      {/* WhatsApp primero arriba */}
      <a
        href="https://wa.me/573113987975"
        target="_blank"
        rel="noopener noreferrer"
        className="floating-button whatsapp"
      >
        <FaWhatsapp size={30} />
      </a>

      {/* Instagram */}
      <a
        href="https://instagram.com/tooshopper"
        target="_blank"
        rel="noopener noreferrer"
        className="floating-button instagram"
      >
        <FaInstagram size={30} />
      </a>

      {/* TikTok */}
      <a
        href="https://www.tiktok.com/@tooshopper"
        target="_blank"
        rel="noopener noreferrer"
        className="floating-button tiktok"
      >
        <FaTiktok size={30} />
      </a>
    </div>
  );
}
