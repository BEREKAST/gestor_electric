import { Link, useNavigate } from "react-router-dom";
import "./ProductCard.css";
import useAuth from "../../auth/context/useAuth.js";
import { addItem } from "../../../shared/lib/cart.js";

export default function ProductCard({ product }){
  const { user } = useAuth();
  const nav = useNavigate();
  const canBuy = Boolean(user);
  const inStock = Number(product.stock ?? 0) > 0;

  const handleAdd = () => {
    addItem(product, 1);
    alert("Producto agregado al carrito");
  };

  const handleBuyNow = () => {
    addItem(product, 1);
    nav("/cart");
  };

  return (
    <article className="product-card card">
      <Link to={`/product/${product.id}`} className="product-card__thumb">
        <img src={product.image} alt={product.name} loading="lazy"/>
      </Link>

      <div className="product-card__body">
        <h3 className="product-card__title" title={product.name}>{product.name}</h3>
        <p className="product-card__price">${Number(product.price).toFixed(2)}</p>
        <p className={`product-card__stock ${inStock ? "ok" : "out"}`}>
          {inStock ? `Stock: ${product.stock}` : "Sin stock"}
        </p>

        <div className="product-card__actions">
          <Link className="product-card__btn" to={`/product/${product.id}`}>Ver detalle</Link>

          {canBuy ? (
            <>
              <button className="product-card__btn" disabled={!inStock} onClick={handleAdd}>
                Agregar
              </button>
              <button className="product-card__btn primary" disabled={!inStock} onClick={handleBuyNow}>
                Comprar ahora
              </button>
            </>
          ) : (
            <Link className="product-card__btn primary" to="/login">
              Ingresar para comprar
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
