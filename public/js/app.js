const $ = (selector, root = document) => root.querySelector(selector);

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const formatEdad = (edad) => edad === 0 ? 'Menos de 1 año' : edad === 1 ? '1 año' : `${edad} años`;
const MAX_PET_IMAGES = 5;

// Color de la placa segun la especie; especies desconocidas reciben uno fijo segun su nombre
const TAG_COLORS = {perro: 'var(--brass)', gato: 'var(--sky)', conejo: 'var(--rose)', ave: 'var(--mint)'};
const PALETTE = Object.values(TAG_COLORS);
const colorFor = (text) => {
    const key = String(text).trim().toLowerCase();
    if (TAG_COLORS[key]) return TAG_COLORS[key];
    const hash = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return PALETTE[hash % PALETTE.length];
};

async function request(url, options) {
    let response;
    try {
        response = await fetch(url, options);
    } catch {
        throw new Error('No hay conexión con el servidor. Revisa que esté encendido.');
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? `El servidor respondió con el código ${response.status}`);
    return data;
}

let toastTimer;
function toast(message, type = 'ok') {
    const element = $('#toast');
    element.textContent = message;
    element.dataset.type = type;
    element.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { element.hidden = true; }, type === 'error' ? 6000 : 3500);
}

function renderPet(pet) {
    const [main] = pet.img;
    const description = `${pet.especie} ${pet.color}`;
    const thumbs = pet.img.length > 1
        ? `<div class="pet-thumbs">${pet.img.map((src, i) => `
            <button type="button" class="thumb" data-photo="${esc(src)}" aria-pressed="${i === 0}" aria-label="Ver foto ${i + 1} de ${pet.img.length}">
                <img src="${esc(src)}" alt="">
            </button>`).join('')}</div>`
        : '';

    return `
        <li class="pet-tag" data-id="${pet.id}" style="--tag: ${colorFor(pet.especie)}">
            <span class="pet-number">n.º ${pet.id}</span>
            <div class="pet-photo">
                ${main
                    ? `<img src="${esc(main)}" alt="Foto de ${esc(description)}" data-main>`
                    : `<span class="pet-initial" aria-hidden="true">${esc(pet.especie.charAt(0).toUpperCase())}</span>`}
            </div>
            ${thumbs}
            <h3 class="pet-name">${esc(pet.especie)}</h3>
            <dl class="pet-facts">
                <div><dt>Color</dt><dd>${esc(pet.color)}</dd></div>
                <div><dt>Edad</dt><dd>${formatEdad(pet.edad)}</dd></div>
                <div><dt>Sexo</dt><dd>${esc(capitalize(pet.sexo))}</dd></div>
            </dl>
            <div class="item-actions">
                <button type="button" class="btn-quiet" data-action="edit">Editar</button>
                <button type="button" class="btn-quiet danger" data-action="delete">Eliminar</button>
            </div>
        </li>`;
}

function renderUser(user) {
    const initials = `${user.firstname.charAt(0)}${user.lastname.charAt(0)}`.toUpperCase();
    return `
        <li class="user-row" data-id="${user.id}">
            <span class="avatar" style="--avatar: ${colorFor(user.username)}">
                ${user.avatar ? `<img src="${esc(user.avatar)}" alt="">` : esc(initials)}
            </span>
            <div>
                <p class="user-name">${esc(user.firstname)} ${esc(user.lastname)}</p>
                <p class="user-handle">@${esc(user.username)}</p>
            </div>
            <span class="user-id">n.º ${user.id}</span>
            <div class="item-actions">
                <button type="button" class="btn-quiet" data-action="edit">Editar</button>
                <button type="button" class="btn-quiet danger" data-action="delete">Eliminar</button>
            </div>
        </li>`;
}

const resources = {
    pets: {
        url: '/api/pets',
        render: renderPet,
        images: (pet) => pet.img,
        newTitle: 'Nueva mascota',
        createLabel: 'Registrar mascota',
        editTitle: (pet) => `Editar mascota n.º ${pet.id}`,
        created: 'Mascota registrada',
        updated: 'Cambios guardados',
        deleted: 'Mascota eliminada',
        empty: 'Todavía no hay mascotas. Registra la primera con el formulario.',
        confirmDelete: (pet) => `¿Eliminar la mascota n.º ${pet.id} (${pet.especie})? Sus fotos también se borrarán.`,
        fill(form, pet) {
            form.elements.especie.value = pet.especie;
            form.elements.color.value = pet.color;
            form.elements.edad.value = pet.edad;
            form.elements.sexo.value = pet.sexo;
        },
        validate(form) {
            const total = form.elements.img.files.length;
            if (total > MAX_PET_IMAGES) return `Puedes subir máximo ${MAX_PET_IMAGES} fotos por mascota. Elegiste ${total}.`;
        }
    },
    users: {
        url: '/api/users',
        render: renderUser,
        images: (user) => user.avatar ? [user.avatar] : [],
        newTitle: 'Nuevo usuario',
        createLabel: 'Registrar usuario',
        editTitle: (user) => `Editar a ${user.firstname}`,
        created: 'Usuario registrado',
        updated: 'Cambios guardados',
        deleted: 'Usuario eliminado',
        empty: 'Todavía no hay usuarios. Registra el primero con el formulario.',
        confirmDelete: (user) => `¿Eliminar a ${user.firstname} ${user.lastname} (@${user.username})? Su avatar también se borrará.`,
        fill(form, user) {
            form.elements.firstname.value = user.firstname;
            form.elements.lastname.value = user.lastname;
            form.elements.username.value = user.username;
        },
        // Al editar, la contrasena es opcional: si queda vacia no se cambia
        setEditing(form, editing) {
            form.elements.password.required = !editing;
            $('[data-password-hint]', form).textContent = editing
                ? 'Déjala vacía para conservar la actual.'
                : 'Se guarda cifrada y nunca se muestra.';
        }
    }
};

const state = {
    pets: {items: [], editingId: null},
    users: {items: [], editingId: null}
};

function showPreviews(ui, urls, caption) {
    ui.previews.innerHTML = urls.length
        ? `<p class="previews-caption">${esc(caption)}</p>${urls.map((url) => `<img src="${esc(url)}" alt="">`).join('')}`
        : '';
}

async function load(key, highlightId) {
    const {ui, url, render, empty} = resources[key];
    try {
        const items = await request(url);
        state[key].items = items;
        $(`[data-count="${key}"]`).textContent = items.length;
        ui.list.innerHTML = items.length ? items.map(render).join('') : `<li class="empty">${empty}</li>`;
        if (highlightId) ui.list.querySelector(`[data-id="${highlightId}"]`)?.classList.add('is-new');
    } catch (error) {
        ui.list.innerHTML = `<li class="empty">${esc(error.message)}</li>`;
    }
}

function startEdit(key, id) {
    const config = resources[key];
    const {ui} = config;
    const item = state[key].items.find((i) => i.id === id);
    if (!item) return;

    state[key].editingId = id;
    ui.form.reset();
    config.fill(ui.form, item);
    config.setEditing?.(ui.form, true);
    ui.title.textContent = config.editTitle(item);
    ui.submit.textContent = 'Guardar cambios';
    ui.cancel.hidden = false;
    ui.editOnly.forEach((element) => { element.hidden = false; });
    showPreviews(ui, config.images(item), 'Fotos actuales');
    ui.form.elements[0].focus();
}

function stopEdit(key) {
    const config = resources[key];
    const {ui} = config;

    state[key].editingId = null;
    ui.form.reset();
    config.setEditing?.(ui.form, false);
    ui.title.textContent = config.newTitle;
    ui.submit.textContent = config.createLabel;
    ui.cancel.hidden = true;
    ui.editOnly.forEach((element) => { element.hidden = true; });
    showPreviews(ui, [], '');
}

async function remove(key, id) {
    const config = resources[key];
    const item = state[key].items.find((i) => i.id === id);
    if (!item || !confirm(config.confirmDelete(item))) return;

    try {
        await request(`${config.url}/${id}`, {method: 'DELETE'});
        if (state[key].editingId === id) stopEdit(key);
        toast(config.deleted);
        await load(key);
    } catch (error) {
        toast(error.message, 'error');
    }
}

function setup(key) {
    const config = resources[key];
    const panel = document.getElementById(`panel-${key}`);
    const ui = {
        form: $('form', panel),
        list: $('[data-list]', panel),
        title: $('[data-form-title]', panel),
        submit: $('[type="submit"]', panel),
        cancel: $('[data-cancel]', panel),
        file: $('input[type="file"]', panel),
        dropzone: $('.dropzone', panel),
        previews: $('[data-previews]', panel),
        editOnly: panel.querySelectorAll('[data-edit-only]')
    };
    config.ui = ui;

    let previewUrls = [];
    ui.file.addEventListener('change', () => {
        previewUrls.forEach(URL.revokeObjectURL);
        const files = [...ui.file.files];
        previewUrls = files.map((file) => URL.createObjectURL(file));

        const editing = state[key].items.find((i) => i.id === state[key].editingId);
        if (files.length) showPreviews(ui, previewUrls, files.length === 1 ? 'Foto elegida' : `${files.length} fotos elegidas`);
        else showPreviews(ui, editing ? config.images(editing) : [], 'Fotos actuales');
    });

    ui.dropzone.addEventListener('dragover', (event) => {
        event.preventDefault();
        ui.dropzone.classList.add('is-over');
    });
    ui.dropzone.addEventListener('dragleave', () => ui.dropzone.classList.remove('is-over'));
    ui.dropzone.addEventListener('drop', (event) => {
        event.preventDefault();
        ui.dropzone.classList.remove('is-over');
        const files = [...event.dataTransfer.files].filter((file) => file.type.startsWith('image/'));
        const transfer = new DataTransfer();
        (ui.file.multiple ? files : files.slice(0, 1)).forEach((file) => transfer.items.add(file));
        ui.file.files = transfer.files;
        ui.file.dispatchEvent(new Event('change'));
    });

    ui.cancel.addEventListener('click', () => stopEdit(key));

    ui.form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const problem = config.validate?.(ui.form);
        if (problem) return toast(problem, 'error');

        const editingId = state[key].editingId;
        const body = new FormData(ui.form);
        if (!ui.file.files.length) body.delete(ui.file.name);
        if (editingId && body.get('password') === '') body.delete('password');

        ui.submit.disabled = true;
        try {
            const item = await request(editingId ? `${config.url}/${editingId}` : config.url, {
                method: editingId ? 'PUT' : 'POST',
                body
            });
            toast(editingId ? config.updated : config.created);
            stopEdit(key);
            await load(key, item.id);
        } catch (error) {
            toast(error.message, 'error');
        } finally {
            ui.submit.disabled = false;
        }
    });

    ui.list.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        const card = button?.closest('[data-id]');
        if (!card) return;
        const id = Number(card.dataset.id);

        if (button.dataset.action === 'edit') startEdit(key, id);
        if (button.dataset.action === 'delete') remove(key, id);
        if (button.dataset.photo) {
            $('[data-main]', card).src = button.dataset.photo;
            card.querySelectorAll('[data-photo]').forEach((thumb) => thumb.setAttribute('aria-pressed', thumb === button));
        }
    });
}

const tabs = [...document.querySelectorAll('[role="tab"]')];

function selectTab(tab) {
    for (const current of tabs) {
        const selected = current === tab;
        current.setAttribute('aria-selected', selected);
        current.tabIndex = selected ? 0 : -1;
        document.getElementById(current.getAttribute('aria-controls')).hidden = !selected;
    }
    history.replaceState(null, '', tab.dataset.hash);
}

tabs.forEach((tab) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        const step = event.key === 'ArrowRight' ? 1 : -1;
        const next = tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length];
        selectTab(next);
        next.focus();
    });
});

selectTab(tabs.find((tab) => tab.dataset.hash === location.hash) ?? tabs[0]);

for (const key of Object.keys(resources)) {
    setup(key);
    load(key);
}
