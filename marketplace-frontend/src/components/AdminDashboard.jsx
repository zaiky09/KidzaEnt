// Purpose: Premium Admin Control Center with Categories for Goods & Services
import { useState, useEffect } from 'react';
import axios from 'axios';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [message, setMessage] = useState('');

  // --- DATA STATES ---
  const [catalogItems, setCatalogItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [userRoleView, setUserRoleView] = useState('driver');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // --- FORM STATES (Inventory) ---
  const [name, setName] = useState('');
  const [type, setType] = useState('product');
  const [category, setCategory] = useState('Fresh Produce'); // Default category
  const [price, setPrice] = useState('');
  const [weightPerItemKg, setWeightPerItemKg] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Define category lists
  const productCategories = ['Fresh Produce', 'Household Cleaning', 'Beverages', 'Pantry Staples', 'Snacks'];
  const serviceCategories = ['Plumbing', 'Cleaning', 'Electrical', 'Beauty & Wellness', 'Other'];

  // --- FETCHING LOGIC ---
  useEffect(() => {
    fetchCatalog();
    fetchOrders();
    fetchUsers(userRoleView);
  }, [userRoleView]);

  const fetchCatalog = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/catalog');
      setCatalogItems(res.data);
    } catch { console.error("Error fetching catalog"); }
  };

  const fetchOrders = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get('http://localhost:5000/api/orders', { headers: { Authorization: `Bearer ${token}` } });
      setOrders(res.data);
    } catch { console.error("Error fetching orders"); }
  };

  const fetchUsers = async (role) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`http://localhost:5000/api/users?role=${role}`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(res.data);
    } catch { console.error("Error fetching users"); }
  };

  // --- INVENTORY HANDLERS ---
  const handleGenerateDescription = async () => {
    if (!name) return setMessage('⚠️ Type an Item Name first!');
    setIsGenerating(true);
    const token = localStorage.getItem('token');
    try {
      const res = await axios.post('http://localhost:5000/api/ai/generate-description', { itemName: name, itemType: type }, { headers: { Authorization: `Bearer ${token}` } });
      setDescription(res.data.description);
      setMessage('✅ AI Description generated!');
    } catch { setMessage('❌ AI failed.'); }
    finally { setIsGenerating(false); }
  };

  const handleInventorySubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const payload = {
        name, 
        type, 
        category, // Added Category to payload
        price: Number(price),
        weightPerItemKg: type === 'product' ? Number(weightPerItemKg) : undefined,
        description, 
        images: images ? images.split(',').map(u => u.trim()) : []
    };
    try {
      if (editingId) await axios.put(`http://localhost:5000/api/catalog/${editingId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      else await axios.post('http://localhost:5000/api/catalog', payload, { headers: { Authorization: `Bearer ${token}` } });
      resetForm(); fetchCatalog();
      setMessage(editingId ? 'Item updated!' : 'Item added!');
    } catch { setMessage('Failed to save.'); }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:5000/api/catalog/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchCatalog();
    } catch { alert("Failed to delete."); }
  };

  const handleEditClick = (item) => {
    setEditingId(item._id);
    setName(item.name);
    setPrice(item.price);
    setType(item.type);
    setCategory(item.category || (item.type === 'product' ? 'Fresh Produce' : 'Plumbing'));
    setDescription(item.description);
    setImages(item.images?.join(', '));
    setActiveTab('inventory');
    window.scrollTo(0, 0);
  };

  const resetForm = () => { 
    setName(''); setPrice(''); setWeightPerItemKg(''); setDescription(''); setImages(''); 
    setEditingId(null); setType('product'); setCategory('Fresh Produce'); 
  };

  // --- USER MANAGEMENT HANDLERS ---
  const handleApproveDriver = async (driverId, currentStatus) => {
    const token = localStorage.getItem('token');
    try {
      await axios.put(`http://localhost:5000/api/users/${driverId}/approve`, { isApproved: !currentStatus }, { headers: { Authorization: `Bearer ${token}` } });
      fetchUsers('driver');
      setMessage('Driver status updated.');
    } catch { alert("Error updating driver."); }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Permanently delete this user account?")) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:5000/api/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchUsers(userRoleView);
      setMessage('User deleted.');
    } catch { alert("Failed to delete user."); }
  };

  const handleEditUser = (user) => {
    const newPhone = window.prompt("Update Phone Number for " + user.username, user.phone);
    if (!newPhone) return;
    const token = localStorage.getItem('token');
    axios.put(`http://localhost:5000/api/users/${user._id}`, { phone: newPhone }, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(() => fetchUsers(userRoleView)).catch(() => alert("Update failed"));
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    const token = localStorage.getItem('token');
    try {
      await axios.put(`http://localhost:5000/api/orders/${orderId}/status`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
      fetchOrders();
    } catch { alert("Status update failed"); }
  };

  const filteredUsers = users.filter((u) => {
    const searchLower = userSearchQuery.toLowerCase();
    return (u.username?.toLowerCase().includes(searchLower) || u.phone?.includes(searchLower) || u.email?.toLowerCase().includes(searchLower));
  });

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px', minHeight: '100vh' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#111827' }}>Admin <span style={{ color: '#F5B041' }}>Control Center</span></h2>
      </header>

      {/* TABS */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '40px' }}>
        {['inventory', 'orders', 'users'].map((tab) => (
          <button key={tab} onClick={() => { setActiveTab(tab); setMessage(''); }} style={{
            padding: '12px 30px', borderRadius: '30px', border: 'none', cursor: 'pointer', fontWeight: '700',
            backgroundColor: activeTab === tab ? '#111827' : '#FFFFFF',
            color: activeTab === tab ? '#FFD700' : '#6B7280',
            boxShadow: activeTab === tab ? '0 10px 15px rgba(0,0,0,0.1)' : 'none'
          }}>{tab}</button>
        ))}
      </div>

      {/* ================= INVENTORY ================= */}
      {activeTab === 'inventory' && (
        <div style={{ animation: 'fadeIn 0.5s ease' }}>
          <div className="glass-card" style={{ padding: '30px', marginBottom: '40px' }}>
            <h3 style={{ marginBottom: '15px' }}>{editingId ? '✏️ Edit Item' : '➕ Add Item'}</h3>
            {message && <p style={{ color: '#10B981', fontWeight: 'bold', marginBottom: '15px' }}>{message}</p>}
            
            <form onSubmit={handleInventorySubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <input className="input-modern" placeholder="Item Name" value={name} onChange={(e) => setName(e.target.value)} required />
              
              <select className="input-modern" value={type} onChange={(e) => { 
                  setType(e.target.value); 
                  setCategory(e.target.value === 'product' ? 'Fresh Produce' : 'Plumbing'); 
                }}>
                <option value="product">Physical Product</option>
                <option value="service">Service</option>
              </select>

              {/* DYNAMIC CATEGORY DROPDOWN */}
              <select className="input-modern" value={category} onChange={(e) => setCategory(e.target.value)} required>
                {(type === 'product' ? productCategories : serviceCategories).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <input className="input-modern" type="number" placeholder="Price (KES)" value={price} onChange={(e) => setPrice(e.target.value)} required />
              
              {type === 'product' && <input className="input-modern" type="number" placeholder="Weight (Kg)" value={weightPerItemKg} onChange={(e) => setWeightPerItemKg(e.target.value)} />}
              
              <div style={{ gridColumn: '1/-1' }}>
                <textarea className="input-modern" style={{ minHeight: '100px', width: '100%' }} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required />
                <button type="button" onClick={handleGenerateDescription} className="btn-primary" style={{ width: '100%', marginTop: '10px', background: '#374151' }} disabled={isGenerating}>
                  {isGenerating ? 'AI Thinking...' : '✨ AI Generate Description'}
                </button>
              </div>
              
              <input className="input-modern" style={{ gridColumn: '1/-1' }} placeholder="Image URLs (comma separated)" value={images} onChange={(e) => setImages(e.target.value)} />
              
              <button type="submit" className="btn-primary" style={{ gridColumn: '1/-1' }}>{editingId ? 'Update Item' : 'Save Item'}</button>
              {editingId && <button type="button" onClick={resetForm} className="btn-primary" style={{ gridColumn: '1/-1', background: '#9CA3AF' }}>Cancel Edit</button>}
            </form>
          </div>

          {/* LISTING WITH CATEGORY BADGE */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {catalogItems.map(item => (
              <div key={item._id} className="glass-card" style={{ padding: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
                <img src={item.images?.[0] || 'https://via.placeholder.com/60'} alt="" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0 }}>{item.name}</h4>
                  <span style={{ fontSize: '0.7rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 'bold' }}>{item.category}</span>
                  <p style={{ margin: '5px 0 0 0', color: '#10B981', fontWeight: 'bold' }}>KES {item.price}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <button onClick={() => handleEditClick(item)} style={{ border: 'none', background: 'none', color: '#3B82F6', fontWeight: 'bold', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => handleDeleteItem(item._id)} style={{ border: 'none', background: 'none', color: '#EF4444', fontWeight: 'bold', cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= ORDERS ================= */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {orders.length === 0 ? <p style={{ textAlign: 'center' }}>No orders found.</p> : orders.map(order => (
            <div key={order._id} className="glass-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0 }}><strong>Order #{order._id.slice(-6).toUpperCase()}</strong></p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#6B7280' }}>{order.deliveryAddress}</p>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', color: '#10B981' }}>Total: KES {order.totalPrice}</p>
              </div>
              <select className="input-modern" value={order.status} onChange={(e) => updateOrderStatus(order._id, e.target.value)}>
                <option value="pending">Pending</option>
                <option value="accepted_by_driver">Accepted</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {/* ================= USERS ================= */}
      {activeTab === 'users' && (
        <div>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', alignItems: 'center' }}>
            <button onClick={() => setUserRoleView('driver')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '700', backgroundColor: userRoleView === 'driver' ? '#FFD700' : '#E5E7EB' }}>Drivers</button>
            <button onClick={() => setUserRoleView('customer')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '700', backgroundColor: userRoleView === 'customer' ? '#FFD700' : '#E5E7EB' }}>Customers</button>
            <input className="input-modern" style={{ flex: 2 }} placeholder="Search name, phone, or email..." value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '25px' }}>
            {filteredUsers.map(user => {
              const isDriver = user.role === 'driver';
              const isVerified = !isDriver || user.isApproved;
              return (
                <div key={user._id} className="glass-card" style={{ padding: '0', overflow: 'hidden', border: isDriver && !user.isApproved ? '2px solid #F87171' : '1px solid #E5E7EB' }}>
                  <div style={{ padding: '20px', backgroundColor: isVerified ? '#F0FDF4' : '#FFF1F2', display: 'flex', alignItems: 'center', gap: '15px', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEditUser(user)} style={{ border: 'none', background: 'white', borderRadius: '4px', cursor: 'pointer', padding: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>✏️</button>
                      <button onClick={() => handleDeleteUser(user._id)} style={{ border: 'none', background: 'white', borderRadius: '4px', cursor: 'pointer', padding: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>🗑️</button>
                    </div>
                    <div style={{ width: '55px', height: '55px', borderRadius: '50%', backgroundColor: '#D1D5DB', overflow: 'hidden', border: '2px solid #FFF', flexShrink: 0 }}>
                      <img src={user.driverDetails?.profilePhoto || `https://ui-avatars.com/api/?name=${user.username}&background=random`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0 }}>{user.username}</h4>
                      <p style={{ margin: '2px 0', fontSize: '0.85rem', fontWeight: 'bold', color: '#374151' }}>{user.email}</p>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280' }}>{user.phone}</p>
                      <span style={{ fontSize: '0.7rem', fontWeight: '800', color: isVerified ? '#059669' : '#DC2626', textTransform: 'uppercase' }}>
                        {isDriver ? (user.isApproved ? '● Active' : '● Pending Approval') : '● Verified Customer'}
                      </span>
                    </div>
                  </div>
                  {isDriver && user.driverDetails && (
                    <div style={{ padding: '20px', borderTop: '1px solid #E5E7EB' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                        <div style={{ background: '#F3F4F6', padding: '10px', borderRadius: '8px' }}>
                          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Identity</p>
                          <p style={{ margin: 0 }}>ID: {user.driverDetails.nationalId}</p>
                          <a href={user.driverDetails.idPhoto} target="_blank" rel="noreferrer" style={{ color: '#3B82F6', fontSize: '0.75rem' }}>View ID ↗</a>
                        </div>
                        <div style={{ background: '#F3F4F6', padding: '10px', borderRadius: '8px' }}>
                          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Vehicle</p>
                          <p style={{ margin: 0 }}>{user.driverDetails.vehicleReg}</p>
                          <p style={{ margin: 0 }}>{user.driverDetails.vehicleType}</p>
                        </div>
                      </div>
                      <button onClick={() => handleApproveDriver(user._id, user.isApproved)} className="btn-primary" style={{ width: '100%', marginTop: '15px', backgroundColor: user.isApproved ? '#EF4444' : '#10B981' }}>
                        {user.isApproved ? 'Revoke Approval' : 'Approve Driver'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;


