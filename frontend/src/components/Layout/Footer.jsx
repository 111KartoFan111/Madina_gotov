import React from 'react';
import '../../styles/Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <p>&copy; {currentYear} NutriTrack. Барлық құқықтар қорғалған.</p>
      </div>
    </footer>
  );
};

export default Footer;