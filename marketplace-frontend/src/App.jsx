// Purpose: Main entry point that handles routing (page navigation)
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import CatalogPage from './components/CatalogPage';
import CustomerDashboard from './components/CustomerDashboard';
import DriverDashboard from './components/DriverDashboard';
import Navbar from './components/Navbar';
import CartProvider from './context/CartContext';
import CartPage from './components/CartPage';
import Chatbot from './components/Chatbot';
import HomePage from './components/HomePage';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';


function App() {
  return (
    <CartProvider>
    <Router>
      <div>
        {/* The Navbar stays at the top of every page */}
        <Navbar />

        {/* The Routes switch out the content based on the URL */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/login" element={<Login/>} />
          <Route path="/customer" element={<CustomerDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/driver" element={<DriverDashboard />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
        </Routes>

        <Chatbot />
      </div>
    </Router>
    </CartProvider>
  );
}

export default App;


