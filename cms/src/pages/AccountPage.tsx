import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError, errorMessage } from '../lib/api';
import { useDocumentTitle } from '../lib/useAsync';
import { validatePasswordChange, type FieldErrors } from '../lib/validation';
import { Field, PageHeader, Spinner, fieldAria } from '../components/States';
import { useToast } from '../components/Toast';

export function AccountPage() {
  useDocumentTitle('Tài khoản');
  const { user } = useAuth();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validatePasswordChange(current, next, confirm);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await api.changePassword(current, next);
      toast.success('Đã đổi mật khẩu');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      const msg = errorMessage(err);
      if (err instanceof ApiError && err.status === 400 && /hiện tại/i.test(msg)) setErrors({ current_password: msg });
      else if (err instanceof ApiError && err.status === 400) setErrors({ new_password: msg });
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Tài khoản" subtitle="Thông tin quản trị viên và đổi mật khẩu" />
      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Thông tin</h2>
          <dl className="kv">
            <dt>Tên đăng nhập</dt>
            <dd>{user?.username ?? '–'}</dd>
            <dt>Họ tên</dt>
            <dd>{user?.full_name || '–'}</dd>
          </dl>
        </section>
        <section className="card">
          <h2 className="card-title">Đổi mật khẩu</h2>
          <form onSubmit={onSubmit} noValidate className="form-stack">
            <Field id="current_password" label="Mật khẩu hiện tại" required error={errors.current_password}>
              <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} {...fieldAria('current_password', errors.current_password)} />
            </Field>
            <Field id="new_password" label="Mật khẩu mới" required error={errors.new_password} hint="Ít nhất 8 ký tự">
              <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} {...fieldAria('new_password', errors.new_password, true)} />
            </Field>
            <Field id="confirm_password" label="Nhập lại mật khẩu mới" required error={errors.confirm_password}>
              <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} {...fieldAria('confirm_password', errors.confirm_password)} />
            </Field>
            <div>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy && <Spinner small />} Đổi mật khẩu
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
