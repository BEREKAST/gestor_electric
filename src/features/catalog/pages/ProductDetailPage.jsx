import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import http from "../../../shared/lib/http.js";
import "./ProductDetailPage.css";

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await http.get(`/products/${id}`);
        setProduct(data);
      } catch {
        // Mock si no hay backend
        setProduct({
          id,
          name: "Producto eléctrico demo",
          price: 199.99,
          description:
            "Descripción de ejemplo. Reemplaza por la del backend cuando esté listo.",
          image: "/placeholder/medidor.jpg",
          stock: 12,
        });
      }
    })();
  }, [id]);

  if (!product) return <div className="container section">Cargando…</div>;

  return (
    <section className="section">
      <div className="container pdp">
        <div className="pdp__media card">
          <img src={product.image} alt={product.name} />
        </div>

        <div className="pdp__info card">
          <h1 className="pdp__title">{product.name}</h1>
          <p className="pdp__price">${product.price.toFixed(2)}</p>
          <p className="pdp__desc">{product.description}</p>
          <div className="pdp__actions">
            <button className="btn" onClick={() => alert("Añadido al carrito")}>
              Añadir al carrito
            </button>
            <Link to="/cart" className="btn btn--ghost">Ver carrito</Link>
          </div>
          <small className="pdp__stock">Stock: {product.stock}</small>
        </div>
      </div>
    </section>
  );
}
