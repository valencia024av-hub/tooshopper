// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';

import Header from './components/Header';
import Hero from './components/Hero';
import Categories from './components/Categories';
import FeaturedProducts from './components/FeaturedProducts';
import PromoBanner from './components/PromoBanner';
import Footer from './components/Footer';
import FloatingButtons from './components/FloatingButtons';

import Buscar from './pages/Buscar';

import ProductCatalogHombre from './components/ProductCatalogHombre';
import ProductCatalogMujer from './components/ProductCatalogMujer';
import ProductCatalogNuevo from './components/ProductCatalogNuevo';
import ProductCatalogSale from './components/ProductCatalogSale';

import Registro from './components/Registro';
import Login from './components/Login';

import PrivateRoute from './components/PrivateRoute';
import Perfil from './components/Perfil';

import Carrito from './components/Carrito';
import Checkout from './components/Checkout';

// ⬇️ Lazy-load de páginas que podrían estar causando el crash al importarse
const PayPage        = lazy(() => import('./pages/PayPage'));
const PayStatus      = lazy(() => import('./pages/PayStatus'));
const AdminOrders    = lazy(() => import('./pages/AdminOrders'));
const ProductDetailAC= lazy(() => import('./pages/ProductDetailAC'));

const Home = () => (
  <>
    <Hero />
    <PromoBanner />
    <main>
      <Categories />
      <FeaturedProducts />
    </main>
  </>
);

export default function App() {
  return (
    <>
      <Header />

      {/* Suspense evita que el import de las páginas lazy tumbe la app */}
      <Suspense fallback={<div style={{ padding: 20 }}>Cargando…</div>}>
        <Routes>
          {/* Públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/buscar" element={<Buscar />} />

          <Route path="/hombre" element={<ProductCatalogHombre />} />
          <Route path="/hombres" element={<Navigate to="/hombre" replace />} />
          <Route path="/men" element={<Navigate to="/hombre" replace />} />
          <Route path="/caballeros" element={<Navigate to="/hombre" replace />} />

          <Route path="/mujer" element={<ProductCatalogMujer />} />
          <Route path="/nuevo" element={<ProductCatalogNuevo />} />
          <Route path="/sale" element={<ProductCatalogSale />} />

          <Route path="/marcas" element={<Navigate to="/nuevo" replace />} />

          {/* Auth públicas */}
          <Route path="/registro" element={<Registro />} />
          <Route path="/login" element={<Login />} />

          {/* Guest checkout */}
          <Route path="/carrito" element={<Carrito />} />
          <Route path="/checkout" element={<Checkout />} />

          {/* Pago */}
          <Route path="/pagar/:orderId" element={<PayPage />} />
          <Route path="/pago/:orderId" element={<PayPage />} /> {/* alias */}
          <Route path="/pago/estado/:orderId" element={<PayStatus />} />

          {/* Detalle de producto */}
          <Route path="/producto/:id" element={<ProductDetailAC />} />

          {/* Protegidas */}
          <Route element={<PrivateRoute />}>
            <Route path="/perfil" element={<Perfil />} />
          </Route>

          {/* Solo admin */}
          <Route element={<PrivateRoute requireAdmin />}>
            <Route path="/admin/orders" element={<AdminOrders />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<div style={{ padding:20 }}>Página no encontrada</div>} />
        </Routes>
      </Suspense>

      <Footer />
      <FloatingButtons />
    </>
  );
}
