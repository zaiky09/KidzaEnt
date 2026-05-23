// ==========================================
// File: src/components/HomePage.jsx
// Purpose: Premium Landing Page with Dynamic Buttons
// ==========================================
import { Link } from 'react-router-dom';
import { SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY, SUPPORT_EMAIL } from '../constants';


const HomePage = () => {
  // NEW: Check if the user is currently logged in!
  const isLoggedIn = !!localStorage.getItem('token');
  const username = isLoggedIn ? localStorage.getItem('username') : null;
  const firstName = username ? username.split(' ')[0] : null;


  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
      
      {/* --- PREMIUM DARK HERO BANNER --- */}
      <section style={{ 
        backgroundColor: '#111827', 
        padding: '120px 20px', 
        textAlign: 'center', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        borderBottom: '4px solid #FFD700'
      }}>
        <div style={{ maxWidth: '800px' }}>
          {firstName && (
            <p style={{ color: '#FFD700', fontSize: '1rem', fontWeight: 600, marginBottom: '16px', letterSpacing: '0.04em' }}>
              👋 Welcome back, {firstName}
            </p>
          )}
          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: '800',
            color: '#FFFFFF',
            lineHeight: '1.2',
            marginBottom: '24px'
          }}>
            Everything You Need.<br/>
            <span style={{ color: '#FFD700' }}>Delivered Instantly.</span>
          </h1>
          
          <p style={{ 
            fontSize: '1.1rem', 
            color: '#9CA3AF', 
            marginBottom: '40px', 
            lineHeight: '1.6',
            maxWidth: '600px',
            margin: '0 auto 40px auto'
          }}>
            Kidza Delivery brings top-tier products and professional services right to your doorstep. Powered by our AI Shopping Assistant and secured by M-Pesa.
          </p>
          
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/catalog" className="btn-primary" style={{ textDecoration: 'none', fontSize: '1.1rem', padding: '16px 32px', display: 'inline-block' }}>
              🛍️ Shop the Catalog
            </Link>
            
            {/* NEW: Only show this button if the user is NOT logged in */}
            {!isLoggedIn && (
              <Link to="/login" style={{ 
                textDecoration: 'none', 
                fontSize: '1.1rem', 
                padding: '14px 32px', 
                color: '#FFFFFF', 
                backgroundColor: 'transparent',
                border: '2px solid #374151', 
                borderRadius: '8px', 
                fontWeight: '600',
                transition: 'all 0.2s',
                display: 'inline-block'
              }}
              onMouseOver={(e) => { e.target.style.borderColor = '#FFD700'; e.target.style.color = '#FFD700'; }}
              onMouseOut={(e) => { e.target.style.borderColor = '#374151'; e.target.style.color = '#FFFFFF'; }}
              >
                Log In / Register
              </Link>
            )}
          </div>
        </div>
      </section>


      {/* --- FEATURES SECTION --- */}
      <section style={{ padding: '80px 20px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827' }}>Why Choose Kidza?</h2>
          <p style={{ color: '#6B7280', marginTop: '10px' }}>The smartest way to shop and book services in Kenya.</p>
        </div>


        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '30px' }}>
          
          {/* Feature 1 */}
          <div className="glass-card" style={{ padding: '40px 30px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🤖</div>
            <h3 style={{ fontSize: '1.25rem', color: '#111827', marginBottom: '10px' }}>AI Shopping Assistant</h3>
            <p style={{ color: '#6B7280', lineHeight: '1.5' }}>
              Don't know what to look for? Just tell our AI your problem, and it will find the perfect product or service for you instantly.
            </p>
          </div>


          {/* Feature 2 */}
          <div className="glass-card" style={{ padding: '40px 30px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>💳</div>
            <h3 style={{ fontSize: '1.25rem', color: '#111827', marginBottom: '10px' }}>Seamless M-Pesa</h3>
            <p style={{ color: '#6B7280', lineHeight: '1.5' }}>
              No cash? No problem. Checkout securely with our instant M-Pesa STK push, or choose to pay via M-Pesa on delivery.
            </p>
          </div>


          {/* Feature 3 */}
          <div className="glass-card" style={{ padding: '40px 30px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📍</div>
            <h3 style={{ fontSize: '1.25rem', color: '#111827', marginBottom: '10px' }}>Live GPS Tracking</h3>
            <p style={{ color: '#6B7280', lineHeight: '1.5' }}>
              Never wonder where your order is again. Watch your driver approach your exact location on a live, real-time map.
            </p>
          </div>


        </div>
      </section>


      {/* --- CALL TO ACTION FOOTER --- */}
      <section style={{ backgroundColor: '#FFD700', padding: '60px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#111827', marginBottom: '20px' }}>Ready to get started?</h2>
        <Link to="/catalog" style={{
          display: 'inline-block',
          backgroundColor: '#111827',
          color: '#FFD700',
          padding: '16px 40px',
          borderRadius: '8px',
          fontWeight: '700',
          fontSize: '1.1rem',
          textDecoration: 'none',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          View the Catalog ➔
        </Link>
      </section>

      {/* --- CONTACT / HELPLINE FOOTER --- */}
      <footer style={{ backgroundColor: '#111827', color: '#9CA3AF', padding: '32px 20px', textAlign: 'center', marginTop: 'auto' }}>
        <p style={{ color: '#FFD700', fontWeight: 700, fontSize: '1rem', margin: '0 0 8px 0' }}>Need help? We're a call or email away.</p>
        <p style={{ margin: '0 0 6px 0', fontSize: '1.05rem' }}>
          📞 <a href={`tel:${SUPPORT_PHONE}`} style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: 600 }}>{SUPPORT_PHONE_DISPLAY}</a>
          {' · '}
          ✉️ <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: '#FFFFFF', textDecoration: 'none', fontWeight: 600 }}>{SUPPORT_EMAIL}</a>
        </p>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280' }}>Mon–Sun, 7am–10pm EAT · © Kidza Enterprise Ltd</p>
      </footer>


    </div>
  );
};


export default HomePage;



