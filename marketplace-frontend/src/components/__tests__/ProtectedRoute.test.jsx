import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';

// Build a fake JWT with a given payload. ProtectedRoute only decodes the
// payload — it doesn't verify the signature — so the header/signature can
// be arbitrary base64url strings.
function makeJwt(payload) {
  const b64 = (obj) =>
    btoa(JSON.stringify(obj))
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.sig`;
}

const Inner = () => <div>secret content</div>;
const LoginPage = () => <div>login page</div>;
const HomePage = () => <div>home page</div>;

function renderWithRouter(allow, initialPath = '/secret') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomePage />} />
        <Route
          path="/secret"
          element={
            <ProtectedRoute allow={allow}>
              <Inner />
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  test('redirects to /login when no token is present', () => {
    renderWithRouter(['admin']);
    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
  });

  test('renders children when token is valid and role is allowed', () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem('token', makeJwt({ userId: 'u1', role: 'admin', exp: future }));
    renderWithRouter(['admin']);
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });

  test('redirects to / when role is not in allow list', () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem('token', makeJwt({ userId: 'u1', role: 'customer', exp: future }));
    renderWithRouter(['admin']);
    expect(screen.getByText('home page')).toBeInTheDocument();
    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
  });

  test('expired tokens are rejected and clear localStorage', () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    localStorage.setItem('token', makeJwt({ userId: 'u1', role: 'admin', exp: past }));
    localStorage.setItem('role', 'admin');

    renderWithRouter(['admin']);
    expect(screen.getByText('login page')).toBeInTheDocument();
    // expired tokens should self-clean
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('role')).toBeNull();
  });

  test('malformed token redirects without throwing', () => {
    localStorage.setItem('token', 'not.a.valid.jwt');
    renderWithRouter(['admin']);
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  test('with no allow prop, any valid unexpired token grants access', () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem('token', makeJwt({ userId: 'u1', role: 'customer', exp: future }));
    renderWithRouter(undefined);
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });
});
