import './Footer.css';
import { FaFacebookF, FaInstagram, FaWhatsapp, FaTiktok } from 'react-icons/fa';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        
        <div className="footer-section">
          <h2>Nuestra Tienda</h2>
          <p>Ofrecemos productos de calidad con amor y dedicación. ¡Gracias por visitarnos!</p>
        </div>

        <div className="footer-section">
          <h2>Navegación</h2>
          <ul>
            <li><a href="#">Inicio</a></li>
            <li><a href="#">Productos</a></li>
            <li><a href="#">Nosotros</a></li>
            <li><a href="#">Contacto</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h2>Síguenos</h2>
          <div className="social-icons">
            <a href="https://wa.me/573113987975" target="_blank" rel="noopener noreferrer"><FaWhatsapp /></a>
            <a href="https://instagram.com/tooshopper" target="_blank" rel="noopener noreferrer"><FaInstagram /></a>
            <a href="https://facebook.com/share/1F7JVUFnN9/" target="_blank" rel="noopener noreferrer"><FaFacebookF /></a>
            <a href="https://tiktok.com/@tooshopper" target="_blank" rel="noopener noreferrer"><FaTiktok /></a>
          </div>
        </div>

      </div>
      <div className="footer-bottom">
        © {new Date().getFullYear()} CodeBrand. Todos los derechos reservados.
      </div>
    </footer>
  );
}

export default Footer;
