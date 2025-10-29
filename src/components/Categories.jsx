// src/components/Categories.jsx
import { Link } from "react-router-dom";
import "./Categories.css";

function Categories() {
  return (
    <section id="categories" className="categories" aria-labelledby="categories-title">
      <h2 id="categories-title" className="categories-title">Categorías</h2>

      <div className="categories-row">
        <Link to="/mujer" className="category" aria-label="Ver categoría Mujer">
          <img
            src="/mujer.jpg"
            alt="Categoría Mujer"
            loading="lazy"
            width="600"
            height="800"
          />
          <div className="overlay">
            Mujer
            <span className="badge-prox">Próx.</span>
          </div>
        </Link>

        <Link to="/hombre" className="category" aria-label="Ver categoría Hombre">
          <img
            src="/hombre.jpg"
            alt="Categoría Hombre"
            loading="lazy"
            width="600"
            height="800"
          />
          <div className="overlay">Hombre</div>
        </Link>

        <Link to="/sale" className="category" aria-label="Ver ofertas">
          <img
            src="/sale.jpg"
            alt="Categoría SALE"
            loading="lazy"
            width="600"
            height="800"
          />
          <div className="overlay">SALE</div>
        </Link>
      </div>
    </section>
  );
}

export default Categories;
