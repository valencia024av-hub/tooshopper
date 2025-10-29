import './PromoBanner.css';
import banner from '../assets/banner.jpg'; // Puedes cambiarlo por la imagen real luego

function PromoBanner() {
  return (
    <section className="promo-banner">
      <img src={banner} alt="Colección nueva" className="promo-image" />
      <div className="promo-content">
        <h2>Productos nuevos 2025</h2>
        <p>Descubre los estilos que están marcando tendencia esta temporada.</p>
        <button>Explorar colección</button>
      </div>
    </section>
  );
}

export default PromoBanner;
