// BuySeek - App principal
(function () {
    'use strict';

    // Estado
    let requests = [...BUYER_REQUESTS];
    let activeCategory = 'autos';
    let activeFilters = {};
    let currentChatRole = 'buyer';
    let searchTimeout = null;
    let offers = JSON.parse(localStorage.getItem('buyseek_offers') || '[]');
    let chats = JSON.parse(localStorage.getItem('buyseek_chats') || '[]');

    const CURRENT_SELLER_ID = 'current-seller';
    const CURRENT_BUYER_NAME = 'Tú';

    // ===== UTILIDADES =====
    function formatMoney(n, period = '') {
        return '$' + n.toLocaleString('en-US') + period;
    }

    function getInitials(name) {
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }

    function renderStars(rating, showText = true) {
        const full = Math.floor(rating);
        const half = rating % 1 >= 0.5;
        let html = '<span class="star-display">';
        for (let i = 1; i <= 5; i++) {
            if (i <= full) html += '<i class="fas fa-star"></i>';
            else if (i === full + 1 && half) html += '<i class="fas fa-star-half-alt"></i>';
            else html += '<i class="fas fa-star empty"></i>';
        }
        html += '</span>';
        if (showText) html += `<span class="rating-text">${rating.toFixed(1)}</span>`;
        return html;
    }

    function showToast(msg, type = 'success') {
        const toast = document.getElementById('toast');
        const msgEl = document.getElementById('toast-msg');
        const icon = toast.querySelector('i');
        msgEl.textContent = msg;
        icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-info-circle';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
    }

    function openModal(id) {
        document.getElementById(id).classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(id) {
        document.getElementById(id).classList.remove('open');
        document.body.style.overflow = '';
    }

    function closeAllModals() {
        document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
        document.body.style.overflow = '';
    }

    function saveOffers() {
        localStorage.setItem('buyseek_offers', JSON.stringify(offers));
    }

    function saveChats() {
        localStorage.setItem('buyseek_chats', JSON.stringify(chats));
    }

    function formatTime(iso) {
        const d = new Date(iso);
        return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    }

    function formatDate(iso) {
        const d = new Date(iso);
        return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }

    function snapshotFromRequest(req) {
        return {
            requestBudget: req.budget,
            requestBudgetPeriod: req.budgetPeriod || '',
            requestRequirements: req.requirements,
            requestLocation: req.location
        };
    }

    function getRequestSnapshot(offer) {
        const req = requests.find(r => r.id === offer.requestId);
        return {
            title: offer.requestTitle,
            image: offer.requestImage || req?.image,
            budget: offer.requestBudget ?? req?.budget ?? 0,
            budgetPeriod: offer.requestBudgetPeriod ?? req?.budgetPeriod ?? '',
            requirements: offer.requestRequirements ?? req?.requirements ?? '—',
            location: offer.requestLocation ?? req?.location ?? '—'
        };
    }

    function getPriceDiff(budget, price, perspective = 'buyer') {
        const diff = price - budget;
        const abs = Math.abs(diff);
        const ref = perspective === 'buyer' ? 'tu presupuesto' : 'presupuesto del comprador';
        if (diff < 0) {
            return {
                class: 'diff-under',
                icon: 'fa-arrow-down',
                label: formatMoney(abs) + ' bajo ' + ref
            };
        }
        if (diff === 0) {
            return { class: 'diff-at', icon: 'fa-equals', label: 'Igual al presupuesto' };
        }
        return {
            class: 'diff-over',
            icon: 'fa-arrow-up',
            label: formatMoney(abs) + ' sobre ' + ref
        };
    }

    function renderOfferCompare(offer, perspective = 'buyer') {
        const req = getRequestSnapshot(offer);
        const period = req.budgetPeriod || '';
        const priceDiff = getPriceDiff(req.budget, offer.price, perspective);
        const isBuyer = perspective === 'buyer';

        return `
        <div class="offer-compare">
            <div class="compare-header">
                <i class="fas fa-balance-scale"></i> ${isBuyer ? 'Tu solicitud vs. esta oferta' : 'Solicitud del comprador vs. tu oferta'}
            </div>
            <div class="compare-grid">
                <div class="compare-col compare-yours">
                    <span class="compare-label"><i class="fas fa-search"></i> ${isBuyer ? 'Lo que pediste' : 'Lo que pidió'}</span>
                    <div class="compare-item">
                        <span class="compare-key">Presupuesto</span>
                        <span class="compare-val">${formatMoney(req.budget, period)}</span>
                    </div>
                    <div class="compare-item">
                        <span class="compare-key">Ubicación</span>
                        <span class="compare-val">${req.location}</span>
                    </div>
                    <div class="compare-item">
                        <span class="compare-key">Requisitos</span>
                        <span class="compare-val compare-text">${req.requirements}</span>
                    </div>
                </div>
                <div class="compare-vs"><i class="fas fa-arrows-alt-h"></i></div>
                <div class="compare-col compare-theirs">
                    <span class="compare-label"><i class="fas fa-store"></i> ${isBuyer ? 'Lo que ofrece' : 'Tu oferta'}</span>
                    <div class="compare-item compare-highlight">
                        <span class="compare-key">Precio</span>
                        <span class="compare-val offer-price-val">${formatMoney(offer.price)}</span>
                        <span class="price-diff-badge ${priceDiff.class}">
                            <i class="fas ${priceDiff.icon}"></i> ${priceDiff.label}
                        </span>
                    </div>
                    <div class="compare-item">
                        <span class="compare-key">Vendedor</span>
                        <span class="compare-val">${offer.sellerName}</span>
                    </div>
                    <div class="compare-item">
                        <span class="compare-key">Propuesta</span>
                        <span class="compare-val compare-text">${offer.message}</span>
                    </div>
                </div>
            </div>
            <button class="btn-compare-detail" data-action="compare-detail" data-id="${offer.id}">
                <i class="fas fa-expand-alt"></i> Ver comparación completa
            </button>
        </div>`;
    }

    function openCompareModal(offerId) {
        const offer = offers.find(o => o.id === offerId);
        if (!offer) return;

        const req = getRequestSnapshot(offer);
        const period = req.budgetPeriod || '';
        const priceDiff = getPriceDiff(req.budget, offer.price);

        document.getElementById('compare-content').innerHTML = `
            <div class="compare-modal-head">
                <h2>Comparación de oferta</h2>
                <p>${req.title}</p>
            </div>
            <div class="compare-modal-images">
                <div class="compare-img-block">
                    <img src="${req.image}" alt="${req.title}" onerror="this.src='images/ferrari-488.jpg'">
                    <span class="compare-img-label"><i class="fas fa-search"></i> Tu solicitud</span>
                </div>
                <div class="compare-img-vs"><i class="fas fa-arrows-alt-h"></i></div>
                <div class="compare-img-block compare-img-offer">
                    <div class="compare-offer-price">${formatMoney(offer.price)}</div>
                    <span class="compare-img-label"><i class="fas fa-store"></i> Oferta de ${offer.sellerName}</span>
                </div>
            </div>
            <span class="price-diff-badge ${priceDiff.class} compare-modal-badge">
                <i class="fas ${priceDiff.icon}"></i> ${priceDiff.label}
            </span>
            <div class="compare-modal-table">
                <div class="compare-modal-row compare-modal-header">
                    <span>Tu solicitud</span>
                    <span>Oferta del vendedor</span>
                </div>
                <div class="compare-modal-row">
                    <div>
                        <small>Presupuesto máximo</small>
                        <strong>${formatMoney(req.budget, period)}</strong>
                    </div>
                    <div>
                        <small>Precio ofertado</small>
                        <strong class="offer-price-val">${formatMoney(offer.price)}</strong>
                    </div>
                </div>
                <div class="compare-modal-row">
                    <div>
                        <small>Ubicación</small>
                        <p>${req.location}</p>
                    </div>
                    <div>
                        <small>Vendedor</small>
                        <p>${offer.sellerName}</p>
                    </div>
                </div>
                <div class="compare-modal-row compare-modal-text">
                    <div>
                        <small>Requisitos</small>
                        <p>${req.requirements}</p>
                    </div>
                    <div>
                        <small>Propuesta</small>
                        <p>${offer.message}</p>
                    </div>
                </div>
            </div>
            <div class="compare-modal-actions">
                ${offer.status === 'pendiente' ? `
                    <button class="btn-accept" data-action="accept-offer" data-id="${offer.id}">
                        <i class="fas fa-check"></i> Aceptar oferta
                    </button>
                    <button class="btn-reject" data-action="reject-offer" data-id="${offer.id}">
                        <i class="fas fa-times"></i> Rechazar
                    </button>
                ` : ''}
            </div>`;

        document.querySelectorAll('#compare-content [data-action="accept-offer"]').forEach(btn => {
            btn.addEventListener('click', () => {
                closeModal('compare-modal');
                acceptOffer(btn.dataset.id);
            });
        });
        document.querySelectorAll('#compare-content [data-action="reject-offer"]').forEach(btn => {
            btn.addEventListener('click', () => {
                closeModal('compare-modal');
                rejectOffer(btn.dataset.id);
            });
        });

        openModal('compare-modal');
    }

    function enrichLegacyOffers() {
        let changed = false;
        offers.forEach(o => {
            if (o.requestBudget != null) return;
            const req = requests.find(r => r.id === o.requestId);
            if (!req) return;
            Object.assign(o, snapshotFromRequest(req));
            changed = true;
        });
        if (changed) saveOffers();
    }

    function bindCompareActions(container) {
        container.querySelectorAll('[data-action="compare-detail"]').forEach(btn => {
            btn.addEventListener('click', () => openCompareModal(btn.dataset.id));
        });
    }

    // ===== OFERTAS =====
    function openOfferModal(requestId) {
        const req = requests.find(r => r.id === requestId);
        if (!req) return;

        document.getElementById('offer-request-id').value = requestId;
        document.getElementById('offer-modal-subtitle').textContent =
            'Para: ' + req.title + ' — Presupuesto ' + formatMoney(req.budget, req.budgetPeriod || '');
        document.getElementById('offer-seller-name').value = localStorage.getItem('buyseek_seller_name') || 'Luxury Motors Miami';
        document.getElementById('offer-price').value = '';
        document.getElementById('offer-message').value = '';

        closeModal('detail-modal');
        openModal('offer-modal');
    }

    function submitOffer(e) {
        e.preventDefault();

        const requestId = document.getElementById('offer-request-id').value;
        const req = requests.find(r => r.id === requestId);
        if (!req) return;

        const sellerName = document.getElementById('offer-seller-name').value.trim();
        const price = parseInt(document.getElementById('offer-price').value);
        const message = document.getElementById('offer-message').value.trim();

        if (!sellerName || !price || !message) {
            showToast('Completa todos los campos de la oferta');
            return;
        }

        localStorage.setItem('buyseek_seller_name', sellerName);

        const offer = {
            id: 'offer-' + Date.now(),
            requestId: requestId,
            requestTitle: req.title,
            requestImage: req.image,
            buyerName: req.buyer.name,
            sellerId: CURRENT_SELLER_ID,
            sellerName: sellerName,
            price: price,
            message: message,
            status: 'pendiente',
            createdAt: new Date().toISOString(),
            ...snapshotFromRequest(req)
        };

        offers.unshift(offer);
        saveOffers();

        req.offers = (req.offers || 0) + 1;

        closeModal('offer-modal');
        showToast('¡Oferta enviada! El comprador la revisará pronto.');
        renderSentOffers();
        renderReceivedOffers();
        updateBadges();
        renderListings();
    }

    function acceptOffer(offerId) {
        const offer = offers.find(o => o.id === offerId);
        if (!offer || offer.status !== 'pendiente') return;

        offer.status = 'aceptada';
        offer.acceptedAt = new Date().toISOString();

        offers.filter(o => o.requestId === offer.requestId && o.id !== offerId && o.status === 'pendiente')
            .forEach(o => { o.status = 'rechazada'; });

        saveOffers();
        createChatFromOffer(offer);

        showToast('Oferta aceptada. Se abrió el chat con ' + offer.sellerName);
        renderReceivedOffers();
        renderSentOffers();
        renderChatsList();
        updateBadges();

        const chat = chats.find(c => c.offerId === offerId);
        if (chat) {
            document.querySelector('[data-buyer-panel="chats"]').click();
            setTimeout(() => openChat(chat.id, 'buyer'), 300);
        }
    }

    function rejectOffer(offerId) {
        const offer = offers.find(o => o.id === offerId);
        if (!offer) return;
        offer.status = 'rechazada';
        saveOffers();
        showToast('Oferta rechazada');
        renderReceivedOffers();
        renderSentOffers();
        updateBadges();
    }

    function createChatFromOffer(offer) {
        const existing = chats.find(c => c.offerId === offer.id);
        if (existing) return existing;

        const chat = {
            id: 'chat-' + Date.now(),
            offerId: offer.id,
            requestId: offer.requestId,
            requestTitle: offer.requestTitle,
            buyerName: offer.buyerName,
            sellerName: offer.sellerName,
            sellerId: offer.sellerId,
            messages: [
                {
                    from: 'system',
                    text: 'Oferta aceptada. ' + offer.sellerName + ' ofreció ' + formatMoney(offer.price) + '. ¡Pueden coordinar los detalles!',
                    time: new Date().toISOString()
                },
                {
                    from: 'seller',
                    text: '¡Hola! Gracias por aceptar mi oferta. Tengo disponible lo que buscas. ¿Cuándo podemos hablar?',
                    time: new Date().toISOString()
                }
            ]
        };

        chats.unshift(chat);
        saveChats();
        return chat;
    }

    function renderReceivedOffers() {
        const container = document.getElementById('received-offers-list');
        const empty = document.getElementById('no-offers-state');
        const pending = offers.filter(o => o.status === 'pendiente');

        if (pending.length === 0) {
            container.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        container.innerHTML = pending.map(o => `
            <div class="offer-card">
                <div class="offer-card-header">
                    <div>
                        <h4>${o.sellerName}</h4>
                        <p class="offer-request"><i class="fas fa-search"></i> ${o.requestTitle}</p>
                    </div>
                    <div class="offer-price-tag">${formatMoney(o.price)}</div>
                </div>
                <span class="status-badge status-pendiente"><i class="fas fa-clock"></i> Pendiente</span>
                ${renderOfferCompare(o)}
                <div class="offer-meta">
                    <span><i class="fas fa-calendar"></i> ${formatDate(o.createdAt)}</span>
                </div>
                <div class="offer-actions">
                    <button class="btn-accept" data-action="accept-offer" data-id="${o.id}">
                        <i class="fas fa-check"></i> Aceptar
                    </button>
                    <button class="btn-reject" data-action="reject-offer" data-id="${o.id}">
                        <i class="fas fa-times"></i> Rechazar
                    </button>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('[data-action="accept-offer"]').forEach(btn => {
            btn.addEventListener('click', () => acceptOffer(btn.dataset.id));
        });
        container.querySelectorAll('[data-action="reject-offer"]').forEach(btn => {
            btn.addEventListener('click', () => rejectOffer(btn.dataset.id));
        });
        bindCompareActions(container);
    }

    function renderSentOffers() {
        const container = document.getElementById('sent-offers-list');
        const empty = document.getElementById('no-sent-offers');
        const mine = offers.filter(o => o.sellerId === CURRENT_SELLER_ID);

        if (mine.length === 0) {
            container.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        container.innerHTML = mine.map(o => {
            const statusClass = 'status-' + o.status;
            const statusLabel = o.status === 'pendiente' ? 'Pendiente' : o.status === 'aceptada' ? 'Aceptada' : 'Rechazada';
            const chat = chats.find(c => c.offerId === o.id);

            return `
            <div class="offer-card">
                <div class="offer-card-header">
                    <div>
                        <h4>${o.requestTitle}</h4>
                        <p class="offer-request">Para: ${o.buyerName}</p>
                    </div>
                    <div class="offer-price-tag">${formatMoney(o.price)}</div>
                </div>
                <span class="status-badge ${statusClass}">${statusLabel}</span>
                ${renderOfferCompare(o, 'seller')}
                <div class="offer-meta">
                    <span><i class="fas fa-calendar"></i> ${formatDate(o.createdAt)}</span>
                </div>
                <div class="offer-actions">
                    ${o.status === 'aceptada' && chat ? `
                        <button class="btn-chat-open" data-action="open-chat" data-id="${chat.id}" data-role="seller">
                            <i class="fas fa-comments"></i> Abrir chat
                        </button>
                    ` : ''}
                </div>
            </div>`;
        }).join('');

        container.querySelectorAll('[data-action="open-chat"]').forEach(btn => {
            btn.addEventListener('click', () => openChat(btn.dataset.id, btn.dataset.role));
        });
        bindCompareActions(container);
    }

    function renderChatsList() {
        const container = document.getElementById('chats-list');
        const empty = document.getElementById('no-chats-state');

        if (chats.length === 0) {
            container.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        container.innerHTML = chats.map(c => {
            const last = c.messages[c.messages.length - 1];
            const preview = last.from === 'system' ? last.text : (last.from === 'buyer' ? 'Tú: ' : '') + last.text;

            return `
            <div class="chat-preview-card" data-action="open-chat" data-id="${c.id}" data-role="buyer">
                <div class="avatar">${getInitials(c.sellerName)}</div>
                <div class="chat-preview-info">
                    <h4>${c.sellerName}</h4>
                    <p>${c.requestTitle}</p>
                    <p>${preview.substring(0, 60)}${preview.length > 60 ? '...' : ''}</p>
                </div>
                <span class="chat-preview-time">${formatTime(last.time)}</span>
            </div>`;
        }).join('');

        container.querySelectorAll('[data-action="open-chat"]').forEach(el => {
            el.addEventListener('click', () => openChat(el.dataset.id, el.dataset.role));
        });
    }

    function updateBadges() {
        const pending = offers.filter(o => o.status === 'pendiente').length;
        document.getElementById('offers-badge').textContent = pending;
        document.getElementById('chats-badge').textContent = chats.length;
        document.getElementById('offers-badge').style.display = pending > 0 ? 'inline' : 'none';
        document.getElementById('chats-badge').style.display = chats.length > 0 ? 'inline' : 'none';
    }

    // ===== CHAT =====
    function openChat(chatId, role) {
        const chat = chats.find(c => c.id === chatId);
        if (!chat) return;

        currentChatRole = role;
        document.getElementById('chat-id').value = chatId;
        document.getElementById('chat-partner-name').textContent =
            role === 'buyer' ? chat.sellerName : chat.buyerName;
        document.getElementById('chat-request-title').textContent = chat.requestTitle;
        document.getElementById('chat-avatar').textContent =
            getInitials(role === 'buyer' ? chat.sellerName : chat.buyerName);

        renderChatMessages(chat);
        openModal('chat-modal');

        setTimeout(() => {
            const box = document.getElementById('chat-messages');
            box.scrollTop = box.scrollHeight;
        }, 100);
    }

    function renderChatMessages(chat) {
        const box = document.getElementById('chat-messages');
        box.innerHTML = chat.messages.map(m => {
            if (m.from === 'system') {
                return `<div class="chat-bubble system">${m.text}</div>`;
            }
            const label = m.from === 'buyer' ? CURRENT_BUYER_NAME : chat.sellerName;
            return `<div class="chat-bubble ${m.from}">
                ${m.from !== 'system' ? '<strong style="font-size:11px;display:block;margin-bottom:4px;opacity:.8">' + label + '</strong>' : ''}
                ${m.text}
                <span class="time">${formatTime(m.time)}</span>
            </div>`;
        }).join('');
    }

    function sendChatMessage(e) {
        e.preventDefault();
        const chatId = document.getElementById('chat-id').value;
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;

        const chat = chats.find(c => c.id === chatId);
        if (!chat) return;

        chat.messages.push({
            from: currentChatRole,
            text: text,
            time: new Date().toISOString()
        });

        saveChats();
        input.value = '';
        renderChatMessages(chat);

        const box = document.getElementById('chat-messages');
        box.scrollTop = box.scrollHeight;
        renderChatsList();
    }

    function seedDemoData() {
        if (localStorage.getItem('buyseek_seeded')) return;

        const req1 = requests.find(r => r.id === 'auto-1');
        const req2 = requests.find(r => r.id === 'inm-1');
        const req3 = requests.find(r => r.id === 'auto-2');

        const acceptedOffer = {
            id: 'demo-offer-accepted',
            requestId: 'auto-2',
            requestTitle: req3.title,
            requestImage: req3.image,
            buyerName: 'Sarah K.',
            sellerId: 's2',
            sellerName: 'Elite Auto Group',
            price: 175000,
            message: 'Porsche 911 Carrera 2020 negro, 18.000 km, paquete Sport Chrono. Disponible esta semana.',
            status: 'aceptada',
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            acceptedAt: new Date(Date.now() - 86400000).toISOString(),
            ...snapshotFromRequest(req3)
        };

        offers = [
            {
                id: 'demo-offer-1',
                requestId: 'auto-1',
                requestTitle: req1.title,
                requestImage: req1.image,
                buyerName: 'Carlos M.',
                sellerId: 's1',
                sellerName: 'Luxury Motors Miami',
                price: 235000,
                message: 'Tenemos un Ferrari 488 GTB 2019 rosso corsa, 12.000 km, service oficial. Disponible para ver hoy.',
                status: 'pendiente',
                createdAt: new Date(Date.now() - 3600000).toISOString(),
                ...snapshotFromRequest(req1)
            },
            {
                id: 'demo-offer-2',
                requestId: 'inm-1',
                requestTitle: req2.title,
                requestImage: req2.image,
                buyerName: 'Roberto F.',
                sellerId: 's3',
                sellerName: 'Coastal Realty',
                price: 820000,
                message: 'Apartamento 3 dormitorios, vista al mar, 140m² en Miami Beach. Excelente estado.',
                status: 'pendiente',
                createdAt: new Date(Date.now() - 7200000).toISOString(),
                ...snapshotFromRequest(req2)
            },
            acceptedOffer
        ];

        chats = [{
            id: 'demo-chat-1',
            offerId: acceptedOffer.id,
            requestId: acceptedOffer.requestId,
            requestTitle: acceptedOffer.requestTitle,
            buyerName: acceptedOffer.buyerName,
            sellerName: acceptedOffer.sellerName,
            sellerId: acceptedOffer.sellerId,
            messages: [
                {
                    from: 'system',
                    text: 'Oferta aceptada. Elite Auto Group ofreció $175,000. ¡Pueden coordinar los detalles!',
                    time: new Date(Date.now() - 86400000).toISOString()
                },
                {
                    from: 'seller',
                    text: '¡Hola Sarah! El Porsche está listo para que lo veas. ¿Te viene bien el jueves por la tarde?',
                    time: new Date(Date.now() - 82800000).toISOString()
                },
                {
                    from: 'buyer',
                    text: 'Perfecto, el jueves a las 16hs me viene bien. ¿Dónde nos encontramos?',
                    time: new Date(Date.now() - 79200000).toISOString()
                }
            ]
        }];

        saveOffers();
        saveChats();
        localStorage.setItem('buyseek_seeded', '1');
    }

    function syncOfferCounts() {
        requests.forEach(r => {
            const count = offers.filter(o => o.requestId === r.id).length;
            if (count > 0) r.offers = count;
        });
    }

    function initBuyerSubtabs() {
        document.querySelectorAll('.buyer-subtab').forEach(tab => {
            tab.addEventListener('click', function () {
                document.querySelectorAll('.buyer-subtab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.buyer-panel').forEach(p => p.classList.remove('active'));
                this.classList.add('active');
                document.getElementById('buyer-panel-' + this.dataset.buyerPanel).classList.add('active');

                if (this.dataset.buyerPanel === 'offers') renderReceivedOffers();
                if (this.dataset.buyerPanel === 'chats') renderChatsList();
            });
        });
    }

    // ===== RENDER LISTADOS =====
    function getFilteredRequests() {
        return requests.filter(r => {
            if (r.category !== activeCategory) return false;

            if (activeFilters.search) {
                const q = activeFilters.search.toLowerCase();
                const hay = (r.title + r.requirements + r.location).toLowerCase();
                if (!hay.includes(q)) return false;
            }

            if (activeFilters.location && activeFilters.location !== 'all') {
                const loc = r.location.toLowerCase();
                const map = {
                    miami: 'miami', newyork: 'nueva york', newyork2: 'new york',
                    losangeles: 'los angeles', buenosaires: 'buenos aires', chicago: 'chicago'
                };
                const key = activeFilters.location;
                const match = loc.includes(key === 'newyork' ? 'york' : key === 'losangeles' ? 'angeles' : key === 'buenosaires' ? 'buenos aires' : key);
                if (!match) return false;
            }

            if (activeFilters.minPrice && r.budget < activeFilters.minPrice) return false;
            if (activeFilters.maxPrice && r.budget > activeFilters.maxPrice) return false;

            return true;
        });
    }

    function renderListings() {
        const container = document.getElementById('listings-container');
        const empty = document.getElementById('empty-state');
        const filtered = getFilteredRequests();

        document.getElementById('results-count').textContent =
            filtered.length + ' solicitud' + (filtered.length !== 1 ? 'es' : '');
        document.getElementById('active-category-label').textContent =
            activeCategory === 'autos' ? 'en Autos' : 'en Inmuebles';

        if (filtered.length === 0) {
            container.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        container.innerHTML = filtered.map(r => createListingCard(r)).join('');

        container.querySelectorAll('[data-action="detail"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                showDetail(btn.dataset.id);
            });
        });
        container.querySelectorAll('[data-action="offer"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openOfferModal(btn.dataset.id);
            });
        });
        container.querySelectorAll('.listing-card').forEach(card => {
            card.addEventListener('click', () => showDetail(card.dataset.id));
        });
    }

    function createListingCard(r) {
        const period = r.budgetPeriod || '';
        const rating = r.buyer.rating;
        const catTag = r.category === 'autos'
            ? '<span class="tag tag-autos"><i class="fas fa-car"></i> Autos</span>'
            : '<span class="tag tag-inm"><i class="fas fa-building"></i> Inmuebles</span>';

        return `
        <article class="listing-card ${r.featured ? 'featured' : ''}" data-id="${r.id}">
            <div class="listing-img-wrap">
                ${r.featured ? '<span class="listing-badge">Destacado</span>' : ''}
                <img src="${r.image}" alt="${r.title}" loading="lazy"
                     onerror="this.src='images/ferrari-488.jpg'">
            </div>
            <div class="listing-body">
                <div class="listing-category">${catTag}</div>
                <h3>${r.title}</h3>
                <div class="listing-price">${formatMoney(r.budget, period)}</div>
                <p class="listing-req">${r.requirements}</p>
                <div class="listing-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${r.location}</span>
                    <span><i class="fas fa-clock"></i> ${r.posted}</span>
                </div>
                <div class="listing-buyer">
                    <div class="buyer-info">
                        <div class="avatar">${getInitials(r.buyer.name)}</div>
                        <div>
                            <span class="buyer-name">${r.buyer.name} <i class="fas fa-check-circle verified-icon"></i></span>
                            <div class="buyer-rating">${renderStars(parseFloat(rating))}</div>
                        </div>
                    </div>
                </div>
                <div class="listing-footer">
                    <span><i class="fas fa-eye"></i> ${r.views} vistas</span>
                    <span><i class="fas fa-comment-dollar"></i> ${r.offers} ofertas</span>
                    <span class="${r.negotiable ? 'negotiable' : 'non-negotiable'}">
                        ${r.negotiable ? 'Negociable' : 'Fijo'}
                    </span>
                </div>
                <div class="listing-actions">
                    <button class="btn btn-ghost" data-action="detail" data-id="${r.id}">
                        <i class="fas fa-info-circle"></i> Ver detalle
                    </button>
                    <button class="btn btn-offer" data-action="offer" data-id="${r.id}">
                        <i class="fas fa-paper-plane"></i> Enviar oferta
                    </button>
                </div>
            </div>
        </article>`;
    }

    // ===== DETALLE =====
    function showDetail(id) {
        const r = requests.find(x => x.id === id);
        if (!r) return;

        const period = r.budgetPeriod || '';
        const rating = r.buyer.rating;
        const catLabel = r.category === 'autos' ? 'Automóvil' : 'Inmueble';
        const pendingOffers = offers.filter(o => o.requestId === r.id && o.status === 'pendiente').length;

        document.getElementById('detail-content').innerHTML = `
            <div class="detail-layout">
                <div class="detail-img">
                    <img src="${r.image}" alt="${r.title}"
                         onerror="this.src='images/ferrari-488.jpg'">
                </div>
                <div class="detail-info">
                    <span class="tag ${r.category === 'autos' ? 'tag-autos' : 'tag-inm'}">
                        <i class="fas fa-${r.category === 'autos' ? 'car' : 'building'}"></i> ${catLabel}
                    </span>
                    <h2>${r.title}</h2>
                    <div class="detail-price">${formatMoney(r.budget, period)}</div>

                    <div class="detail-block">
                        <h4>Requisitos</h4>
                        <p>${r.requirements}</p>
                    </div>
                    <div class="detail-block">
                        <h4>Ubicación</h4>
                        <p><i class="fas fa-map-marker-alt"></i> ${r.location}</p>
                    </div>
                    <div class="detail-block">
                        <h4>Actividad</h4>
                        <p>
                            <span class="negotiable"><i class="fas fa-circle" style="font-size:8px"></i> Recibiendo ofertas</span>
                            · ${r.offers} ofertas · ${r.views} vistas
                            ${pendingOffers > 0 ? ` · <strong>${pendingOffers} pendiente${pendingOffers > 1 ? 's' : ''}</strong>` : ''}
                        </p>
                    </div>

                    <div class="detail-buyer-card">
                        <div class="avatar">${getInitials(r.buyer.name)}</div>
                        <div style="flex:1">
                            <strong>${r.buyer.name} <i class="fas fa-check-circle verified-icon"></i></strong>
                            <div style="margin-top:4px">${renderStars(parseFloat(rating))} <span class="rating-text">${r.buyer.reviews} reseñas</span></div>
                        </div>
                    </div>

                    <div class="detail-actions">
                        <button class="btn btn-primary btn-lg btn-block" id="btn-send-offer">
                            <i class="fas fa-paper-plane"></i> Enviar oferta
                        </button>
                    </div>
                </div>
            </div>`;

        document.getElementById('btn-send-offer').addEventListener('click', () => {
            openOfferModal(id);
        });

        openModal('detail-modal');
    }

    function renderTopSellers() {
        const container = document.getElementById('top-sellers');
        container.innerHTML = SAMPLE_SELLERS.map(s => `
            <div class="seller-card">
                <div class="seller-card-top">
                    <div class="seller-avatar"><i class="fas fa-store"></i></div>
                    <div class="seller-info">
                        <h4>${s.name} <i class="fas fa-check-circle verified-icon"></i></h4>
                        <span class="type">${s.type} · ${s.location}</span>
                    </div>
                </div>
                <div style="margin-bottom:12px">${renderStars(s.rating)}</div>
                <div class="seller-card-stats">
                    <span><i class="fas fa-handshake"></i> <strong>${s.deals}</strong> operaciones</span>
                    <span><i class="fas fa-comment"></i> <strong>${s.reviews}</strong> reseñas</span>
                </div>
            </div>
        `).join('');
    }

    function navigateToBuyerPublish() {
        document.querySelector('[data-tab="buyer"]').click();
        document.querySelector('[data-buyer-panel="publish"]').click();
        document.getElementById('marketplace').scrollIntoView({ behavior: 'smooth' });
    }

    function navigateToSeller() {
        document.querySelector('[data-tab="seller"]').click();
        document.getElementById('marketplace').scrollIntoView({ behavior: 'smooth' });
    }

    function initHeaderScroll() {
        const header = document.getElementById('header');
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 20);
        }, { passive: true });
    }

    // ===== FILTROS =====
    function updateFilterTags() {
        const container = document.getElementById('active-filter-tags');
        container.innerHTML = '';

        const labels = {
            search: 'Búsqueda', location: 'Ubicación',
            minPrice: 'Precio min', maxPrice: 'Precio max'
        };

        Object.entries(activeFilters).forEach(([key, val]) => {
            if (!val || val === 'all') return;
            const tag = document.createElement('span');
            tag.className = 'filter-tag';
            tag.innerHTML = `${labels[key] || key}: ${val} <button data-key="${key}">&times;</button>`;
            tag.querySelector('button').addEventListener('click', () => {
                delete activeFilters[key];
                if (key === 'search') document.getElementById('quick-search').value = '';
                if (key === 'location') document.getElementById('location-filter').value = 'all';
                if (key === 'minPrice') document.getElementById('min-price').value = '';
                if (key === 'maxPrice') document.getElementById('max-price').value = '';
                updateFilterTags();
                renderListings();
            });
            container.appendChild(tag);
        });
    }

    function applyFilters() {
        activeFilters = {};
        const search = document.getElementById('quick-search').value.trim();
        const location = document.getElementById('location-filter').value;
        const minP = document.getElementById('min-price').value;
        const maxP = document.getElementById('max-price').value;

        if (search) activeFilters.search = search;
        if (location !== 'all') activeFilters.location = location;
        if (minP) activeFilters.minPrice = parseInt(minP);
        if (maxP) activeFilters.maxPrice = parseInt(maxP);

        updateFilterTags();
        renderListings();
    }

    function resetFilters() {
        activeFilters = {};
        document.getElementById('quick-search').value = '';
        document.getElementById('location-filter').value = 'all';
        document.getElementById('min-price').value = '';
        document.getElementById('max-price').value = '';
        updateFilterTags();
        renderListings();
    }

    function updateCategoryCounts() {
        const autos = requests.filter(r => r.category === 'autos').length;
        const inm = requests.filter(r => r.category === 'inmobiliaria').length;
        document.getElementById('count-autos').textContent = autos;
        document.getElementById('count-inm').textContent = inm;
    }

    // ===== FORMULARIO COMPRADOR =====
    function initBuyerForm() {
        const form = document.getElementById('buy-request-form');
        const category = document.getElementById('category');
        const opType = document.querySelector('.operation-type');

        category.addEventListener('change', function () {
            opType.style.display = this.value === 'inmobiliaria' ? 'block' : 'none';
        });

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const cat = category.value;
            const title = document.getElementById('title').value.trim();
            const budget = parseInt(document.getElementById('budget').value);
            const location = document.getElementById('location').value.trim();
            const requirements = document.getElementById('requirements').value.trim();

            if (!cat || !title || !budget || !location || !requirements) {
                showToast('Completa todos los campos obligatorios');
                return;
            }

            const images = {
                autos: 'images/bmw-serie3.jpg',
                inmobiliaria: 'images/casa-moderna.jpg'
            };

            const newReq = {
                id: 'user-' + Date.now(),
                category: cat,
                operation: cat === 'inmobiliaria' ? document.getElementById('operation-type').value : 'compra',
                featured: false,
                title: title.startsWith('Busco') || title.startsWith('Alquilo') ? title : 'Busco ' + title,
                image: images[cat],
                budget: budget,
                budgetPeriod: document.getElementById('operation-type').value === 'alquiler' ? '/mes' : '',
                requirements: requirements,
                location: location,
                posted: 'ahora',
                negotiable: true,
                views: 0,
                offers: 0,
                buyer: { id: 'me', name: 'Tú', rating: 5.0, reviews: 0 }
            };

            requests.unshift(newReq);
            updateCategoryCounts();
            form.reset();
            opType.style.display = 'none';

            showToast('¡Solicitud publicada! Los vendedores podrán enviarte ofertas.');

            activeCategory = cat;
            document.querySelectorAll('.category-pill').forEach(p => {
                p.classList.toggle('active', p.dataset.category === cat);
            });

            document.querySelector('[data-tab="seller"]').click();
            renderListings();
        });
    }

    // ===== INICIALIZACIÓN =====
    document.addEventListener('DOMContentLoaded', function () {
        // Tabs usuario
        document.querySelectorAll('.user-tab').forEach(tab => {
            tab.addEventListener('click', function () {
                document.querySelectorAll('.user-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.user-tab-content').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                document.getElementById(this.dataset.tab + '-content').classList.add('active');
            });
        });

        // Category pills
        document.querySelectorAll('.category-pill').forEach(pill => {
            pill.addEventListener('click', function () {
                document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
                this.classList.add('active');
                activeCategory = this.dataset.category;
                renderListings();
            });
        });

        // Filtros
        document.querySelector('.filter-apply').addEventListener('click', applyFilters);
        document.querySelector('.filter-reset').addEventListener('click', resetFilters);
        document.getElementById('quick-search').addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(applyFilters, 300);
        });
        document.getElementById('quick-search').addEventListener('keyup', e => {
            if (e.key === 'Enter') applyFilters();
        });

        // Hero & CTA buttons
        document.querySelectorAll('.buyer-cta').forEach(btn => {
            btn.addEventListener('click', navigateToBuyerPublish);
        });
        document.querySelectorAll('.seller-cta').forEach(btn => {
            btn.addEventListener('click', navigateToSeller);
        });

        // Modales auth
        document.querySelector('.login-btn').addEventListener('click', () => openModal('login-modal'));
        document.querySelector('.signup-btn').addEventListener('click', () => openModal('signup-modal'));

        document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
            el.addEventListener('click', closeAllModals);
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeAllModals();
        });

        document.getElementById('login-form').addEventListener('submit', e => {
            e.preventDefault();
            closeAllModals();
            showToast('Sesión iniciada correctamente');
        });
        document.getElementById('signup-form').addEventListener('submit', e => {
            e.preventDefault();
            closeAllModals();
            showToast('Cuenta creada exitosamente');
        });

        // Mobile menu
        document.querySelector('.menu-toggle').addEventListener('click', () => {
            document.querySelector('.nav-mobile').classList.toggle('open');
        });
        document.querySelectorAll('.nav-mobile a').forEach(a => {
            a.addEventListener('click', () => {
                document.querySelector('.nav-mobile').classList.remove('open');
            });
        });

        // Hero preview stars
        document.querySelectorAll('.hero-card-preview .stars').forEach(el => {
            el.innerHTML = renderStars(4.9, true);
        });

        initBuyerForm();
        initBuyerSubtabs();
        initHeaderScroll();
        seedDemoData();
        enrichLegacyOffers();
        syncOfferCounts();

        document.getElementById('offer-form').addEventListener('submit', submitOffer);
        document.getElementById('chat-form').addEventListener('submit', sendChatMessage);

        document.getElementById('stat-requests').textContent = requests.length;

        updateCategoryCounts();
        updateBadges();
        renderListings();
        renderTopSellers();
        renderReceivedOffers();
        renderSentOffers();
        renderChatsList();
    });
})();
