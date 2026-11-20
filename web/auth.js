import { api, el, selectField } from './ui.js';

const roles = { Generador: 'generator', Recolector: 'collector' };
const roleTitles = { generator: 'Generador', collector: 'Recolector' };

function inputField(label, attributes) {
  return el('label', { className: 'field' }, el('span', { text: label }), el('input', attributes));
}

export function initAuth(onChange = () => {}) {
  const toolbar = document.querySelector('#account-nav');
  const notice = document.querySelector('#account-notice');
  const dialog = document.querySelector('#account-dialog');
  let user = null;

  function setUser(value) {
    user = value;
    renderToolbar();
    onChange(value);
  }

  function openDialog(mode) {
    const create = mode === 'register';
    const title = create ? 'Crear cuenta' : 'Iniciar sesión';
    const role = selectField('Rol', 'role', Object.keys(roles), { placeholder: 'Elige tu rol', required: true });
    role.control.value = '';
    const message = el('p', { className: 'status', role: 'status' });
    const submit = el('button', { className: 'button', type: 'submit', text: title });
    const form = el('form', { className: 'form-stack' },
      el('h2', { id: 'account-title', text: title }),
      inputField('Correo electrónico', { name: 'email', type: 'email', autocomplete: 'email', maxlength: '254', required: true }),
      inputField('Contraseña', { name: 'password', type: 'password', autocomplete: create ? 'new-password' : 'current-password', minlength: '10', maxlength: '128', required: true }),
      ...(create ? [role.field] : []), submit, message,
    );
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const fields = Object.fromEntries(new FormData(form));
      if (create) fields.role = roles[fields.role];
      submit.disabled = true;
      message.textContent = '';
      try {
        const result = await api('/api/auth/' + mode, { method: 'POST', body: fields });
        dialog.close();
        if (create) {
          notice.textContent = 'Cuenta creada. Ya puedes iniciar sesión.';
          openDialog('login');
        } else {
          setUser(result.user);
          notice.textContent = 'Sesión iniciada como ' + roleTitles[result.user.role] + '.';
        }
      } catch (error) {
        message.textContent = error.message;
      } finally {
        submit.disabled = false;
      }
    });
    const close = el('button', { className: 'dialog-close', type: 'button', 'aria-label': 'Cerrar ventana', text: '×' });
    close.addEventListener('click', () => dialog.close());
    dialog.replaceChildren(close, form);
    dialog.showModal();
  }

  function renderToolbar() {
    if (user) {
      toolbar.replaceChildren(el('span', { className: 'role-badge', text: roleTitles[user.role] }));
      return;
    }
    const login = el('button', { className: 'button button-outline', type: 'button', text: 'Iniciar sesión' });
    const register = el('button', { className: 'button', type: 'button', text: 'Crear cuenta' });
    login.addEventListener('click', () => openDialog('login'));
    register.addEventListener('click', () => openDialog('register'));
    toolbar.replaceChildren(login, register);
  }

  api('/api/auth/session').then(({ user }) => setUser(user)).catch(() => setUser(null));
}
