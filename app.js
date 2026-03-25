(function () {
    'use strict';

    let paperData = [];
    let selectedType = null;
    let selectedSize = null;
    let photos = [];
    let userPhone = null;

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // Загрузка данных
    async function loadPaperData() {
        try {
            const res = await fetch('./paper.json');
            paperData = await res.json();
            renderPaperTypes();
        } catch (e) {
            $('#paper-types').innerHTML =
                '<p style="color:red">Ошибка загрузки данных</p>';
        }
    }

    // Шаг 1: Запрос контакта
    function setupContactRequest() {
        // Сообщаем MAX, что приложение готово
        window.WebApp.ready();

        $('#btn-request-contact').addEventListener('click', () => {
            window.WebApp.requestContact();
        });

        window.WebApp.onEvent('contact_requested', (data) => {
            if (data.status === 'sent') {
                userPhone = data.phone;
                $('#contact-phone').textContent = userPhone;
                $('#contact-result').hidden = false;
                $('#btn-request-contact').textContent = 'Изменить номер';
                $('#btn-next-1').disabled = false;
            }
        });
    }

    // Шаг 2: Типы бумаги
    function renderPaperTypes() {
        const container = $('#paper-types');
        container.innerHTML = paperData
            .map(
                (paper, i) =>
                    `<div class="card" data-index="${i}">
        <span class="card-name">${paper.name}</span>
        <span class="card-price">${paper.sizes.length} размеров</span>
      </div>`,
            )
            .join('');

        container.querySelectorAll('.card').forEach((card) => {
            card.addEventListener('click', () => {
                container
                    .querySelectorAll('.card')
                    .forEach((c) => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedType = paperData[card.dataset.index];
                selectedSize = null;
                $('#btn-next-2').disabled = false;
            });
        });
    }

    // Шаг 3: Размеры
    function renderSizes() {
        const container = $('#paper-sizes');
        container.innerHTML = selectedType.sizes
            .map(
                (s, i) =>
                    `<div class="card" data-index="${i}">
        <span class="card-name">${s.size}</span>
        <span class="card-price">${s.price} руб.</span>
      </div>`,
            )
            .join('');

        container.querySelectorAll('.card').forEach((card) => {
            card.addEventListener('click', () => {
                container
                    .querySelectorAll('.card')
                    .forEach((c) => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedSize = selectedType.sizes[card.dataset.index];
                $('#btn-next-3').disabled = false;
            });
        });

        $('#btn-next-3').disabled = true;
    }

    // Шаг 4: Загрузка фото
    function setupUpload() {
        const area = $('#upload-area');
        const input = $('#file-input');

        area.addEventListener('click', () => input.click());

        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('dragover');
        });

        area.addEventListener('dragleave', () => {
            area.classList.remove('dragover');
        });

        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            addFiles(e.dataTransfer.files);
        });

        input.addEventListener('change', () => {
            addFiles(input.files);
            input.value = '';
        });
    }

    function addFiles(fileList) {
        for (const file of fileList) {
            if (file.type.startsWith('image/')) {
                photos.push(file);
            }
        }
        renderPhotos();
    }

    function renderPhotos() {
        const grid = $('#photo-grid');
        const count = $('#photo-count');

        if (photos.length === 0) {
            count.textContent = '';
            grid.innerHTML = '';
            $('#btn-next-4').disabled = true;
            return;
        }

        count.textContent = `Загружено: ${photos.length} фото`;
        $('#btn-next-4').disabled = false;

        grid.innerHTML = photos
            .map(
                (_, i) =>
                    `<div class="photo-thumb" data-index="${i}">
        <img>
        <button class="photo-remove" data-index="${i}">&times;</button>
      </div>`,
            )
            .join('');

        grid.querySelectorAll('.photo-thumb').forEach((thumb, i) => {
            const img = thumb.querySelector('img');
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.readAsDataURL(photos[i]);
        });

        grid.querySelectorAll('.photo-remove').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                photos.splice(parseInt(btn.dataset.index), 1);
                renderPhotos();
            });
        });
    }

    // Шаг 5: Итог
    function renderSummary() {
        const total = selectedSize.price * photos.length;

        $('#summary').innerHTML = `
      <div class="summary-row">
        <span class="summary-label">Телефон</span>
        <span class="summary-value">${userPhone}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Тип бумаги</span>
        <span class="summary-value">${selectedType.name}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Размер</span>
        <span class="summary-value">${selectedSize.size}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Цена за фото</span>
        <span class="summary-value">${selectedSize.price} руб.</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Количество фото</span>
        <span class="summary-value">${photos.length}</span>
      </div>
      <div class="summary-row total">
        <span class="summary-label">Итого</span>
        <span class="summary-value">${total} руб.</span>
      </div>
    `;

        const photosContainer = $('#summary-photos');
        photosContainer.innerHTML = `
      <div class="summary-photos-title">Ваши фотографии:</div>
      <div class="summary-photos-grid"></div>
    `;
        const grid = photosContainer.querySelector('.summary-photos-grid');

        photos.forEach((file) => {
            const img = document.createElement('img');
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
            grid.appendChild(img);
        });
    }

    // Навигация
    function goToStep(step) {
        $$('.wizard-step').forEach((s) => s.classList.remove('active'));

        if (step === 'success') {
            $('#step-success').classList.add('active');
            $$('.progress-bar .step-indicator').forEach((s) =>
                s.classList.remove('active'),
            );
            return;
        }

        $(`#step-${step}`).classList.add('active');

        // Обновить прогресс-бар
        const indicators = $$('.progress-bar .step-indicator');
        const lines = $$('.progress-bar .step-line');

        indicators.forEach((ind, i) => {
            const s = i + 1;
            ind.classList.remove('active', 'done');
            if (s === step) ind.classList.add('active');
            else if (s < step) ind.classList.add('done');
        });

        lines.forEach((line, i) => {
            line.classList.toggle('done', i + 1 < step);
        });

        // Подготовка контента шага
        if (step === 3) renderSizes();
        if (step === 5) renderSummary();
    }

    function resetWizard() {
        selectedType = null;
        selectedSize = null;
        photos = [];
        userPhone = null;
        $('#btn-next-1').disabled = true;
        $('#btn-next-2').disabled = true;
        $('#contact-result').hidden = true;
        $('#contact-phone').textContent = '';
        $('#btn-request-contact').textContent = 'Поделиться контактом';
        $('#paper-types')
            .querySelectorAll('.card')
            .forEach((c) => c.classList.remove('selected'));
        $('#photo-grid').innerHTML = '';
        $('#photo-count').textContent = '';
        goToStep(1);
    }

    // Инициализация
    function init() {
        loadPaperData();
        setupContactRequest();
        setupUpload();

        // Навигация вперёд
        $('#btn-next-1').addEventListener('click', () => goToStep(2));
        $('#btn-next-2').addEventListener('click', () => goToStep(3));
        $('#btn-next-3').addEventListener('click', () => goToStep(4));
        $('#btn-next-4').addEventListener('click', () => goToStep(5));

        // Навигация назад
        $('#btn-back-2').addEventListener('click', () => goToStep(1));
        $('#btn-back-3').addEventListener('click', () => goToStep(2));
        $('#btn-back-4').addEventListener('click', () => goToStep(3));
        $('#btn-back-5').addEventListener('click', () => goToStep(4));

        // Отправить заявку
        $('#btn-submit').addEventListener('click', () => goToStep('success'));

        // Новый заказ
        $('#btn-new-order').addEventListener('click', resetWizard);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
