// Purpose: Million-Dollar Styled Customer Dashboard with Live Map and Thumbnails


import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';


const socket = io('http://localhost:5000');


const carIcon = new L.DivIcon({
  html: '<div style="font-size: 30px; line-height: 30px; filter: drop-shadow(0px 4px 4px rgba(0,0,0,0.3));">🚗</div>',
  className: 'custom-car-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});


const CustomerDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [liveLocation, setLiveLocation] = useState(null);


  useEffect(() => {
    const fetchOrders = async () => {
      const token = localStorage.getItem('token');
      if (!token) return setError('You must be logged in.');
      try {
        const response = await axios.get('http://localhost:5000/api/orders', { headers: { Authorization: `Bearer ${token}` } });
        setOrders(response.data);
        setLoading(false);
      } catch {
        setError('Failed to load orders.');
        setLoading(false);
      }
    };


    fetchOrders();
    socket.on('receive_location_update', (location) => setLiveLocation(location));
    return () => socket.off('receive_location_update');
  }, []);


  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    const token = localStorage.getItem('token');
    try {
      await axios.put(`http://localhost:5000/api/orders/${orderId}/cancel`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status: 'cancelled' } : o));
    } catch {
      alert('Failed to cancel the order.');
    }
  };


  const startTracking = (orderId) => {
    setTrackingOrderId(orderId);
    setLiveLocation(null);
    socket.emit('join_order_room', orderId);
  };


  // Helper function for beautiful status badges
  const getStatusBadge = (status) => {
    const styles = { padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', display: 'inline-block' };
    switch (status) {
      case 'pending': return <span style={{ ...styles, backgroundColor: '#FEF3C7', color: '#D97706' }}>⏳ Pending</span>;
      case 'accepted_by_driver': return <span style={{ ...styles, backgroundColor: '#E0E7FF', color: '#4338CA' }}>🤝 Driver Assigned</span>;
      case 'in_transit': return <span style={{ ...styles, backgroundColor: '#DBEAFE', color: '#2563EB' }}>🚚 In Transit</span>;
      case 'delivered': return <span style={{ ...styles, backgroundColor: '#D1FAE5', color: '#059669' }}>✅ Delivered</span>;
      case 'cancelled': return <span style={{ ...styles, backgroundColor: '#FEE2E2', color: '#DC2626' }}>❌ Cancelled</span>;
      default: return <span style={{ ...styles, backgroundColor: '#F3F4F6', color: '#4B5563' }}>{status}</span>;
    }
  };


  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px', minHeight: '100vh' }}>
      
      {/* HEADER SECTION */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#111827', marginBottom: '10px' }}>
          My <span style={{ color: '#F5B041' }}>Orders</span>
        </h2>
        <p style={{ fontSize: '1.1rem', color: '#6B7280' }}>Track your deliveries and view order history.</p>
      </div>


      {loading && <p style={{ textAlign: 'center', color: '#6B7280', fontSize: '1.2rem' }}>Loading your orders...</p>}
      {error && <p style={{ textAlign: 'center', color: '#EF4444', fontWeight: '600' }}>{error}</p>}


      {!loading && !error && (
        <div>
          {orders.length === 0 ? (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
              <span style={{ fontSize: '40px' }}>🛍️</span>
              <h3 style={{ marginTop: '10px', color: '#111827' }}>No orders yet!</h3>
              <p style={{ color: '#6B7280' }}>Head over to the catalog to place your first order.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {orders.map((order) => {
                return (
                  <div key={order._id} className="glass-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    
                    {/* Order Header */}
                    <div style={{ backgroundColor: '#F9FAFB', padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                      <div>
                        <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#6B7280', fontWeight: '500' }}>
                          Order <span style={{ color: '#111827', fontWeight: '700' }}>#{order._id.slice(-6).toUpperCase()}</span>
                        </p>
                        <p style={{ margin: '0', fontSize: '0.85rem', color: '#9CA3AF' }}>
                          Placed on: {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>{getStatusBadge(order.status)}</div>
                    </div>


                    {/* Order Body */}
                    <div style={{ padding: '24px' }}>
                      
                      {/* --- Image Thumbnails (Your awesome addition!) --- */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', justifyContent: 'flex-start' }}>
                        {order.items?.map((lineItem, idx) => {
                          const thumb = lineItem.item?.images?.[0];
                          return (
                            <div key={idx} style={{ width: 60, height: 60, borderRadius: '8px', overflow: 'hidden', backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                              {thumb ? (
                                <img src={thumb} alt={lineItem.item?.name || 'Item'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = 'https://via.placeholder.com/60?text=No+Img'; }} />
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '10px', color: '#9CA3AF', textAlign: 'center' }}>No img</div>
                              )}
                            </div>
                          );
                        })}
                      </div>


                      <h4 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#111827' }}>📦 Order Summary</h4>
                      
                      {/* Item List & Total */}
                      <div style={{ backgroundColor: '#F3F4F6', borderRadius: '12px', padding: '15px', marginBottom: '20px' }}>
                        <ul style={{ listStyleType: 'none', padding: 0, margin: 0, fontSize: '0.95rem', color: '#4B5563' }}>
                          {order.items && order.items.map((lineItem, index) => (
                            <li key={index} style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                              <span>• <strong>{lineItem.item ? lineItem.item.name : 'Deleted Item'}</strong></span>
                              <span style={{ fontWeight: '600' }}>Qty: {lineItem.quantity}</span>
                            </li>
                          ))}
                        </ul>
                        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '600', color: '#374151' }}>Grand Total</span>
                          <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#10B981' }}>KES {order.totalPrice ? order.totalPrice.toFixed(2) : '0.00'}</span>
                        </div>
                      </div>


                      {/* --- DRIVER INFO --- */}
{order.driverId && order.status !== 'pending' && order.status !== 'cancelled' && (
  <div style={{ 
    padding: '20px', 
    backgroundColor: '#FFFBEB', 
    borderLeft: '5px solid #F5B041', 
    borderRadius: '12px', 
    marginBottom: '20px', 
    color: '#92400E',
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  }}>
                          {/* Driver Profile Photo */}
                          <div style={{ 
                            width: '60px', 
                            height: '60px', 
                            borderRadius: '50%', 
                            overflow: 'hidden', 
                            border: '2px solid #F5B041',
                            backgroundColor: '#FEF3C7',
                            flexShrink: 0 
                          }}>
                            {order.driverId.driverDetails?.profilePhoto ? (
                              <img src={order.driverId.driverDetails.profilePhoto} alt="Driver" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>👨‍✈️</div>
                            )}
                          </div>


                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>Driver Assigned: {order.driverId.username}</h4>
                            
                            {/* Vehicle Details - Pulling from our new driverDetails schema */}
                            {order.driverId.driverDetails ? (
                              <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: '600' }}>
                                🚗 {order.driverId.driverDetails.vehicleColor} {order.driverId.driverDetails.vehicleType} 
                                <span style={{ marginLeft: '10px', backgroundColor: '#FDE68A', padding: '2px 8px', borderRadius: '4px' }}>
                                  {order.driverId.driverDetails.vehicleReg}
                                </span>
                              </p>
                            ) : (
                              <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>Vehicle details pending...</p>
                            )}


                            <p style={{ margin: '0', fontSize: '0.9rem' }}>
                              <strong>📞 Contact:</strong> <a href={`tel:${order.driverId.phone}`} style={{ color: '#D97706', fontWeight: 'bold', textDecoration: 'none' }}>{order.driverId.phone}</a>
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Actions Area */}
                      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        {order.status === 'pending' && (
                          <button 
                            onClick={() => handleCancelOrder(order._id)} 
                            style={{ padding: '12px 24px', backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', flex: 1, transition: 'all 0.2s' }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#FECACA'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#FEE2E2'}
                          >
                            Cancel Order
                          </button>
                        )}


                        {/* LIVE MAP WIDGET */}
                        {order.status === 'in_transit' && (
                          <div style={{ width: '100%', marginTop: '10px' }}>
                            {trackingOrderId === order._id ? (
                              <div style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
                                <h4 style={{ margin: '0 0 15px 0', color: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#10B981', borderRadius: '50%', boxShadow: '0 0 8px #10B981', animation: 'pulse 1.5s infinite' }}></span>
                                  Live GPS Tracking Active
                                </h4>
                                
                                {liveLocation ? (
                                  <div style={{ height: '350px', width: '100%', borderRadius: '16px', overflow: 'hidden', border: '2px solid #FFD700', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                                    <MapContainer key={`${liveLocation.lat}-${liveLocation.lng}`} center={[liveLocation.lat, liveLocation.lng]} zoom={16} style={{ height: '100%', width: '100%' }}>
                                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                      <Marker position={[liveLocation.lat, liveLocation.lng]} icon={carIcon}>
                                        <Popup>Your Kidza Driver is here!</Popup>
                                      </Marker>
                                    </MapContainer>
                                  </div>
                                ) : (
                                  <div style={{ padding: '30px', backgroundColor: '#F3F4F6', borderRadius: '12px', textAlign: 'center', color: '#6B7280', fontStyle: 'italic' }}>
                                    📡 Waiting for driver's GPS signal...
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button 
                                onClick={() => startTracking(order._id)} 
                                className="btn-primary" 
                                style={{ width: '100%', padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                              >
                                📍 Track Live Delivery on Map
                              </button>
                            )}
                          </div>
                        )}
                      </div>


                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}


      {/* Tiny bit of inline CSS for animations */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};


export default CustomerDashboard;



