// ==========================================
// File: src/components/CartPage.jsx
// Purpose: Premium Styled Cart with GPS & Simulated M-Pesa
// ==========================================
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CartContext } from '../context/CartContext';


const CartPage = () => {
  const { cart, removeFromCart, clearCart, updateQuantity } = useContext(CartContext);
  
  // Form States
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // GPS & Payment States
  const [dropoffLat, setDropoffLat] = useState(null);
  const [dropoffLng, setDropoffLng] = useState(null);
  const [locationStatus, setLocationStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mpesa_upfront');
  const [paymentStep, setPaymentStep] = useState('idle'); // idle, pushing, success
  const [isProcessing, setIsProcessing] = useState(false);


  const navigate = useNavigate();
  const grandTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);


  const handleGetLocation = () => {
    setLocationStatus('Locating...');
    if (!navigator.geolocation) return setLocationStatus('Geolocation not supported.');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDropoffLat(position.coords.latitude);
        setDropoffLng(position.coords.longitude);
        setLocationStatus('✅ Exact Location Captured!');
      },
      () => setLocationStatus('❌ Unable to retrieve location.')
    );
  };


  const handleCheckout = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');


    if (!token) {
      alert("Please log in to check out.");
      navigate('/login');
      return;
    }
    if (!dropoffLat || !dropoffLng) {
      alert("Please click '📍 Get My Location' first so your driver knows exactly where to go!");
      return;
    }


    // SIMULATE M-PESA STK PUSH
    if (paymentMethod === 'mpesa_upfront') {
      setPaymentStep('pushing');
      setTimeout(() => {
        setPaymentStep('success');
        submitOrderToBackend('completed');
      }, 3000); // 3 second delay to simulate typing M-Pesa PIN
    } else {
      submitOrderToBackend('pending');
    }
  };


  const submitOrderToBackend = async (finalPaymentStatus) => {
    setIsProcessing(true);
    const token = localStorage.getItem('token');
    
    try {
      const formattedItems = cart.map(cartItem => ({ item: cartItem._id, quantity: Number(cartItem.quantity) }));


      await axios.post(
        'http://localhost:5000/api/orders',
        {
          items: formattedItems,
          expectedDeliveryDate: deliveryDate,
          deliveryAddress,
          customerPhone,
          dropoffLat,
          dropoffLng,
          paymentMethod,
          paymentStatus: finalPaymentStatus
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );


      clearCart();
      navigate('/customer');
    } catch (error) {
      console.error(error);
      alert('Checkout failed. Please try again.');
      setIsProcessing(false);
      setPaymentStep('idle');
    }
  };


  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px', minHeight: '100vh' }}>
      
      {/* HEADER SECTION */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#111827', marginBottom: '10px' }}>
          Secure <span style={{ color: '#F5B041' }}>Checkout</span> 🛒
        </h2>
        <p style={{ fontSize: '1.1rem', color: '#6B7280' }}>Review your items and enter delivery details.</p>
      </div>


      {cart.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <span style={{ fontSize: '50px' }}>🛍️</span>
          <h3 style={{ margin: '15px 0 10px 0', fontSize: '1.5rem', color: '#111827' }}>Your cart is empty</h3>
          <p style={{ color: '#6B7280', marginBottom: '20px' }}>Looks like you haven't added anything yet.</p>
          <button onClick={() => navigate('/')} className="btn-primary">Browse Catalog</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' }}>
          
          {/* --- LEFT COLUMN: CART ITEMS --- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#111827', borderBottom: '2px solid #E5E7EB', paddingBottom: '10px' }}>Your Items</h3>
            {cart.map((item) => (
              <div key={item._id} className="glass-card" style={{ display: 'flex', alignItems: 'center', padding: '15px', gap: '15px' }}>
                
                {/* Thumbnail */}
                <div style={{ width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#F3F4F6', flexShrink: 0 }}>
                  {item.images?.[0] ? (
                    <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#9CA3AF' }}>No Img</div>
                  )}
                </div>


                {/* Item Details */}
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: '#111827' }}>{item.name}</h4>
                  <p style={{ margin: '0', color: '#6B7280', fontSize: '0.85rem' }}>
                    Price: <strong style={{ color: '#111827' }}>KES {item.price.toFixed(2)}</strong> per unit
                  </p>
                  
                  {/* QUANTITY CONTROLS */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                    <button 
                      type="button"
                      onClick={() => updateQuantity(item._id, item.quantity - (item.type === 'product' ? 0.5 : 1))}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #D1D5DB', backgroundColor: '#FFF', cursor: 'pointer', fontWeight: 'bold' }}
                    > - </button>
                    
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', minWidth: '30px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>


                    <button 
                      type="button"
                      onClick={() => updateQuantity(item._id, item.quantity + (item.type === 'product' ? 0.5 : 1))}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #D1D5DB', backgroundColor: '#FFF', cursor: 'pointer', fontWeight: 'bold' }}
                    > + </button>
                  </div>
                </div>


                {/* Line Total & Remove */}
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 8px 0', color: '#10B981', fontWeight: '700', fontSize: '1.1rem' }}>
                    KES {(item.price * item.quantity).toFixed(2)}
                  </p>
                  <button 
                    onClick={() => removeFromCart(item._id)} 
                    style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', backgroundColor: '#FEE2E2' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>






          {/* --- RIGHT COLUMN: CHECKOUT FORM --- */}
          <div className="glass-card" style={{ padding: '30px', height: 'fit-content' }}>
            <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '20px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#111827' }}>Order Summary</h3>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.9rem', color: '#6B7280' }}>Total to pay</span>
                <h2 style={{ margin: 0, color: '#10B981', fontSize: '1.8rem' }}>KES {grandTotal.toFixed(2)}</h2>
              </div>
            </div>
            
            <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem', color: '#374151' }}>M-Pesa Phone Number</label>
                  <input type="tel" required className="input-modern" placeholder="0712345678" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem', color: '#374151' }}>Delivery Date</label>
                  <input type="date" required className="input-modern" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                </div>
              </div>


              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem', color: '#374151' }}>Delivery Address / Apartment</label>
                <input type="text" required className="input-modern" placeholder="e.g. Westlands, 3rd Floor, Apt 4" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
              </div>


              {/* GPS Location Box */}
              <div style={{ padding: '15px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.85rem', color: '#374151' }}>Exact Map Coordinates (Required)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={handleGetLocation} style={{ padding: '8px 16px', backgroundColor: '#111827', color: '#FFD700', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}>
                    📍 Get My Location
                  </button>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: dropoffLat ? '#10B981' : '#EF4444' }}>
                    {locationStatus || 'Click to allow GPS access'}
                  </span>
                </div>
              </div>


              {/* M-PESA PAYMENT SELECTION */}
              <div style={{ padding: '15px', border: '2px solid #10B981', borderRadius: '8px', backgroundColor: '#ECFDF5' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '700', fontSize: '1rem', color: '#065F46' }}>💳 Payment Method</label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', padding: '10px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #A7F3D0', cursor: 'pointer' }}>
                    <input type="radio" name="payment" value="mpesa_upfront" checked={paymentMethod === 'mpesa_upfront'} onChange={(e) => setPaymentMethod(e.target.value)} style={{ marginRight: '10px', accentColor: '#10B981' }} />
                    <span style={{ fontWeight: '600', color: '#065F46', fontSize: '0.95rem' }}>Pay Now (M-Pesa Express)</span>
                  </label>
                  
                  <label style={{ display: 'flex', alignItems: 'center', padding: '10px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #A7F3D0', cursor: 'pointer' }}>
                    <input type="radio" name="payment" value="mpesa_on_delivery" checked={paymentMethod === 'mpesa_on_delivery'} onChange={(e) => setPaymentMethod(e.target.value)} style={{ marginRight: '10px', accentColor: '#10B981' }} />
                    <span style={{ fontWeight: '600', color: '#065F46', fontSize: '0.95rem' }}>Pay on Delivery (M-Pesa)</span>
                  </label>
                </div>
              </div>


              {/* PAYMENT BUTTON STATES */}
              <div style={{ marginTop: '10px' }}>
                {paymentStep === 'pushing' ? (
                  <div style={{ padding: '16px', backgroundColor: '#10B981', color: 'white', borderRadius: '8px', textAlign: 'center', fontWeight: '700', fontSize: '1rem', animation: 'pulse 1.5s infinite' }}>
                    📲 STK Push sent! Enter M-Pesa PIN on your phone...
                  </div>
                ) : paymentStep === 'success' ? (
                  <div style={{ padding: '16px', backgroundColor: '#059669', color: 'white', borderRadius: '8px', textAlign: 'center', fontWeight: '700', fontSize: '1rem' }}>
                    ✅ Payment Received! Finalizing order...
                  </div>
                ) : (
                  <button type="submit" disabled={isProcessing} className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}>
                    {isProcessing ? 'Processing...' : paymentMethod === 'mpesa_upfront' ? `Pay KES ${grandTotal.toFixed(2)} Securely` : 'Confirm Order'}
                  </button>
                )}
              </div>


            </form>
          </div>


        </div>
      )}


      {/* Pulse Animation for M-Pesa STK Push */}
      <style>{`
        @keyframes pulse {
          0% { filter: brightness(1); }
          50% { filter: brightness(1.1); box-shadow: 0 0 15px rgba(16, 185, 129, 0.5); }
          100% { filter: brightness(1); }
        }
      `}</style>
    </div>
  );
};


export default CartPage;



