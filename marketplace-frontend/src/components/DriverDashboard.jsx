import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import DriverProfileForm from './DriverProfileForm';
import api, { API_BASE_URL } from '../api';
import MapView from './MapView';

const DriverDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [driverStatus, setDriverStatus] = useState({ isApproved: false, isProfileComplete: false });
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sharingOrderId, setSharingOrderId] = useState(null);

  // Refs so we can clean up the socket connection and the GPS watch on unmount.
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  // Last position we actually sent to the customer; used to skip jittery
  // sub-5m fluctuations when the driver is stationary.
  const lastSentRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    socketRef.current = io(API_BASE_URL, { auth: { token } });
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      socketRef.current?.disconnect();
    };
  }, []);

  const fetchData = async () => {
    if (!localStorage.getItem('token')) return setError('Please log in.');
    setLoading(true);
    try {
      const orderRes = await api.get('/api/orders');
      setOrders(orderRes.data);
      setDriverStatus({ isApproved: true, isProfileComplete: true });
    } catch (err) {
      if (err.response?.status === 403) {
        setDriverStatus({
          isApproved: false,
          isProfileComplete: !err.response.data.needsProfile
        });
      } else {
        setError('Connection failed. Please refresh.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stopSharingLocation = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharingOrderId(null);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/api/orders/${orderId}/status`, { status: newStatus });
      if (newStatus === 'delivered') stopSharingLocation();
      fetchData();
    } catch {
      alert('Failed to update status.');
    }
  };

  const startSharingLocation = (orderId) => {
    if (!navigator.geolocation) {
      alert("Geolocation isn't available on this device.");
      return;
    }
    // Never run two watchers at once.
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    lastSentRef.current = null;
    setSharingOrderId(orderId);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const last = lastSentRef.current;

        // Skip updates smaller than the GPS noise floor (~5m). A driver
        // standing still still emits jittery fixes every second; without
        // this the customer's marker visibly twitches.
        if (last) {
          const dx = (lat - last.lat) * 111320;
          const dy = (lng - last.lng) * 111320 * Math.cos(lat * Math.PI / 180);
          const meters = Math.sqrt(dx * dx + dy * dy);
          const sinceMs = Date.now() - last.t;
          // Always send at least one update every 10s so the customer's
          // route ETA keeps refreshing even if the driver is parked.
          if (meters < 5 && sinceMs < 10_000) return;
        }

        lastSentRef.current = { lat, lng, t: Date.now() };
        socketRef.current?.emit('driver_location_update', { orderId, location: { lat, lng } });
      },
      (err) => {
        console.error('GPS error:', err);
        alert(`GPS error: ${err.message}. Make sure you've allowed location access.`);
        stopSharingLocation();
      },
      {
        enableHighAccuracy: true,   // request best fix the device can give
        maximumAge: 5000,           // accept cached fixes ≤5s old
        timeout: 30000              // give the OS 30s to produce a fix
      }
    );
  };

  const getStatusBadge = (status) => {
    const styles = { padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' };
    if (status === 'pending') return <span style={{ ...styles, backgroundColor: '#FEF3C7', color: '#D97706' }}>⏳ Pending</span>;
    return <span style={{ ...styles, backgroundColor: '#DBEAFE', color: '#2563EB' }}>🚚 In Progress</span>;
  };

  const availableRequests = orders.filter(o => o.status === 'pending');
  const myActiveTrips = orders.filter(o => o.status !== 'pending' && o.status !== 'delivered' && o.status !== 'cancelled');

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>🔐 Securing Dashboard...</div>;

  // --- VIEW 1: PROFILE EDITOR ---
  if (showProfileEdit || !driverStatus.isProfileComplete) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
        {driverStatus.isProfileComplete && (
          <button onClick={() => setShowProfileEdit(false)} className="btn-primary" style={{ background: '#6B7280', marginBottom: '20px' }}>← Back to Dashboard</button>
        )}
        <DriverProfileForm onProfileSubmit={() => { setShowProfileEdit(false); fetchData(); }} />
      </div>
    );
  }

  // --- VIEW 2: APPLICATION TRACKER ---
  if (!driverStatus.isApproved) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', padding: '40px' }} className="glass-card">
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Onboarding <span style={{ color: '#F5B041' }}>Tracker</span></h2>
          <p onClick={() => setShowProfileEdit(true)} style={{ color: '#3B82F6', cursor: 'pointer', textDecoration: 'underline', marginTop: '10px' }}>Edit my documents</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ background: '#10B981', color: '#FFF', width: '30px', height: '30px', borderRadius: '50%', textAlign: 'center', lineHeight: '30px' }}>✓</div>
            <p style={{ margin: 0 }}>Documents Submitted</p>
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ background: '#DBEAFE', color: '#2563EB', width: '30px', height: '30px', borderRadius: '50%', textAlign: 'center', lineHeight: '30px', animation: 'pulse 1.5s infinite' }}>2</div>
            <p style={{ margin: 0, color: '#2563EB', fontWeight: 'bold' }}>Pending Admin Review</p>
          </div>
        </div>

        <button onClick={fetchData} className="btn-primary" style={{ width: '100%', marginTop: '30px' }}>Refresh Application</button>
        {error && <p style={{ color: 'red', textAlign: 'center', marginTop: '15px' }}>{error}</p>}
      </div>
    );
  }

  // --- VIEW 3: FULL APPROVED HUB ---
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px', position: 'relative' }}>
        <button onClick={() => setShowProfileEdit(true)} style={{ position: 'absolute', right: 0, top: 0, padding: '8px 15px', borderRadius: '8px', border: '1px solid #DDD', cursor: 'pointer', background: 'white' }}>⚙️ Profile</button>
        <h2 style={{ fontSize: '2.2rem', fontWeight: '800' }}>Driver <span style={{ color: '#F5B041' }}>Hub</span></h2>
        <div style={{ display: 'inline-block', padding: '5px 15px', backgroundColor: '#D1FAE5', color: '#059669', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700' }}>● Active & Online</div>
      </header>

      <h3 style={{ marginBottom: '20px' }}>🚀 My Active Trips ({myActiveTrips.length})</h3>
      {myActiveTrips.map(order => (
        <div key={order._id} className="glass-card" style={{ marginBottom: '25px', padding: '24px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
             <strong>Order #{order._id.slice(-6).toUpperCase()}</strong>
             {getStatusBadge(order.status)}
           </div>
           
           <p style={{ color: '#4B5563' }}>📍 {order.deliveryAddress}</p>

           {sharingOrderId === order._id && order.dropoffLat && (
              <div style={{ height: '250px', margin: '20px 0', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                <MapView
                  center={{ lat: order.dropoffLat, lng: order.dropoffLng }}
                  zoom={15}
                  markers={[{
                    position: { lat: order.dropoffLat, lng: order.dropoffLng },
                    emoji: '📍',
                    popup: 'Customer Location'
                  }]}
                />
              </div>
           )}

           <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
             {order.status === 'accepted_by_driver' && (
                <button onClick={() => updateOrderStatus(order._id, 'in_transit')} className="btn-primary" style={{ flex: 1 }}>Start Trip</button>
             )}
             {order.status === 'in_transit' && (
               <>
                 <button onClick={() => startSharingLocation(order._id)} className="btn-primary" style={{ flex: 1, backgroundColor: sharingOrderId === order._id ? '#10B981' : '#111827' }}>
                    {sharingOrderId === order._id ? '📡 Sharing GPS' : '📍 Share Location'}
                 </button>
                 <button onClick={() => updateOrderStatus(order._id, 'delivered')} className="btn-primary" style={{ flex: 1 }}>Complete Delivery</button>
               </>
             )}
           </div>
        </div>
      ))}

      <h3 style={{ marginTop: '40px', marginBottom: '20px' }}>🆕 Available Orders ({availableRequests.length})</h3>
      {availableRequests.map(order => (
        <div key={order._id} className="glass-card" style={{ padding: '20px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontWeight: '700' }}>{order.deliveryAddress.split(',')[0]}</p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280' }}>Pay: KES {order.totalPrice}</p>
          </div>
          <button onClick={() => updateOrderStatus(order._id, 'accepted_by_driver')} className="btn-primary">Accept</button>
        </div>
      ))}
    </div>
  );
};

export default DriverDashboard;

