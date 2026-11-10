/* Нейропульт — скрипты сайта */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Шапка: тень при прокрутке ---------- */
  var header = $('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Мобильное меню ---------- */
  var burger = $('.burger');
  var menu = $('.mobile-menu');
  if (burger && menu) {
    var setMenu = function (open) {
      menu.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      $('use', burger).setAttribute('href', 'assets/images/icons.svg#' + (open ? 'x' : 'menu'));
    };
    burger.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1024) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---------- Макеты интерфейса: масштаб под ширину колонки ---------- */
  var frames = $$('.mock-frame');
  var fitMocks = function () {
    frames.forEach(function (frame) {
      var mock = frame.firstElementChild;
      var designWidth = parseInt(frame.dataset.mockWidth, 10) || 940;
      var available = frame.clientWidth;
      if (available < 600) {
        mock.classList.add('is-fluid');
        mock.style.width = '';
        mock.style.transform = '';
        frame.style.height = '';
        return;
      }
      mock.classList.remove('is-fluid');
      var scale = Math.min(1, available / designWidth);
      mock.style.width = designWidth + 'px';
      mock.style.transform = 'scale(' + scale + ')';
      frame.style.height = Math.ceil(mock.offsetHeight * scale) + 'px';
    });
  };
  if (frames.length) {
    fitMocks();
    window.addEventListener('resize', fitMocks);
    window.addEventListener('load', fitMocks);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitMocks);
  }

  /* ---------- Появление блоков при прокрутке ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Переключатели ---------- */
  $$('.toggle').forEach(function (t) {
    t.addEventListener('click', function () {
      t.setAttribute('aria-pressed', t.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    });
  });

  /* ---------- Демо-чат: сообщения появляются по очереди ---------- */
  $$('[data-chat]').forEach(function (chat) {
    var msgs = $$('.msg', chat);
    var play = function () {
      msgs.forEach(function (m, i) {
        setTimeout(function () { m.classList.add('is-shown'); }, reduceMotion ? 0 : 350 + i * 900);
      });
    };
    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { play(); cio.disconnect(); }
      }, { threshold: 0.3 });
      cio.observe(chat);
    } else {
      play();
    }
  });

  /* ---------- Тарифы: месяц / год ---------- */
  var billing = $('[data-billing]');
  if (billing) {
    var buttons = $$('button', billing);
    var setPeriod = function (period) {
      buttons.forEach(function (b) { b.classList.toggle('is-active', b.dataset.period === period); });
      $$('[data-month]').forEach(function (el) {
        var value = el.getAttribute('data-' + period);
        if (value !== null) el.textContent = value;
      });
    };
    buttons.forEach(function (b) { b.addEventListener('click', function () { setPeriod(b.dataset.period); }); });
  }

  /* ---------- Форма заявки: тариф из ссылки (?plan=standard) ---------- */
  var planSelect = $('#f-plan');
  if (planSelect) {
    var plan = new URLSearchParams(window.location.search).get('plan');
    if (plan && $('option[value="' + plan.replace(/[^a-z]/g, '') + '"]', planSelect)) planSelect.value = plan;
  }

  /* ---------- Формы заявки ---------- */
  $$('form[data-validate]').forEach(function (form) {
    var card = form.closest('.form-card');
    var validateField = function (field) {
      var input = $('input, select, textarea', field);
      if (!input) return true;
      var ok = input.checkValidity();
      if (ok && input.type === 'tel' && input.value.trim()) {
        ok = input.value.replace(/\D/g, '').length >= 10;
      }
      field.classList.toggle('is-invalid', !ok);
      return ok;
    };
    $$('.field', form).forEach(function (field) {
      var input = $('input, select, textarea', field);
      if (input) {
        input.addEventListener('blur', function () { if (input.value) validateField(field); });
        input.addEventListener('input', function () { if (field.classList.contains('is-invalid')) validateField(field); });
      }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = $$('.field', form).map(validateField).every(Boolean);
      var consent = $('[name="consent"]', form);
      if (consent && !consent.checked) {
        valid = false;
        consent.closest('.consent').style.color = 'var(--red)';
      }
      if (!valid) {
        var firstBad = $('.is-invalid input, .is-invalid select', form);
        if (firstBad) firstBad.focus();
        return;
      }
      var btn = $('[type="submit"]', form);
      btn.disabled = true;
      btn.textContent = 'Отправляем…';
      setTimeout(function () {
        if (card) card.classList.add('is-sent');
        if (card) card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      }, 700);
    });
  });

  /* ---------- Вход: переход в рабочий контур ---------- */
  var login = $('[data-login]');
  if (login) {
    var input = $('input', login);
    input.addEventListener('input', function () {
      input.value = input.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    });
    login.addEventListener('submit', function (e) {
      e.preventDefault();
      var sub = input.value.trim();
      if (!sub) { input.focus(); login.querySelector('.domain-input').style.borderColor = 'var(--red)'; return; }
      window.location.href = 'https://' + sub + '.neuropult.ru/';
    });
  }

  /* ---------- Маска телефона: +7 (999) 000-00-00 ---------- */
  var formatPhone = function (value) {
    var d = value.replace(/\D/g, '');
    if (!d) return '';
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    var out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ')';
    if (d.length > 4) out += ' ' + d.slice(4, 7);
    if (d.length > 7) out += '-' + d.slice(7, 9);
    if (d.length > 9) out += '-' + d.slice(9, 11);
    return out;
  };
  var bindPhoneMask = function (input) {
    input.addEventListener('input', function () { input.value = formatPhone(input.value); });
  };
  $$('input[type="tel"]').forEach(bindPhoneMask);

  /* ---------- Модальное окно заявки ---------- */
  // Все ссылки на demo.html открывают модальное окно (без JS остаётся обычный переход на страницу)
  var PLANS = {
    start: 'Старт', standard: 'Стандарт', max: 'Максимум',
    corporate: 'Корпоративный', extended: 'Расширенный', custom: 'Индивидуальный'
  };
  var CLOUD_PLANS = ['start', 'standard', 'max'];
  var ICONS = 'assets/images/icons.svg#';
  var icon = function (name) { return '<svg class="i" aria-hidden="true"><use href="' + ICONS + name + '"/></svg>'; };

  var modal = null;
  var lastFocus = null;

  var buildModal = function () {
    var el = document.createElement('div');
    el.className = 'modal';
    el.hidden = true;
    el.innerHTML =
      '<div class="modal__backdrop" data-close></div>' +
      '<div class="modal__dialog" role="dialog" aria-modal="true" aria-labelledby="lead-title">' +
        '<button class="modal__close" type="button" data-close aria-label="Закрыть">' + icon('x') + '</button>' +
        '<div class="modal__view" data-view="form">' +
          '<div class="modal__head">' +
            '<span class="modal__mark"><img src="assets/images/favicon.svg" alt=""></span>' +
            '<div><h2 class="modal__title" id="lead-title">Свяжемся с вами</h2>' +
            '<p class="modal__lead">Оставьте контакты — ответим в течение рабочего дня и подберём решение под вашу задачу.</p></div>' +
          '</div>' +
          '<div class="modal__plan" hidden>' + icon('sparkles') + '<span></span></div>' +
          '<form class="modal__form" novalidate>' +
            '<input type="hidden" name="plan">' +
            '<div class="mfield"><label for="lm-name">Имя</label>' +
              '<div class="mfield__control">' + icon('user') + '<input id="lm-name" name="name" type="text" placeholder="Как к вам обращаться" autocomplete="name" required></div>' +
              '<span class="mfield__error">Укажите имя</span></div>' +
            '<div class="mfield"><label for="lm-phone">Телефон</label>' +
              '<div class="mfield__control">' + icon('phone') + '<input id="lm-phone" name="phone" type="tel" inputmode="tel" placeholder="+7 (999) 000-00-00" autocomplete="tel" required></div>' +
              '<span class="mfield__error">Введите номер полностью</span></div>' +
            '<div class="mfield mfield--full"><label for="lm-company">Компания <span class="opt">— необязательно</span></label>' +
              '<div class="mfield__control">' + icon('building') + '<input id="lm-company" name="company" type="text" placeholder="Название компании" autocomplete="organization"></div></div>' +
            '<div class="mfield mfield--full"><label for="lm-comment">Комментарий <span class="opt">— необязательно</span></label>' +
              '<div class="mfield__control">' + icon('message') + '<textarea id="lm-comment" name="comment" rows="3" placeholder="Какую задачу хотите поручить AI? Например, еженедельные отчёты по продажам из CRM"></textarea></div></div>' +
            '<button class="btn btn--primary btn--lg btn--block modal__submit" type="submit"><span>Отправить заявку</span>' + icon('send') + '</button>' +
            '<p class="modal__note">' + icon('lock') + '<span>Нажимая кнопку, вы соглашаетесь с <a href="#">политикой конфиденциальности</a>. Никакого спама — только ответ на заявку.</span></p>' +
          '</form>' +
        '</div>' +
        '<div class="modal__success" data-view="success" hidden>' +
          '<svg class="success-mark" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="25"/><path d="M15 27l7 7 15-15"/></svg>' +
          '<h2>Заявка отправлена</h2>' +
          '<p data-success-text></p>' +
          '<button class="btn btn--primary" type="button" data-close>Хорошо</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);

    var form = $('form', el);
    bindPhoneMask($('#lm-phone', el));

    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) closeModal();
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeModal(); return; }
      if (e.key !== 'Tab') return;
      var focusable = $$('button, input:not([type="hidden"]), textarea, a[href]', el).filter(function (n) { return n.offsetParent !== null; });
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    var check = function (input) {
      var field = input.closest('.mfield');
      var ok = input.name === 'phone'
        ? input.value.replace(/\D/g, '').length === 11
        : input.value.trim().length >= 2;
      field.classList.toggle('is-invalid', !ok);
      return ok;
    };
    $$('[required]', form).forEach(function (input) {
      input.addEventListener('input', function () {
        if (input.closest('.mfield').classList.contains('is-invalid')) check(input);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var invalid = $$('[required]', form).filter(function (input) { return !check(input); });
      if (invalid.length) { invalid[0].focus(); return; }
      var btn = $('.modal__submit', form);
      btn.classList.add('is-loading');
      btn.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>Отправляем…</span>';
      setTimeout(function () {
        var name = form.elements.name.value.trim();
        $('[data-success-text]', el).textContent =
          'Спасибо, ' + name + '! Мы свяжемся с вами по номеру ' + form.elements.phone.value + ' в течение рабочего дня.';
        $('[data-view="form"]', el).hidden = true;
        var success = $('[data-view="success"]', el);
        success.hidden = false;
        success.classList.add('is-animated');
        $('[data-close].btn', success).focus();
        el.dataset.sent = '1';
      }, 900);
    });
    return el;
  };

  var resetModal = function () {
    var form = $('form', modal);
    form.reset();
    $$('.mfield', form).forEach(function (f) { f.classList.remove('is-invalid'); });
    var btn = $('.modal__submit', form);
    btn.classList.remove('is-loading');
    btn.innerHTML = '<span>Отправить заявку</span>' + icon('send');
    $('[data-view="form"]', modal).hidden = false;
    var success = $('[data-view="success"]', modal);
    success.hidden = true;
    success.classList.remove('is-animated');
    delete modal.dataset.sent;
  };

  var openModal = function (trigger) {
    if (!modal) modal = buildModal();
    if (modal.dataset.sent) resetModal();

    var href = trigger.getAttribute('href') || '';
    var plan = (href.split('?')[1] || '').replace(/.*plan=([a-z]+).*/, '$1');
    if (!PLANS[plan]) plan = '';
    var text = trigger.textContent.toLowerCase();
    var title = 'Свяжемся с вами';
    if (plan) title = CLOUD_PLANS.indexOf(plan) > -1 ? 'Подключение тарифа' : 'Обсудим внедрение';
    else if (text.indexOf('демо') > -1) title = 'Запрос демонстрации';
    else if (text.indexOf('пилот') > -1) title = 'Обсудим пилот';
    else if (text.indexOf('внедрен') > -1) title = 'Обсудим внедрение';

    $('#lead-title', modal).textContent = title;
    var chip = $('.modal__plan', modal);
    chip.hidden = !plan;
    $('span', chip).textContent = plan ? 'Тариф «' + PLANS[plan] + '»' : '';
    $('form', modal).elements.plan.value = plan;

    lastFocus = trigger;
    var scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = scrollbar ? scrollbar + 'px' : '';
    document.body.classList.add('modal-open');
    modal.hidden = false;
    requestAnimationFrame(function () {
      modal.classList.add('is-open');
      setTimeout(function () { $('#lm-name', modal).focus({ preventScroll: true }); }, reduceMotion ? 0 : 180);
    });
  };

  var closeModal = function () {
    if (!modal || modal.hidden) return;
    modal.classList.remove('is-open');
    setTimeout(function () {
      modal.hidden = true;
      document.body.classList.remove('modal-open');
      document.body.style.paddingRight = '';
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }, reduceMotion ? 0 : 260);
  };

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href]');
    if (!link || !/^demo\.html(\?|$)/.test(link.getAttribute('href'))) return;
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openModal(link);
  });

  /* ---------- Год в подвале ---------- */
  $$('[data-current-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
