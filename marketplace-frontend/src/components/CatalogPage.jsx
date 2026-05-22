import { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { CartContext } from '../context/CartContext';
import sharedCategories from '../../../shared/categories.json';

const CatalogPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState('');
  const { addToCart } = useContext(CartContext);
  const [addedItemId, setAddedItemId] = useState(null);
  const [quantities, setQuantities] = useState({});

  // --- FILTER & TAB STATES ---
  const [activeTab, setActiveTab] = useState('product'); // 'product' or 'service'
  const [selectedCategory, setSelectedCategory] = useState('All');

  const productCategories = ['All', ...sharedCategories.productCategories];
  const serviceCategories = ['All', ...sharedCategories.serviceCategories];

  // AI Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [aiResults, setAiResults] = useState(null); // Stores IDs from AI search

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const response = await api.get('/api/catalog');
        setItems(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Catalog fetch failed:', err);
        setError('Failed to load the catalog.');
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  // --- DYNAMIC FILTERING LOGIC ---
  const displayedItems = useMemo(() => {
    // If AI has results, show only those (Search overrides manual filters)
    if (aiResults) {
      return items.filter(item => aiResults.includes(item._id));
    }

    // Otherwise, filter by Tab and Category
    return items.filter(item => {
      const matchType = item.type === activeTab;
      const matchCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchType && matchCategory;
    });
  }, [items, activeTab, selectedCategory, aiResults]);

  const handleQuantityChange = (itemId, value) => {
    setQuantities({ ...quantities, [itemId]: value });
  };

  const handleAddToCart = (item) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in or register to start adding items to your cart! 🛒');
      navigate('/login');
      return;
    }

    const qty = Number(quantities[item._id]) || 1;
    addToCart(item, qty);
    setAddedItemId(item._id);
    setTimeout(() => setAddedItemId(null), 2000);
  };

  const handleSmartSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setAiResults(null);
      setSearchMessage('');
      return;
    }

    setIsSearching(true);
    setSearchMessage('✨ AI is analyzing your request...');

    try {
      const response = await api.post('/api/ai/search', {
        query: searchQuery
      });

      const { recommendedIds } = response.data;
      if (recommendedIds && recommendedIds.length > 0) {
        setAiResults(recommendedIds);
        setSearchMessage(`✅ AI found ${recommendedIds.length} matches for you!`);
      } else {
        setAiResults([]);
        setSearchMessage('🤖 No matches found. Try rephrasing!');
      }
    } catch {
      setSearchMessage('❌ AI Search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setAiResults(null);
    setSearchMessage('');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', minHeight: '100vh' }}>
      
      {/* HEADER */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#111827' }}>
          Kidza <span style={{ color: '#F5B041' }}>Marketplace</span>
        </h2>
        <p style={{ color: '#6B7280' }}>Premium products and professional services at your fingertips.</p>
      </div>

      {/* AI SEARCH BAR */}
      <div className="glass-card" style={{ padding: '25px', maxWidth: '700px', margin: '0 auto 40px auto' }}>
        <form onSubmit={handleSmartSearch} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="input-modern"
            placeholder="What are you looking for today?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={isSearching} style={{ minWidth: '120px' }}>
            {isSearching ? '...' : '✨ AI Search'}
          </button>
        </form>
        {searchMessage && (
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span>{searchMessage}</span>
            <button onClick={clearSearch} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>Clear Filters</button>
          </div>
        )}
      </div>

      {/* TAB SWITCHER (Goods vs Services) */}
      {!aiResults && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '30px' }}>
          {['product', 'service'].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedCategory('All'); }}
              style={{
                padding: '12px 30px', borderRadius: '30px', border: 'none', cursor: 'pointer', fontWeight: '700',
                backgroundColor: activeTab === tab ? '#111827' : '#FFFFFF',
                color: activeTab === tab ? '#FFD700' : '#6B7280',
                boxShadow: activeTab === tab ? '0 10px 15px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {tab === 'product' ? '📦 Products' : '🛠️ Services'}
            </button>
          ))}
        </div>
      )}

      {/* CATEGORY CHIPS */}
      {!aiResults && (
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '40px' }}>
          {(activeTab === 'product' ? productCategories : serviceCategories).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '8px 18px', borderRadius: '20px', border: '1px solid #E5E7EB', cursor: 'pointer',
                backgroundColor: selectedCategory === cat ? '#F5B041' : '#FFF',
                color: selectedCategory === cat ? '#FFF' : '#4B5563',
                fontSize: '0.85rem', fontWeight: '600'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ITEMS GRID */}
      {loading ? (
        <p style={{ textAlign: 'center' }}>Loading Catalog...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '30px' }}>
          {displayedItems.length === 0 ? (
            <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '50px', color: '#9CA3AF' }}>No items found in this category.</p>
          ) : (
            displayedItems.map((item) => (
              <div key={item._id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ height: '200px', backgroundColor: '#F3F4F6', position: 'relative' }}>
                  <img
                    src={item.images?.[0] || 'https://placehold.co/400x200?text=No+Image'}
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', top: '10px', right: '10px', padding: '4px 10px', background: 'rgba(255,255,255,0.9)', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '700' }}>
                    {item.category}
                  </div>
                </div>
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '5px' }}>{item.name}</h3>
                  <p style={{ color: '#10B981', fontWeight: '800', fontSize: '1.3rem', marginBottom: '10px' }}>KES {item.price}</p>
                  <p style={{ fontSize: '0.9rem', color: '#6B7280', flex: 1 }}>{item.description}</p>
                  
                  <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="number"
                      className="input-modern"
                      style={{ width: '70px' }}
                      value={quantities[item._id] || 1}
                      onChange={(e) => handleQuantityChange(item._id, e.target.value)}
                    />
                    <button onClick={() => handleAddToCart(item)} className="btn-primary" style={{ flex: 1 }}>
                      {addedItemId === item._id ? 'Added!' : '🛒 Add'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CatalogPage;


