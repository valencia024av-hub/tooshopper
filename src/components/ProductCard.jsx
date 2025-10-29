import { useState } from "react";
import "./productCard.css";

export default function ProductCard({ product, onAdd }) {
  const variants = product?.variants || [];
  const [vIndex, setVIndex] = useState(0);
  const [size, setSize] = useState(variants[0]?.sizes?.[0] || "M");

  const v = variants[vIndex] || {};
  const [front, back] = v.images || [];
  const placeholder = "/marcas.jpg"; // ya lo tienes en /public

  return (
    <article className="product-card">
      {/* Imagen (usa tu efecto hover front/back del CSS) */}
      <div className="product-card__image">
        <img
          className="product-card__img product-card__img--front"
          src={front || placeholder}
          alt={product.name}
          loading="lazy"
        />
        <img
          className="product-card__img product-card__img--back"
          src={back || front || placeholder}
          alt={product.name}
          loading="lazy"
        />
      </div>

      <div className="product-card__body">
        <h3 className="product-card__name">{product.name}</h3>
        <div className="product-card__price">
          ${Number(product.price || 0).toLocaleString("es-CO")}
        </div>

        {/* Swatches (colores) */}
        <div className="product-card__swatches">
          {variants.map((vv, i) => (
            <button
              key={vv.color}
              className={`swatch ${i === vIndex ? "swatch--active" : ""}`}
              style={{ background: vv.hex }}
              aria-label={vv.color}
              onClick={() => {
                setVIndex(i);
                setSize(vv.sizes?.[0] || "M");
              }}
            />
          ))}
        </div>

        {/* Tallas */}
        <div className="product-card__sizes">
          {(v.sizes || ["M", "L", "XL"]).map((s) => (
            <button
              key={s}
              className={`size-chip ${s === size ? "size-chip--active" : ""}`}
              onClick={() => setSize(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {/* CTA */}
        <button
          className="product-card__cta"
          onClick={() =>
            onAdd &&
            onAdd({
              productId: product._id || product.id,
              name: product.name,
              price: product.price,
              color: v.color,
              size,
              qty: 1,
              image: front || placeholder,
            })
          }
        >
          Agregar al carrito
        </button>
      </div>
    </article>
  );
}
