import storage from "./storage.js";
const KEY = "cart";

export function getCart(){
  return storage.get(KEY) || [];
}

export function saveCart(items){
  storage.set(KEY, items);
  return items;
}

export function addItem(product, qty = 1){
  const items = getCart();
  const i = items.findIndex(it => it.id === product.id);
  if (i >= 0){
    items[i].qty = Math.min((items[i].qty || 1) + qty, Math.max(product.stock ?? 9999, 1));
  } else {
    items.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image: product.image,
      qty: Math.max(1, Math.min(qty, product.stock ?? qty))
    });
  }
  return saveCart(items);
}

export function clearCart(){ storage.remove(KEY); }
