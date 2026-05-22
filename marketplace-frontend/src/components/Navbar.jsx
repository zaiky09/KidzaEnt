// Purpose: Premium Navigation bar with role-based access
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { CartContext } from '../context/CartContext';
import logo from '../assets/Kidza.png';


const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();


  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const username = localStorage.getItem('username');
  // First name only — keeps the navbar tidy and feels friendlier.
  const firstName = username ? username.split(' ')[0] : null;
  const { cartItemCount } = useContext(CartContext);


  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    navigate('/'); // Redirect to Home Page
  };


  const isActive = (path) => location.pathname === path;


  // --- STYLING HELPERS ---
  const navLinkStyle = (path) => ({
    color: isActive(path) ? '#FFD700' : '#FFFFFF',
    textDecoration: 'none',
    margin: '0 15px',
    fontWeight: isActive(path) ? '700' : '500',
    fontSize: '15px',
    transition: 'color 0.2s ease',
  });


  return (
    <nav style={{
      backgroundColor: '#000000',
      padding: '10px 40px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      {/* Brand Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
        <img src={logo} alt="Kidza" style={{ height: '65px', width: 'auto' }} />
      </Link>


      {/* Navigation Links */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        
        {/* 1. GUESTS / LOGGED OUT */}
        {!token && (
          <>
            <Link to="/catalog" style={navLinkStyle('/catalog')}>Catalog</Link>
            <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', marginLeft: '10px' }}>
              Login / Sign Up
            </Link>
          </>
        )}


        {/* 2. LOGGED IN USERS */}
        {token && (
          <>
            {/* Personalized greeting — only render when we have a name. */}
            {firstName && (
              <span
                style={{ color: '#FFD700', marginRight: '14px', fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap' }}
                title={username}
              >
                Hi, {firstName} 👋
              </span>
            )}

            {/* Catalog: Only visible to Customers and Admins */}
            {(role === 'customer' || role === 'admin') && (
              <Link to="/catalog" style={navLinkStyle('/catalog')}>Catalog</Link>
            )}


            {/* Role-Specific Links */}
            {role === 'customer' && (
              <>
                <Link to="/customer" style={navLinkStyle('/customer')}>My Orders</Link>
                <Link to="/cart" style={{ ...navLinkStyle('/cart'), position: 'relative' }}>
                  🛒 Cart 
                  {cartItemCount > 0 && (
                    <span style={{
                      position: 'absolute', top: '-8px', right: '-15px',
                      backgroundColor: '#FFD700', color: '#000',
                      fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: '800'
                    }}>
                      {cartItemCount}
                    </span>
                  )}
                </Link>
              </>
            )}


            {role === 'driver' && (
              <Link to="/driver" style={navLinkStyle('/driver')}>📦 My Deliveries</Link>
            )}


            {role === 'admin' && (
              <Link to="/admin" style={navLinkStyle('/admin')}>⚙️ Admin Panel</Link>
            )}


            {/* Logout Button */}
            <button 
              onClick={handleLogout} 
              style={{
                backgroundColor: 'transparent',
                color: '#EF4444',
                border: '1px solid #EF4444',
                padding: '6px 15px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                marginLeft: '20px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { e.target.style.backgroundColor = '#EF4444'; e.target.style.color = '#FFF'; }}
              onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#EF4444'; }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
};


export default Navbar;



