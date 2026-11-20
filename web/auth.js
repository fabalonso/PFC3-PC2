import { api, el } from './ui.js';

const roleTitles = { generator: 'Generador', collector: 'Recolector' };

export function initAuth(onChange = () => {}) {
  const toolbar = document.querySelector('#account-nav');
  const notice = document.querySelector('#account-notice');
  const register = document.querySelector('#register-form');
  const login = document.querySelector('#login-form');
  const context = new URLSearchParams(location.search);

  function setUser(user) {
    if (user) {
      const logout = el('button', { className: 'nav-login', type: 'button', text: 'Cerrar sesión' });
      logout.addEventListener('click', async () => {
        logout.disabled = true;
        try {
          await api('/api/auth/logout', { method: 'POST' });
          setUser(null);
          notice.textContent = 'Sesión cerrada.';
        } catch (error) {
          notice.textContent = error.message;
        } finally {
          logout.disabled = false;
        }
      });
      toolbar.replaceChildren(el('span', { className: 'role-badge', text: roleTitles[user.role] }), logout);
    } else {
      const current = document.body.dataset.page;
      const loginHref = current === 'offers' ? '/iniciar-sesion?volver=ofertas'
        : current === 'activity' ? '/iniciar-sesion?volver=actividad' : '/iniciar-sesion';
      toolbar.replaceChildren(
        el('a', { className: 'nav-login', href: loginHref, text: 'Iniciar sesión' }),
        el('a', { className: 'button button-compact', href: '/registro', text: 'Crear cuenta' }),
      );
    }
    onChange(user);
  }

  const form = register ?? login;
  if (form) {
    const feedback = document.querySelector('#auth-feedback');
    const submit = form.querySelector('button[type="submit"]');
    if (login && context.get('creada') === '1') feedback.textContent = 'Cuenta creada. Ya puedes iniciar sesión.';

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const fields = Object.fromEntries(new FormData(form));
      if (register && new TextEncoder().encode(fields.password).length > 128) {
        feedback.textContent = 'La contraseña supera los 128 bytes. Elige una más corta.';
        form.elements.password.focus();
        return;
      }
      submit.disabled = true;
      feedback.textContent = '';
      try {
        await api('/api/auth/' + (register ? 'register' : 'login'), { method: 'POST', body: fields });
        if (register) {
          location.assign('/iniciar-sesion?creada=1');
        } else {
          const next = context.get('volver');
          location.assign(next === 'ofertas' ? '/ofertas' : '/actividad');
        }
      } catch (error) {
        feedback.textContent = error.message;
      } finally {
        submit.disabled = false;
      }
    });
  }

  api('/api/auth/session').then(({ user }) => setUser(user)).catch(() => setUser(null));
}
