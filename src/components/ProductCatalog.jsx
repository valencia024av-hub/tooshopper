import './ProductCatalog.css';


// src/components/ProductCatalog.jsx

const products = [
  {
    id: 1,
    name: "Camisa casual",
    image: "https://via.placeholder.com/200x200?text=Camisa",
    price: 80000,
    oldPrice: 95000,
  },
  {
    id: 2,
    name: "Jean clásico",
    image: "https://via.placeholder.com/200x200?text=Jean",
    price: 100000,
    oldPrice: 120000,
  },
  {
    id: 3,
    name: "Chaqueta liviana",
    image: "https://via.placeholder.com/200x200?text=Chaqueta",
    price: 150000,
    oldPrice: 180000,
  },
  {
    id: 4,
    name: "Pantalón deportivo",
    image: "https://via.placeholder.com/200x200?text=Pantalón",
    price: 75000,
    oldPrice: 90000,
  },
  {
    id: 5,
    name: "Sudadera negra",
    image: "https://via.placeholder.com/200x200?text=Sudadera",
    price: 85000,
    oldPrice: 100000,
  },
  {
    id: 6,
    name: "Bermuda de jean",
    image: "https://via.placeholder.com/200x200?text=Bermuda",
    price: 65000,
    oldPrice: 75000,
  },
  {
    id: 7,
    name: "Camiseta básica",
    image: "https://via.placeholder.com/200x200?text=Camiseta",
    price: 40000,
    oldPrice: 50000,
  },
  {
    id: 8,
    name: "Blusa moderna",
    image: "https://via.placeholder.com/200x200?text=Blusa",
    price: 70000,
    oldPrice: 85000,
  },
  {
    id: 9,
    name: "Vestido fresco",
    image: "https://via.placeholder.com/200x200?text=Vestido",
    price: 120000,
    oldPrice: 150000,
  },
  {
    id: 10,
    name: "Zapatos deportivos",
    image: "https://via.placeholder.com/200x200?text=Zapatos",
    price: 130000,
    oldPrice: 160000,
  },
];

function ProductCatalog() {
  return (
    <section className="catalog">
      <h2>Catálogo de Prendas</h2>
      <div className="product-grid">
        {products.map((item) => (
          <div key={item.id} className="product-card">
            <img src={item.image} alt={item.name} />
            <h3>{item.name}</h3>
            <p className="price">
              <span className="old-price">${item.oldPrice.toLocaleString()}</span>
              <span className="new-price">${item.price.toLocaleString()}</span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ProductCatalog;
