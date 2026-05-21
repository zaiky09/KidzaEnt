import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditUserModal from '../EditUserModal';

const baseUser = {
  _id: 'u1',
  username: 'Test User',
  email: 'test@example.com',
  phone: '0712345678',
  role: 'customer'
};

describe('EditUserModal', () => {
  test('returns null when no user is passed', () => {
    const { container } = render(<EditUserModal user={null} onClose={() => {}} onSave={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  test('pre-fills fields from the user prop', () => {
    render(<EditUserModal user={baseUser} onClose={() => {}} onSave={() => {}} />);
    expect(screen.getByLabelText(/username/i)).toHaveValue('Test User');
    expect(screen.getByLabelText(/email/i)).toHaveValue('test@example.com');
    expect(screen.getByLabelText(/phone/i)).toHaveValue('0712345678');
    expect(screen.getByLabelText(/role/i)).toHaveValue('customer');
  });

  test('calls onSave with userId and the edited payload', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<EditUserModal user={baseUser} onClose={() => {}} onSave={onSave} />);

    const phoneInput = screen.getByLabelText(/phone/i);
    await user.clear(phoneInput);
    await user.type(phoneInput, '0798765432');

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('u1', expect.objectContaining({
      username: 'Test User',
      email: 'test@example.com',
      phone: '0798765432',
      role: 'customer'
    }));
  });

  test('blocks submit and shows an error when phone is not a valid Kenyan number', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<EditUserModal user={baseUser} onClose={() => {}} onSave={onSave} />);

    const phoneInput = screen.getByLabelText(/phone/i);
    await user.clear(phoneInput);
    await user.type(phoneInput, '12345');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/valid kenyan/i)).toBeInTheDocument();
  });

  test('Cancel button fires onClose without saving', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSave = vi.fn();
    render(<EditUserModal user={baseUser} onClose={onClose} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  test('shows the saving state when onSave is in-flight', () => {
    render(<EditUserModal user={baseUser} saving onClose={() => {}} onSave={() => {}} />);
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });
});
