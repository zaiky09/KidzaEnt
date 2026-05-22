// Purpose: Premium Admin Control Center with Categories for Goods & Services
import { useState, useEffect } from 'react';
import api from '../api';
import EditUserModal from './EditUserModal';
import PhotoLightbox from './PhotoLightbox';
import RejectDriverModal from './RejectDriverModal';
import sharedCategories from '../../../shared/categories.json';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [message, setMessage] = useState('');

  // --- DATA STATES ---
  const [catalogItems, setCatalogItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [userRoleView, setUserRoleView] = useState('driver');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [savingUser, setSavingUser] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null); // { src, alt }
  const [rejectingDriver, setRejectingDriver] = useState(null); // { user, mode }
  const [savingReject, setSavingReject] = useState(false);

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

  const { productCategories, serviceCategories } = sharedCategories;

  // --- FETCHING LOGIC ---
  // Catalog and orders are independent of which user-role tab is selected, so
  // fetch them once on mount; only re-fetch users when the role view changes.
  useEffect(() => { fetchCatalog(); fetchOrders(); }, []);
  useEffect(() => { fetchUsers(userRoleView); }, [userRoleView]);

  const fetchCatalog = async () => {
    try {
      const res = await api.get('/api/catalog');
      setCatalogItems(res.data);
    } catch (err) { console.error('Error fetching catalog:', err); }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get('/api/orders');
      setOrders(res.data);
    } catch (err) { console.error('Error fetching orders:', err); }
  };

  const fetchUsers = async (role) => {
    try {
      const res = await api.get(`/api/users?role=${role}`);
      setUsers(res.data);
    } catch (err) { console.error('Error fetching users:', err); }
  };

  // --- INVENTORY HANDLERS ---
  const handleGenerateDescription = async () => {
    if (!name) return setMessage('⚠️ Type an Item Name first!');
    setIsGenerating(true);
    try {
      const res = await api.post('/api/ai/generate-description', { itemName: name, itemType: type });
      setDescription(res.data.description);
      setMessage('✅ AI Description generated!');
    } catch { setMessage('❌ AI failed.'); }
    finally { setIsGenerating(false); }
  };

  const handleInventorySubmit = async (e) => {
    e.preventDefault();
    const payload = {
        name,
        type,
        category,
        price: Number(price),
        weightPerItemKg: type === 'product' ? Number(weightPerItemKg) : undefined,
        description,
        images: images ? images.split(',').map(u => u.trim()) : []
    };
    try {
      if (editingId) await api.put(`/api/catalog/${editingId}`, payload);
      else await api.post('/api/catalog', payload);
      resetForm(); fetchCatalog();
      setMessage(editingId ? 'Item updated!' : 'Item added!');
    } catch { setMessage('Failed to save.'); }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await api.delete(`/api/catalog/${id}`);
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
  const approveDriver = async (driverId) => {
    try {
      await api.put(`/api/users/${driverId}/approve`, { isApproved: true });
      fetchUsers('driver');
      setMessage('Driver approved. Email sent.');
    } catch { alert("Error approving driver."); }
  };

  const submitRejection = async (reason) => {
    if (!rejectingDriver) return;
    setSavingReject(true);
    try {
      await api.put(`/api/users/${rejectingDriver.user._id}/approve`, { isApproved: false, reason });
      setRejectingDriver(null);
      fetchUsers('driver');
      setMessage(rejectingDriver.mode === 'revoke' ? 'Driver approval revoked. Email sent.' : 'Driver rejected. Email sent with reason.');
    } finally {
      setSavingReject(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Permanently delete this user account?")) return;
    try {
      await api.delete(`/api/users/${id}`);
      fetchUsers(userRoleView);
      setMessage('User deleted.');
    } catch { alert("Failed to delete user."); }
  };

  const handleEditUser = (user) => setEditingUser(user);

  const handleSaveUser = async (id, payload) => {
    setSavingUser(true);
    try {
      await api.put(`/api/users/${id}`, payload);
      setEditingUser(null);
      fetchUsers(userRoleView);
      setMessage('User updated.');
    } finally {
      setSavingUser(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/api/orders/${orderId}/status`, { status: newStatus });
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))', gap: '20px' }}>
            {catalogItems.map(item => (
              <div key={item._id} className="glass-card" style={{ padding: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
                <img src={item.images?.[0] || 'https://placehold.co/60?text=No+Img'} alt="" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
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

      <EditUserModal
        key={editingUser?._id || 'closed'}
        user={editingUser}
        saving={savingUser}
        onClose={() => setEditingUser(null)}
        onSave={handleSaveUser}
      />

      <PhotoLightbox
        src={lightboxPhoto?.src}
        alt={lightboxPhoto?.alt}
        onClose={() => setLightboxPhoto(null)}
      />

      <RejectDriverModal
        key={rejectingDriver?.user?._id || 'closed'}
        driver={rejectingDriver?.user}
        mode={rejectingDriver?.mode}
        saving={savingReject}
        onClose={() => setRejectingDriver(null)}
        onSubmit={submitRejection}
      />

      {/* ================= USERS ================= */}
      {activeTab === 'users' && (
        <div>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', alignItems: 'center' }}>
            <button onClick={() => setUserRoleView('driver')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '700', backgroundColor: userRoleView === 'driver' ? '#FFD700' : '#E5E7EB' }}>Drivers</button>
            <button onClick={() => setUserRoleView('customer')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '700', backgroundColor: userRoleView === 'customer' ? '#FFD700' : '#E5E7EB' }}>Customers</button>
            <input className="input-modern" style={{ flex: 2 }} placeholder="Search name, phone, or email..." value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '25px' }}>
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
                      {/* Documents row — tap any thumbnail to open full-size */}
                      <p style={{ margin: '0 0 8px 0', fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.03em' }}>📄 Uploaded documents</p>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
                        {[
                          { label: 'Profile', src: user.driverDetails.profilePhoto },
                          { label: 'National ID', src: user.driverDetails.idPhoto },
                          { label: 'Driving License', src: user.driverDetails.licensePhoto }
                        ].map((p) => (
                          <div
                            key={p.label}
                            onClick={() => p.src && setLightboxPhoto({ src: p.src, alt: `${user.username} — ${p.label}` })}
                            style={{ textAlign: 'center', cursor: p.src ? 'zoom-in' : 'default', flex: '1 1 80px', minWidth: '80px' }}
                          >
                            {p.src ? (
                              <img
                                src={p.src}
                                alt={p.label}
                                style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E5E7EB', display: 'block' }}
                              />
                            ) : (
                              <div style={{ width: '100%', height: '80px', borderRadius: '8px', border: '1px dashed #D1D5DB', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#9CA3AF' }}>Missing</div>
                            )}
                            <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: '4px', fontWeight: 600 }}>{p.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Text details */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.82rem' }}>
                        <div style={{ background: '#F3F4F6', padding: '10px', borderRadius: '8px' }}>
                          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Identity</p>
                          <p style={{ margin: 0 }}>National ID: <strong>{user.driverDetails.nationalId || '—'}</strong></p>
                          <p style={{ margin: '4px 0 0 0' }}>License #: <strong>{user.driverDetails.licenseNumber || '—'}</strong></p>
                        </div>
                        <div style={{ background: '#F3F4F6', padding: '10px', borderRadius: '8px' }}>
                          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Vehicle</p>
                          <p style={{ margin: 0 }}>{user.driverDetails.vehicleReg || '—'}</p>
                          <p style={{ margin: '4px 0 0 0' }}>{user.driverDetails.vehicleColor} {user.driverDetails.vehicleType}</p>
                        </div>
                      </div>

                      {/* Last rejection reason — visible to admin even after the driver re-submits */}
                      {user.rejectionReason && !user.isApproved && (
                        <div style={{ marginTop: '15px', padding: '10px 12px', borderLeft: '3px solid #EF4444', background: '#FEF2F2', borderRadius: '6px', fontSize: '0.82rem', color: '#7F1D1D' }}>
                          <p style={{ margin: '0 0 4px 0', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Last rejection reason</p>
                          {user.rejectionReason}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                        {user.isApproved ? (
                          <button
                            onClick={() => setRejectingDriver({ user, mode: 'revoke' })}
                            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#EF4444', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}
                          >Revoke Approval</button>
                        ) : (
                          <>
                            <button
                              onClick={() => setRejectingDriver({ user, mode: 'reject' })}
                              style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #EF4444', background: '#FFF', color: '#B91C1C', fontWeight: 700, cursor: 'pointer' }}
                            >Reject…</button>
                            <button
                              onClick={() => approveDriver(user._id)}
                              className="btn-primary"
                              style={{ flex: 1, backgroundColor: '#10B981' }}
                            >Approve</button>
                          </>
                        )}
                      </div>
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


