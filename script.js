document.addEventListener('DOMContentLoaded', function() {
    // Toggle mobile menu
    const menuToggle = document.querySelector('.menu-toggle');
    const navigation = document.querySelector('.navigation');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            navigation.classList.toggle('active');
            this.classList.toggle('active');
        });
    }

    // Modal functionality
    const modalTriggers = document.querySelectorAll('[data-modal]');
    const closeButtons = document.querySelectorAll('.close-modal');
    
    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            const modalId = trigger.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            modal.style.display = 'flex';
        });
    });
    
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            modal.style.display = 'none';
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // Form submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Inicio de sesión exitoso');
            document.getElementById('login-modal').style.display = 'none';
        });
    }
    
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Registro exitoso');
            document.getElementById('register-modal').style.display = 'none';
        });
    }
    
    // Contact seller/buyer buttons
    const contactButtons = document.querySelectorAll('.contact-seller, .contact-buyer');
    contactButtons.forEach(button => {
        button.addEventListener('click', () => {
            alert('Función de contacto - Esta característica estará disponible pronto');
        });
    });

    // ------------- FUNCIONALIDAD DE PESTAÑAS DE USUARIO -------------
    const userTabs = document.querySelectorAll('.user-tab');
    const userContents = document.querySelectorAll('.user-tab-content');
    const buyerTab = document.querySelector('[data-tab="buyer"]');
    const sellerTab = document.querySelector('[data-tab="seller"]');
    const buyerContent = document.getElementById('buyer-content');
    const sellerContent = document.getElementById('seller-content');
    
    // Mostrar la pestaña de comprador por defecto al cargar
    if (buyerTab && buyerContent) {
        buyerTab.classList.add('active');
        buyerContent.style.display = 'block';
        if (sellerContent) sellerContent.style.display = 'none';
    }
    
    // Cambiar entre pestañas
    userTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Actualizar clases activas en las pestañas
            userTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Ocultar todos los contenidos
            userContents.forEach(content => {
                content.style.display = 'none';
            });
            
            // Mostrar el contenido correspondiente
            if (targetTab === 'buyer' && buyerContent) {
                buyerContent.style.display = 'block';
            } else if (targetTab === 'seller' && sellerContent) {
                sellerContent.style.display = 'block';
            }
        });
    });
    
    // Botones de CTA en el hero
    const buyerCta = document.querySelector('.buyer-cta');
    const sellerCta = document.querySelector('.seller-cta');
    
    if (buyerCta) {
        buyerCta.addEventListener('click', function() {
            // Activar pestaña de comprador
            if (buyerTab) buyerTab.click();
            
            // Desplazarse a la sección
            document.querySelector('.user-mode-section').scrollIntoView({ behavior: 'smooth' });
        });
    }
    
    if (sellerCta) {
        sellerCta.addEventListener('click', function() {
            // Activar pestaña de vendedor
            if (sellerTab) sellerTab.click();
            
            // Desplazarse a la sección
            document.querySelector('.user-mode-section').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // ------------- FUNCIONALIDAD DE FILTROS -------------
    const categoryFilter = document.getElementById('category-filter');
    const operationTypeFilter = document.getElementById('operation-type-filter');
    const operationTypeContainer = document.querySelector('.operation-type-container');
    const brandFilter = document.getElementById('brand-filter');
    const modelFilter = document.getElementById('model-filter');
    const locationFilter = document.getElementById('location-filter');
    const minPriceInput = document.getElementById('min-price');
    const maxPriceInput = document.getElementById('max-price');
    const filterApplyBtn = document.querySelector('.filter-apply');
    const filterResetBtn = document.querySelector('.filter-reset');
    const activeFilterTags = document.getElementById('active-filter-tags');
    
    // Mostrar/ocultar el filtro de tipo de operación cuando se selecciona inmobiliaria
    if (categoryFilter && operationTypeContainer) {
        categoryFilter.addEventListener('change', function() {
            if (this.value === 'inmobiliaria') {
                operationTypeContainer.style.display = 'block';
            } else {
                operationTypeContainer.style.display = 'none';
                if (operationTypeFilter) operationTypeFilter.value = 'all';
            }
        });
    }
    
    // Actualizar opciones de modelos cuando cambia la marca
    if (brandFilter && modelFilter) {
        brandFilter.addEventListener('change', function() {
            const brand = this.value;
            
            // Limpiar y restaurar opciones de modelo
            modelFilter.innerHTML = '<option value="all">Todos los modelos</option>';
            
            // Añadir opciones específicas según la marca seleccionada
            if (brand === 'porsche' || brand === 'all') {
                addModelOption('911', 'Porsche 911');
                addModelOption('cayman', 'Porsche Cayman');
                addModelOption('taycan', 'Porsche Taycan');
            }
            
            if (brand === 'ferrari' || brand === 'all') {
                addModelOption('458', 'Ferrari 458');
                addModelOption('f8', 'Ferrari F8');
                addModelOption('sf90', 'Ferrari SF90');
            }
            
            if (brand === 'rolex' || brand === 'all') {
                addModelOption('submariner', 'Rolex Submariner');
                addModelOption('daytona', 'Rolex Daytona');
                addModelOption('datejust', 'Rolex Datejust');
            }
            
            if (brand === 'apple' || brand === 'all') {
                addModelOption('macbook', 'MacBook Pro');
                addModelOption('iphone', 'iPhone');
                addModelOption('ipad', 'iPad Pro');
            }
            
            if (brand !== 'all' && brand !== 'porsche' && brand !== 'ferrari' && brand !== 'rolex' && brand !== 'apple') {
                addModelOption('otros', 'Otros modelos');
            }
        });
    }
    
    function addModelOption(value, text) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        modelFilter.appendChild(option);
    }
    
    // Aplicar filtros
    if (filterApplyBtn) {
        filterApplyBtn.addEventListener('click', function() {
            // Limpiar tags de filtros activos
            if (activeFilterTags) activeFilterTags.innerHTML = '';
            
            // Recopilar valores de filtros
            const filters = {
                category: categoryFilter ? categoryFilter.value : 'all',
                operationType: operationTypeFilter ? operationTypeFilter.value : 'all',
                brand: brandFilter ? brandFilter.value : 'all',
                model: modelFilter ? modelFilter.value : 'all',
                location: locationFilter ? locationFilter.value : 'all',
                minPrice: minPriceInput && minPriceInput.value ? parseInt(minPriceInput.value) : null,
                maxPrice: maxPriceInput && maxPriceInput.value ? parseInt(maxPriceInput.value) : null
            };
            
            // Mostrar tags de filtros activos
            for (const [key, value] of Object.entries(filters)) {
                if (value && value !== 'all') {
                    let tagLabel = '';
                    
                    switch (key) {
                        case 'category':
                            tagLabel = filters.category;
                            break;
                        case 'operationType':
                            tagLabel = filters.operationType === 'compra' ? 'Compra' : 'Alquiler';
                            break;
                        case 'brand':
                            tagLabel = filters.brand;
                            break;
                        case 'model':
                            tagLabel = filters.model;
                            break;
                        case 'location':
                            tagLabel = filters.location;
                            break;
                        case 'minPrice':
                            tagLabel = `Desde $${value.toLocaleString()}`;
                            break;
                        case 'maxPrice':
                            tagLabel = `Hasta $${value.toLocaleString()}`;
                            break;
                    }
                    
                    if (tagLabel && activeFilterTags) {
                        createFilterTag(key, tagLabel);
                    }
                }
            }
            
            console.log('Filtros aplicados:', filters);
            
            // Filtrar anuncios según los criterios seleccionados
            const listings = document.querySelectorAll('.listings .listing');
            let countVisible = 0;
            
            listings.forEach(listing => {
                // Extraer datos del anuncio
                const title = listing.querySelector('h3').textContent.toLowerCase();
                const priceText = listing.querySelector('.price').textContent;
                const price = parseInt(priceText.replace(/[^\d]/g, ''));
                const locationEl = listing.querySelector('.listing-details p:nth-child(2)');
                const location = locationEl ? locationEl.textContent.replace('Ubicación:', '').trim() : '';
                const requirements = listing.querySelector('.listing-details p:nth-child(1)').textContent.toLowerCase();
                
                // Variables para determinar qué categoría pertenece
                let isAuto = false;
                let isInmobiliaria = false;
                let isReloj = false;
                let isTech = false;
                
                // Determinar si es alquiler o compra
                let isAlquiler = priceText.includes('/mes') || title.includes('alquiler') || requirements.includes('alquiler') || requirements.includes('renta');
                let isCompra = !isAlquiler; // Por defecto, si no es alquiler, es compra
                
                // Determinar categoría basada en el título y requisitos
                if (title.includes('porsche') || title.includes('ferrari') || title.includes('lamborghini') || 
                    title.includes('911') || title.includes('taycan') || title.includes('f8') || title.includes('huracán') ||
                    title.includes('ducati') || title.includes('bmw')) {
                    isAuto = true;
                } 
                else if (title.includes('apartamento') || title.includes('residencia') || title.includes('ático') || 
                         title.includes('loft') || requirements.includes('habitaciones') || requirements.includes('m²')) {
                    isInmobiliaria = true;
                }
                else if (title.includes('rolex') || title.includes('daytona') || title.includes('submariner') || 
                         title.includes('datejust') || title.includes('patek')) {
                    isReloj = true;
                }
                else if (title.includes('macbook') || title.includes('iphone') || title.includes('ipad') || 
                         title.includes('pro')) {
                    isTech = true;
                }
                
                // Filtrar por categoría
                let matchCategory = filters.category === 'all';
                if (!matchCategory) {
                    switch (filters.category) {
                        case 'autos':
                            matchCategory = isAuto;
                            break;
                        case 'inmobiliaria':
                            matchCategory = isInmobiliaria;
                            break;
                        case 'relojes':
                            matchCategory = isReloj;
                            break;
                        case 'tech':
                            matchCategory = isTech;
                            break;
                        default:
                            matchCategory = true;
                    }
                }
                
                // Filtrar por tipo de operación (solo para inmobiliaria)
                let matchOperationType = filters.operationType === 'all';
                if (!matchOperationType && filters.category === 'inmobiliaria') {
                    switch (filters.operationType) {
                        case 'compra':
                            matchOperationType = isCompra;
                            break;
                        case 'alquiler':
                            matchOperationType = isAlquiler;
                            break;
                        default:
                            matchOperationType = true;
                    }
                } else {
                    // Si no es inmobiliaria, siempre coincide
                    matchOperationType = true;
                }
                
                // Filtrar por marca
                let matchBrand = filters.brand === 'all';
                if (!matchBrand) {
                    const brandName = filters.brand.toLowerCase();
                    matchBrand = title.toLowerCase().includes(brandName);
                }
                
                // Filtrar por modelo
                let matchModel = filters.model === 'all';
                if (!matchModel) {
                    const modelName = filters.model.toLowerCase();
                    matchModel = title.toLowerCase().includes(modelName) || requirements.toLowerCase().includes(modelName);
                }
                
                // Filtrar por ubicación
                let matchLocation = filters.location === 'all';
                if (!matchLocation) {
                    switch (filters.location) {
                        case 'miami':
                            matchLocation = location.toLowerCase().includes('miami');
                            break;
                        case 'newyork':
                            matchLocation = location.toLowerCase().includes('nueva york') || location.toLowerCase().includes('new york');
                            break;
                        case 'losangeles':
                            matchLocation = location.toLowerCase().includes('los ángeles') || location.toLowerCase().includes('los angeles');
                            break;
                        case 'chicago':
                            matchLocation = location.toLowerCase().includes('chicago');
                            break;
                        case 'weston':
                            matchLocation = location.toLowerCase().includes('weston');
                            break;
                        default:
                            matchLocation = true;
                    }
                }
                
                // Filtrar por precio
                let matchMinPrice = true;
                let matchMaxPrice = true;
                
                if (filters.minPrice !== null) {
                    matchMinPrice = price >= filters.minPrice;
                }
                
                if (filters.maxPrice !== null) {
                    matchMaxPrice = price <= filters.maxPrice;
                }
                
                // Combinar todos los criterios
                const isVisible = matchCategory && matchBrand && matchModel && matchLocation && matchMinPrice && matchMaxPrice && matchOperationType;
                
                // Mostrar u ocultar el anuncio
                if (isVisible) {
                    listing.style.display = 'block';
                    countVisible++;
                    // Animar la transición
                    listing.style.opacity = '1';
                } else {
                    listing.style.opacity = '0.5';
                    setTimeout(() => {
                        listing.style.display = 'none';
                    }, 300);
                }
            });
            
            // Mostrar mensaje si no hay resultados
            const noResultsMessage = document.querySelector('.no-results-message');
            if (countVisible === 0) {
                if (!noResultsMessage) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'no-results-message';
                    messageDiv.innerHTML = `
                        <p>No se encontraron anuncios que coincidan con tus criterios de búsqueda.</p>
                        <p>Intenta con otros filtros o <button class="btn filter-reset outline">Restablecer Filtros</button></p>
                    `;
                    
                    const listingsContainer = document.querySelector('.listings');
                    if (listingsContainer) {
                        listingsContainer.parentNode.insertBefore(messageDiv, listingsContainer.nextSibling);
                    }
                    
                    // Agregar evento al botón de restablecer dentro del mensaje
                    const resetFilterInMsg = messageDiv.querySelector('.filter-reset');
                    if (resetFilterInMsg && filterResetBtn) {
                        resetFilterInMsg.addEventListener('click', function() {
                            filterResetBtn.click();
                        });
                    }
                }
            } else if (noResultsMessage) {
                noResultsMessage.remove();
            }
        });
    }
    
    // Restablecer filtros
    if (filterResetBtn) {
        filterResetBtn.addEventListener('click', function() {
            // Restablecer valores de filtros
            if (categoryFilter) categoryFilter.value = 'all';
            if (operationTypeFilter) operationTypeFilter.value = 'all';
            if (brandFilter) brandFilter.value = 'all';
            if (modelFilter) modelFilter.value = 'all';
            if (locationFilter) locationFilter.value = 'all';
            if (minPriceInput) minPriceInput.value = '';
            if (maxPriceInput) maxPriceInput.value = '';
            
            // Ocultar el filtro de tipo de operación
            if (operationTypeContainer) operationTypeContainer.style.display = 'none';
            
            // Limpiar tags de filtros activos
            if (activeFilterTags) activeFilterTags.innerHTML = '';
            
            // Mostrar todos los anuncios nuevamente
            const listings = document.querySelectorAll('.listings .listing');
            listings.forEach(listing => {
                listing.style.display = 'block';
                listing.style.opacity = '1';
            });
            
            // Eliminar mensaje de no resultados si existe
            const noResultsMessage = document.querySelector('.no-results-message');
            if (noResultsMessage) {
                noResultsMessage.remove();
            }
            
            // Limpiar el campo de búsqueda si existe
            const sellerSearchInput = document.getElementById('seller-search-input');
            if (sellerSearchInput) {
                sellerSearchInput.value = '';
            }
            
            // Quitar destacados de coincidencias
            document.querySelectorAll('.listings .listing').forEach(listing => {
                listing.classList.remove('highlight-match');
            });
        });
    }
    
    // ------------- TESTIMONIAL SLIDER -------------
    const testimonialNav = document.querySelectorAll('.testimonial-nav span');
    const testimonials = document.querySelectorAll('.testimonial');
    
    if (testimonialNav.length > 0 && testimonials.length > 0) {
        testimonialNav.forEach(function(nav, index) {
            nav.addEventListener('click', function() {
                // Hide all testimonials
                testimonials.forEach(function(testimonial) {
                    testimonial.style.display = 'none';
                });
                
                // Remove active class from all nav dots
                testimonialNav.forEach(function(nav) {
                    nav.classList.remove('active');
                });
                
                // Show the selected testimonial
                testimonials[index].style.display = 'block';
                nav.classList.add('active');
            });
        });
        
        // Set first testimonial as active by default
        testimonials[0].style.display = 'block';
        testimonialNav[0].classList.add('active');
    }

    // ------------- CONTACT BUYER BUTTONS -------------
    const contactBuyerButtons = document.querySelectorAll('.contact-buyer');
    
    contactBuyerButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            const listing = button.closest('.listing');
            const title = listing.querySelector('h3').textContent;
            
            // In a real app, this would open a chat or contact form
            alert(`Estás interesado en proporcionar: ${title}\n\nEn una aplicación real, esto te conectaría con el comprador.`);
        });
    });

    // ------------- BÚSQUEDA RÁPIDA PARA VENDEDORES -------------
    const quickSearch = document.getElementById('quick-search');
    const searchButton = document.getElementById('search-button');
    
    if (quickSearch && searchButton) {
        // Ejecutar búsqueda al hacer clic en el botón
        searchButton.addEventListener('click', function() {
            const searchText = quickSearch.value.toLowerCase().trim();
            performSearch(searchText, '.listings .listing');
        });
        
        // Ejecutar búsqueda al presionar Enter en el campo de búsqueda
        quickSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const searchText = quickSearch.value.toLowerCase().trim();
                performSearch(searchText, '.listings .listing');
            }
        });
    }
    
    // ------------- BOTÓN OFRECER DE LA TARJETA DEL HÉROE -------------
    const offerBtn = document.querySelector('.offer-btn');
    
    if (offerBtn) {
        offerBtn.addEventListener('click', function() {
            // Activar pestaña de vendedor
            if (sellerTab) {
                sellerTab.click();
            }
            
            // Seleccionar Ferrari en los filtros
            if (brandFilter) {
                brandFilter.value = 'ferrari';
                // Simular un cambio para actualizar los modelos
                const event = new Event('change');
                brandFilter.dispatchEvent(event);
            }
            
            // Aplicar los filtros
            if (filterApplyBtn) {
                setTimeout(() => {
                    filterApplyBtn.click();
                }, 200);
            }
            
            // Desplazarse a la sección
            document.querySelector('.user-mode-section').scrollIntoView({ behavior: 'smooth' });
        });
    }
    
    // ------------- FUNCIÓN GENERAL DE BÚSQUEDA -------------
    function performSearch(searchText, listingsSelector) {
        const listings = document.querySelectorAll(listingsSelector);
        let resultsFound = false;
        
        // Eliminar resaltados anteriores
        document.querySelectorAll('.highlight-match').forEach(el => {
            el.classList.remove('highlight-match');
        });
        
        // Eliminar mensaje de no resultados si existe
        const existingNoResults = document.querySelector('.no-results-message');
        if (existingNoResults) {
            existingNoResults.remove();
        }
        
        if (!searchText || searchText === '') {
            // Si el campo está vacío, mostrar todas las tarjetas
            listings.forEach(listing => {
                listing.style.display = 'block';
                listing.style.opacity = '1';
            });
            return;
        }
        
        listings.forEach(listing => {
            const listingText = listing.textContent.toLowerCase();
            const listingTitle = listing.querySelector('h3').textContent.toLowerCase();
            const requirementsEl = listing.querySelector('.listing-details p:first-child');
            const requirementsText = requirementsEl ? requirementsEl.textContent.toLowerCase() : '';
            
            if (listingText.includes(searchText)) {
                // Mostrar la tarjeta si coincide
                listing.style.display = 'block';
                listing.style.opacity = '1';
                resultsFound = true;
                
                // Resaltar elementos que coinciden
                listing.classList.add('highlight-match');
                
                // Resaltar texto en título y requisitos
                if (listingTitle.includes(searchText)) {
                    const titleEl = listing.querySelector('h3');
                    highlightMatchInElement(titleEl, searchText);
                }
                
                if (requirementsText.includes(searchText)) {
                    highlightMatchInElement(requirementsEl, searchText);
                }
            } else {
                // Ocultar la tarjeta si no coincide
                listing.style.opacity = '0.5';
                setTimeout(() => {
                    listing.style.display = 'none';
                }, 300);
            }
        });
        
        // Mostrar mensaje si no hay resultados
        if (!resultsFound) {
            const noResultsMsg = document.createElement('div');
            noResultsMsg.className = 'no-results-message';
            noResultsMsg.innerHTML = `
                <p>No se encontraron resultados para "<strong>${searchText}</strong>"</p>
                <p>Intenta con otros términos o utiliza los filtros específicos</p>
            `;
            
            // Insertar mensaje después del área de búsqueda
            const listingsContainer = document.querySelector('.listings');
            if (listingsContainer) {
                listingsContainer.parentNode.insertBefore(noResultsMsg, listingsContainer.nextSibling);
            }
        }
    }
    
    // Función para resaltar texto coincidente
    function highlightMatchInElement(element, searchTerm) {
        if (!element) return;
        
        const originalText = element.textContent;
        const lowerText = originalText.toLowerCase();
        
        if (lowerText.includes(searchTerm)) {
            const regex = new RegExp(searchTerm, 'gi');
            const highlightedText = originalText.replace(regex, match => `<span class="highlight">${match}</span>`);
            element.innerHTML = highlightedText;
        }
    }
    
    // Función para crear un tag de filtro
    function createFilterTag(type, value) {
        if (!activeFilterTags) return;
        
        const tag = document.createElement('div');
        tag.className = `filter-tag ${type}-tag`;
        tag.innerHTML = `
            ${value} <i class="fas fa-times"></i>
        `;
        
        // Agregar evento para eliminar el tag
        const closeBtn = tag.querySelector('i');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                tag.remove();
                
                // Resetear el filtro correspondiente
                if (type === 'category' && categoryFilter) categoryFilter.value = 'all';
                else if (type === 'operationType' && operationTypeFilter) operationTypeFilter.value = 'all';
                else if (type === 'brand' && brandFilter) {
                    brandFilter.value = 'all';
                    // Resetear también el modelo
                    if (modelFilter) {
                        modelFilter.innerHTML = '<option value="all">Todos los modelos</option>';
                    }
                }
                else if (type === 'model' && modelFilter) modelFilter.value = 'all';
                else if (type === 'location' && locationFilter) locationFilter.value = 'all';
                else if (type === 'minPrice' && minPriceInput) minPriceInput.value = '';
                else if (type === 'maxPrice' && maxPriceInput) maxPriceInput.value = '';
                
                // Volver a aplicar filtros
                if (filterApplyBtn) {
                    filterApplyBtn.click();
                }
            });
        }
        
        activeFilterTags.appendChild(tag);
        return tag;
    }
    
    // Inicializar la aplicación
    function init() {
        // Asegurarse de que se muestren los elementos correctos
        if (sellerContent) {
            // Asegurarse de que las imágenes estén cargadas
            const images = sellerContent.querySelectorAll('.listing-img img');
            images.forEach(img => {
                if (img.complete) {
                    console.log('Imagen ya cargada:', img.src);
                } else {
                    img.addEventListener('load', function() {
                        console.log('Imagen cargada correctamente:', img.src);
                    });
                    
                    img.addEventListener('error', function() {
                        console.error('Error al cargar la imagen:', img.src);
                        // Reemplazar con una imagen de fallback
                        img.src = 'https://via.placeholder.com/300x200?text=Imagen+no+disponible';
                    });
                }
            });
        }
    }
    
    // Ejecutar inicialización
    init();

    // Manejador para el formulario de compradores
    const categorySelect = document.getElementById('category');
    const operationTypeDiv = document.querySelector('.operation-type');
    const operationTypeSelect = document.getElementById('operation-type');
    const titleLabel = document.querySelector('label[for="title"]');
    const budgetLabel = document.querySelector('label[for="budget"]');
    
    if (categorySelect && operationTypeDiv) {
        categorySelect.addEventListener('change', function() {
            if (this.value === 'inmobiliaria') {
                operationTypeDiv.style.display = 'block';
                // Actualizar etiquetas según el tipo de operación seleccionado
                updateFormLabels();
            } else {
                operationTypeDiv.style.display = 'none';
                // Restaurar etiquetas predeterminadas
                if (titleLabel) titleLabel.textContent = '¿Qué estás buscando comprar? *';
                if (budgetLabel) budgetLabel.textContent = 'Presupuesto Máximo *';
            }
        });
    }
    
    if (operationTypeSelect) {
        operationTypeSelect.addEventListener('change', updateFormLabels);
    }
    
    function updateFormLabels() {
        if (operationTypeSelect && operationTypeSelect.value === 'alquiler') {
            if (titleLabel) titleLabel.textContent = '¿Qué estás buscando alquilar? *';
            if (budgetLabel) budgetLabel.textContent = 'Presupuesto Máximo Mensual *';
        } else {
            if (titleLabel) titleLabel.textContent = '¿Qué estás buscando comprar? *';
            if (budgetLabel) budgetLabel.textContent = 'Presupuesto Máximo *';
        }
    }
});

// Mock data for listings (would come from a backend in a real app)
const mockListings = [
    {
        id: 1,
        title: 'Ferrari 458 2018',
        price: 210000,
        requirements: 'Máximo 10,000 millas, excelente estado, preferiblemente rojo o negro, historial de servicio completo.',
        location: 'Miami, FL',
        views: 42,
        offers: 8,
        featured: true,
        daysAgo: 2
    },
    {
        id: 2,
        title: 'MacBook Pro 16" 2023',
        price: 3200,
        requirements: 'M2 Max, 32GB RAM, 1TB SSD, Gris Espacial',
        location: 'Nueva York, NY',
        views: 31,
        offers: 12,
        featured: false,
        daysAgo: 5
    },
    {
        id: 3,
        title: 'Rolex Submariner Vintage',
        price: 15000,
        requirements: 'Modelo de los años 80, caja y documentos originales, bien mantenido',
        location: 'Los Ángeles, CA',
        views: 28,
        offers: 5,
        featured: false,
        daysAgo: 7
    }
];

// This would be a function to render listings from the server in a real application
function renderListings(listings) {
    const listingsContainer = document.querySelector('.listings');
    
    if (!listingsContainer) return;
    
    listingsContainer.innerHTML = '';
    
    listings.forEach(function(listing) {
        const listingElement = document.createElement('div');
        listingElement.classList.add('listing');
        
        if (listing.featured) {
            listingElement.classList.add('featured');
            listingElement.innerHTML = `<div class="listing-badge">Destacado</div>`;
        }
        
        listingElement.innerHTML += `
            <div class="listing-header">
                <h3>${listing.title}</h3>
                <span class="price">Pago hasta $${listing.price.toLocaleString()}</span>
            </div>
            <div class="listing-details">
                <p><strong>Requisitos:</strong> ${listing.requirements}</p>
                <p><strong>Ubicación:</strong> ${listing.location}</p>
                <p><strong>Publicado:</strong> ${listing.daysAgo === 1 ? 'hace 1 día' : 'hace ' + listing.daysAgo + ' días'}</p>
            </div>
            <div class="listing-footer">
                <span class="views"><i class="fas fa-eye"></i> ${listing.views} Vendedores Vieron</span>
                <span class="offers"><i class="fas fa-comment-dollar"></i> ${listing.offers} Ofertas</span>
            </div>
            <button class="btn contact-buyer">¡Lo Tengo!</button>
        `;
        
        listingsContainer.appendChild(listingElement);
    });
}

// Get more listings - this would fetch from an API in a real app
function loadMoreListings() {
    // In a real app, this would make an API call to get more listings
    console.log('Cargando más anuncios...');}