// Purpose: Million-Dollar Styled Customer Dashboard with Live Map and Thumbnails


import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api, { API_BASE_URL } from '../api';
import MapView from './MapView';
import ReviewModal from './ReviewModal';


const CustomerDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [liveLocation, setLiveLocation] = useState(null);
  const [etaInfo, setEtaInfo] = useState(null); // { durationText, distanceText, durationSec }
  const [reviewingItem, setReviewingItem] = useState(null); // catalog item being reviewed
  const [savingReview, setSavingReview] = useState(false);
  const [resendingId, setResendingId] = useState(null);     // orderId currently being resent
  const [resendMessage, setResendMessage] = useState(null); // { tone: 'ok'|'err', text, orderId }

  // First-name greeting from localStorage (set on login).
  const username = typeof window !== 'undefined' ? localStorage.getItem('username') : null;
  const firstName = username ? username.split(' ')[0] : null;

  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in.');
      setLoading(false);
      return;
    }

    socketRef.current = io(API_BASE_URL, { auth: { token } });
    socketRef.current.on('receive_location_update', (location) => setLiveLocation(location));

    // Real-time status updates: when the driver accepts / starts / completes,
    // or admin cancels, the server emits to the customer's room. Merge the
    // new state into the existing orders so the badge + driver info refresh
    // without the customer reloading.
    socketRef.current.on('order_status_updated', (payload) => {
      setOrders((prev) => prev.map((o) =>
        o._id === payload.orderId
          ? { ...o, status: payload.status, driverId: payload.driverId ?? o.driverId }
          : o
      ));
    });

    const fetchOrders = async () => {
      try {
        const response = await api.get('/api/orders');
        setOrders(response.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load orders.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);


  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      await api.put(`/api/orders/${orderId}/cancel`, {});
      setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status: 'cancelled' } : o));
    } catch {
      alert('Failed to cancel the order.');
    }
  };

  const handleResendReceipt = async (orderId) => {
    setResendingId(orderId);
    setResendMessage(null);
    try {
      const res = await api.post(`/api/payments/${orderId}/receipt/resend`);
      setResendMessage({
        tone: 'ok',
        orderId,
        text: res.data?.message || '✅ Receipt resent. Check your inbox (and spam folder).'
      });
    } catch (err) {
      setResendMessage({
        tone: 'err',
        orderId,
        text: err?.response?.data?.message || 'Could not send receipt. Try again in a minute.'
      });
    } finally {
      setResendingId(null);
      // Auto-hide so the toast doesn't linger if the user moves on.
      setTimeout(() => setResendMessage((m) => (m?.orderId === orderId ? null : m)), 6000);
    }
  };


  const submitReview = async ({ rating, comment }) => {
    if (!reviewingItem) return;
    setSavingReview(true);
    try {
      await api.post(`/api/catalog/${reviewingItem._id}/reviews`, { rating, comment });
      setReviewingItem(null);
    } finally {
      setSavingReview(false);
    }
  };

  const startTracking = (orderId) => {
    setTrackingOrderId(orderId);
    setLiveLocation(null);
    setEtaInfo(null);
    socketRef.current?.emit('join_order_room', orderId);
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
        {firstName && (
          <p style={{ fontSize: '0.95rem', color: '#6B7280', margin: '0 0 6px 0' }}>
            Welcome back, <strong style={{ color: '#111827' }}>{firstName}</strong> 👋
          </p>
        )}
        <h2 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#111827', marginBottom: '10px' }}>
          {firstName ? `${firstName}'s` : 'My'} <span style={{ color: '#F5B041' }}>Orders</span>
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
                                <img src={thumb} alt={lineItem.item?.name || 'Item'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = 'https://placehold.co/60?text=No+Img'; }} />
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
                            <li key={index} style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                              <span style={{ flex: 1 }}>• <strong>{lineItem.item ? lineItem.item.name : 'Deleted Item'}</strong></span>
                              <span style={{ fontWeight: '600' }}>Qty: {lineItem.quantity}</span>
                              {order.status === 'delivered' && lineItem.item && (
                                <button
                                  type="button"
                                  onClick={() => setReviewingItem(lineItem.item)}
                                  style={{ background: 'none', border: '1px solid #F5B041', color: '#92400E', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  ★ Review
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '600', color: '#374151' }}>Grand Total</span>
                          <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#10B981' }}>KES {order.totalPrice ? order.totalPrice.toFixed(2) : '0.00'}</span>
                        </div>
                        {order.paymentStatus === 'completed' && (
                          <div style={{ marginTop: '10px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleResendReceipt(order._id)}
                              disabled={resendingId === order._id}
                              style={{
                                background: 'none', border: 'none',
                                color: resendingId === order._id ? '#9CA3AF' : '#3B82F6',
                                fontSize: '0.82rem',
                                cursor: resendingId === order._id ? 'wait' : 'pointer',
                                textDecoration: 'underline', padding: 0
                              }}
                            >{resendingId === order._id ? '📧 Sending…' : '📧 Email me my receipt'}</button>

                            {resendMessage?.orderId === order._id && (
                              <div
                                role="status"
                                style={{
                                  marginTop: '6px',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  color: resendMessage.tone === 'ok' ? '#059669' : '#B91C1C',
                                  background: resendMessage.tone === 'ok' ? '#ECFDF5' : '#FEE2E2',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  display: 'inline-block'
                                }}
                              >{resendMessage.text}</div>
                            )}
                          </div>
                        )}
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
                                  <>
                                    {etaInfo && (
                                      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '12px', marginBottom: '12px', backgroundColor: '#FFFBEB', borderRadius: '12px', border: '1px solid #FDE68A' }}>
                                        <div style={{ textAlign: 'center' }}>
                                          <div style={{ fontSize: '0.75rem', color: '#92400E', textTransform: 'uppercase', fontWeight: '700' }}>ETA</div>
                                          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#111827' }}>{etaInfo.durationText}</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                          <div style={{ fontSize: '0.75rem', color: '#92400E', textTransform: 'uppercase', fontWeight: '700' }}>Distance</div>
                                          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#111827' }}>{etaInfo.distanceText}</div>
                                        </div>
                                      </div>
                                    )}
                                    <div style={{ height: '350px', width: '100%', borderRadius: '16px', overflow: 'hidden', border: '2px solid #FFD700', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                                      <MapView
                                        center={{ lat: liveLocation.lat, lng: liveLocation.lng }}
                                        zoom={14}
                                        markers={[
                                          { position: { lat: liveLocation.lat, lng: liveLocation.lng }, emoji: '🚗', popup: 'Your Kidza Driver' },
                                          ...(order.dropoffLat && order.dropoffLng ? [{ position: { lat: order.dropoffLat, lng: order.dropoffLng }, emoji: '🏠', popup: 'Your delivery address' }] : [])
                                        ]}
                                        routeFrom={liveLocation}
                                        routeTo={order.dropoffLat && order.dropoffLng ? { lat: order.dropoffLat, lng: order.dropoffLng } : undefined}
                                        onRouteUpdate={setEtaInfo}
                                      />
                                    </div>
                                  </>
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


      <ReviewModal
        key={reviewingItem?._id || 'closed'}
        item={reviewingItem}
        saving={savingReview}
        onClose={() => setReviewingItem(null)}
        onSubmit={submitReview}
      />

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



