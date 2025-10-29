// src/components/ProductCatalogMujer.jsx
import { useNavigate } from 'react-router-dom';
// 👉 Usamos el MISMO CSS que “Novedades” para mantener coherencia visual
import './ProductCatalogNuevo.css';

export default function ProductCatalogMujer() {
  const navigate = useNavigate();
  const whatsappText = encodeURIComponent(
    'Hola 👋 Estoy interesado(a) en la colección de Mujer. ¿Me avisas cuando esté disponible?'
  );

  return (
    <section className="catalogo-nueva" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
      <div style={{ maxWidth: 720, width: '100%', textAlign: 'center', padding: '24px' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '6px 12px',
            borderRadius: 999,
            background: '#ffeef2',
            color: '#d60059',
            fontWeight: 600,
            fontSize: 13,
            letterSpacing: '.2px',
            marginBottom: 12
          }}
        >
          Colección Mujer
        </span>

        <h1 style={{ fontSize: 28, margin: '6px 0 10px', lineHeight: 1.2 }}>
          ¡Muy pronto tendremos productos para ti! 💖
        </h1>

        <p style={{ color: '#666', marginBottom: 18 }}>
          Estamos preparando una selección hermosa de camisetas y polos para Mujer. Déjanos un mensaje y te avisamos
          apenas lancemos la colección.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href={`https://wa.me/573113987975?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Avísenme por WhatsApp"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 14px',
              borderRadius: 12,
              background: '#000',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 600,
              minWidth: 180
            }}
          >
            Avísenme por WhatsApp
          </a>

          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid #ddd',
              background: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              minWidth: 180
            }}
            title="Volver al catálogo"
          >
            Volver al catálogo
          </button>
        </div>

        <p style={{ fontSize: 12, color: '#aaa', marginTop: 18 }}>
          *Si quieres, podemos ocultar temporalmente esta página de buscadores (noindex) para SEO.
        </p>
      </div>
    </section>
  );
}



