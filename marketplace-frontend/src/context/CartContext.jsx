// Purpose: Global memory for the Shopping Cart with Unique Item Counting & Persistence


/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect } from 'react';


// 1. Create the context
export const CartContext = createContext();


// 2. Create the Provider
const CartProvider = ({ children }) => {
  // NEW: Initialize cart from LocalStorage so items don't disappear on refresh
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('kidza_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });


  // NEW: Save to LocalStorage whenever the cart changes
  useEffect(() => {
    localStorage.setItem('kidza_cart', JSON.stringify(cart));
  }, [cart]);


  // Function to add items to the cart
  const addToCart = (item, quantity) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem._id === item._id);
      
      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem._id === item._id
            ? { ...cartItem, quantity: Number(cartItem.quantity) + Number(quantity) }
            : cartItem
        );
      }
      return [...prevCart, { ...item, quantity: Number(quantity) }];
    });
  };


  const removeFromCart = (itemId) => {
    setCart((prevCart) => prevCart.filter((item) => item._id !== itemId));
  };


  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('kidza_cart');
  };


  // --- THE "MILLION-DOLLAR" TWEAK ---
  // Counting unique line items instead of total quantity.
  // Potatoes (5kg) + Tomatoes (2kg) now equals 2 items in the badge.
  const cartItemCount = cart.length;

  // NEW: Update quantity of a specific item in the cart
  const updateQuantity = (itemId, newQty) => {
    if (newQty < 0.5) return; // Prevent 0 or negative quantities
    setCart((prevCart) =>
      prevCart.map((item) =>
        item._id === itemId ? { ...item, quantity: Number(newQty) } : item
      )
    );
  };


  // Add updateQuantity to your value prop at the bottom:
  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, cartItemCount, updateQuantity }}>
      {children}
    </CartContext.Provider>
  );
};


export default CartProvider;



