import { api, el, selectField } from './ui.js';

const roles = { Generador: 'generator', Recolector: 'collector' };

function inputField(label, attributes) {
  return el('label', { className: 'field' }, el('span', { text: label }), el('input', attributes));
}

export function initAuth() {
  const toolbar = document.querySelector('#account-nav');
  const notice = document.querySelector('#account-notice');
  const dialog = document.querySelector('#account-dialog');

  function openRegister() {
    const role = selectField('Rol', 'role', Object.keys(roles), { placeholder: 'Elige tu rol', required: true });
    role.control.value = '';
    const message = el('p', { className: 'status', role: 'status' });
    const submit = el('button', { className: 'button', type: 'submit', text: 'Crear cuenta' });
    const form = el('form', { className: 'form-stack' },
      el('h2', { id: 'account-title', text: 'Crear cuenta' }),
      inputField('Correo electrónico', { name: 'email', type: 'email', autocomplete: 'email', maxlength: '254', required: true }),
      inputField('Contraseña', { name: 'password', type: 'password', autocomplete: 'new-password', minlength: '10', maxlength: '128', required: true }),
      role.field, submit, message,
    );
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const fields = Object.fromEntries(new FormData(form));
      submit.disabled = true;
      message.textContent = '';
      try {
        await api('/api/auth/register', { method: 'POST', body: { ...fields, role: roles[fields.role] } });
        dialog.close();
        notice.textContent = 'Cuenta creada.';
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

  const register = el('button', { className: 'button button-outline', type: 'button', text: 'Crear cuenta' });
  register.addEventListener('click', openRegister);
  toolbar.replaceChildren(register);
}
