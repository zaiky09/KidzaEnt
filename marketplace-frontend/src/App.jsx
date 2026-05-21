// Purpose: Main entry point that handles routing (page navigation)
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import ProtectedRoute from './components/ProtectedRoute';


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
          <Route path="/customer" element={
            <ProtectedRoute allow={['customer', 'admin']}><CustomerDashboard /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute allow={['admin']}><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/driver" element={
            <ProtectedRoute allow={['driver', 'admin']}><DriverDashboard /></ProtectedRoute>
          } />
          <Route path="/cart" element={
            <ProtectedRoute allow={['customer', 'admin']}><CartPage /></ProtectedRoute>
          } />
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


