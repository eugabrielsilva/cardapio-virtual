$(function() {
    let settings = {};
    let order = [];

    const $loading = $('.loading-app');
    const $headerContainer = $('header');
    const $mainContainer = $('main');
    const $categories = $('ul.nav');
    const $footerContainer = $('footer');
    const $footerOverlay = $('.footer-overlay');
    const $detailsModal = $('.details-modal');
    const $quantityField = $detailsModal.find('input[name="quantity"]');
    const $observationsField = $detailsModal.find('textarea[name="observations"]');
    const $finishModal = $('.finish-modal');

    /**
     * Formata um valor de float para R$.
     */
    function formatPrice(price) {
        return 'R$ ' + price.toFixed(2).replace('.', ',');
    }

    /**
     * Transforma uma string em slug.
     */
    function formatSlug(str) {
        return str.normalize('NFKD').toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[-\s]+/g, '-');
    }

    /**
     * Formata um telefone usando máscara.
     */
    function formatPhone(value) {
        value = value.replace(/\D/g, '');
        if(value.length <= 10) {
            value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        } else if(value.length <= 11) {
            value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if(value.length <= 12) {
            value = value.replace(/(\d{2})(\d{2})(\d{4})(\d{4})/, '+$1 ($2) $3-$4');
        } else {
            value = value.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4');
        }
        return value;
    }

    /**
     * Carrega as configurações da loja.
     */
    function loadSettings(data) {
        settings = data;
        $headerContainer.find('.store-name').text(settings.name);
        $headerContainer.find('.store-time').text(settings.time);
        $headerContainer.css('background-image', `url('${settings.image}')`);

        const deliveryTax = settings.delivery_price === 0 ? 'Grátis' : formatPrice(settings.delivery_price);
        const whatsappUrl = 'https://wa.me/' + settings.whatsapp.replace(/\D/g, '');

        $headerContainer.find('.store-delivery strong').text(deliveryTax);
        $headerContainer.find('.store-whatsapp').attr('href', whatsappUrl);
        $headerContainer.find('.store-location').attr('href', settings.location);
        $footerContainer.find('.cart-total .delivery strong').text(deliveryTax);

        $('title').text(settings.name + ' - Cardápio Virtual');
    }

    /**
     * Carrega os dados salvos no navegador.
     */
    function loadSavedData() {
        let formData = localStorage.getItem('saved-form');

        if(formData) {
            try {
                formData = JSON.parse(formData);
                formData.forEach(item => {
                    $finishModal.find(`[name="${item.name}"]`).val(item.value);
                });

                $finishModal.find('select[name="type"]').trigger('change');
            } catch(error) {
                localStorage.removeItem('saved-form');
            }
        }

        let orderData = sessionStorage.getItem('saved-order');

        if(orderData) {
            try {
                orderData = JSON.parse(orderData);
                order = orderData;
                updateCart();
            } catch(error) {
                sessionStorage.removeItem('saved-order');
            }
        }
    }

    /**
     * Carrega a lista de categorias e produtos.
     */
    function loadProducts(products) {
        const $categoryBase = $mainContainer.find('.category-base');
        const $itemBase = $mainContainer.find('.item-base');

        products.forEach(category => {
            if(!category.active) return;

            const $categoryLink = $(`<li class="nav-item"><a href="#${formatSlug(category.category)}" class="nav-link">${category.category}</li>`);
            $categories.append($categoryLink);

            const $category = $categoryBase.clone();
            $category.attr('id', formatSlug(category.category));
            $category.find('.category-name').text(category.category);

            category.products.forEach(product => {
                if(!product.active) return;

                const $item = $itemBase.clone();
                $item.find('img').attr('src', product.image);
                $item.find('.item-name').text(product.name);
                $item.find('.item-description').text(product.description);
                $item.find('.item-price').text(formatPrice(product.price));

                $item.on('click', e => {
                    e.preventDefault();
                    showProductDetails(product);
                });

                $item.removeClass('item-base');
                $item.removeClass('hide');
                $category.find('.scroll-container').append($item);
            });

            $category.removeClass('category-base');
            $category.removeClass('hide');
            $mainContainer.append($category);
        });

        $('body').scrollspy({
            target: '.categories-list'
        });
    }

    /**
     * Exibe o modal com detalhes de um produto.
     */
    function showProductDetails(product) {
        $detailsModal.find('img').attr('src', product.image);
        $detailsModal.find('.product-title').text(product.name);
        $detailsModal.find('.product-description').text(product.description);
        $detailsModal.find('.product-price').text(formatPrice(product.price));

        $quantityField.val(1);
        $observationsField.val('');

        const $btn = $detailsModal.find('.btn-add');
        $btn.off('click');

        $btn.on('click', () => {
            addProduct(product);
        });

        $detailsModal.modal('show');
    }

    /**
     * Adiciona um produto ao carrinho.
     */
    function addProduct(product) {
        const quantity = parseInt($quantityField.val() || 0);
        const observations = $observationsField.val() || '';

        if(quantity <= 0) return;

        const total = product.price * quantity;

        order.push({
            ...product,
            quantity,
            observations,
            total
        });

        updateCart();

        $detailsModal.modal('hide');

        Swal.fire({
            theme: 'dark',
            toast: true,
            position: 'top',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
            title: 'Produto adicionado!',
            icon: 'success'
        });
    }

    /**
     * Remove um produto do carrinho.
     */
    function removeProduct(index) {
        order.splice(index, 1);
        updateCart();

        Swal.fire({
            theme: 'dark',
            toast: true,
            position: 'top',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
            title: 'Produto removido!',
            icon: 'success'
        });
    }

    /**
     * Atualiza a lista de produtos do carrinho.
     */
    function updateCart() {
        sessionStorage.setItem('saved-order', JSON.stringify(order));

        const $cartContainer = $footerContainer.find('.cart-container');
        const $emptyMessage = $footerContainer.find('.empty-message');
        const $itemsMessage = $footerContainer.find('.items-message');
        const $cartTotal = $footerContainer.find('.cart-total');

        $cartContainer.empty();

        if(!order.length) {
            $emptyMessage.removeClass('hide');
            $itemsMessage.addClass('hide');
            $cartTotal.addClass('hide');
            return;
        }

        $emptyMessage.addClass('hide');

        const totalItems = order.reduce((total, item) => total + item.quantity, 0);
        $itemsMessage.find('p strong').text(totalItems);
        $itemsMessage.removeClass('hide');

        const totalPrice = order.reduce((sum, item) => sum + item.total, 0);
        $cartTotal.find('.subtotal strong').text(formatPrice(totalPrice));
        $cartTotal.removeClass('hide');

        const $cartItemBase = $footerContainer.find('.cart-item-base');

        order.forEach((product, index) => {
            const $item = $cartItemBase.clone();

            $item.find('img').attr('src', product.image);
            $item.find('.product-title').text(product.name);
            $item.find('.product-quantity strong').text(product.quantity);
            $item.find('.product-price strong').text(formatPrice(product.price));
            $item.find('.product-total strong').text(formatPrice(product.total));

            if(product.observations.length) {
                $item.find('.product-observations').removeClass('hide');
                $item.find('.product-observations strong').text(product.observations);
            }

            const $btnRemove = $item.find('.btn-remove');

            $btnRemove.on('click', () => {
                removeProduct(index);
            });

            $item.removeClass('cart-item-base');
            $item.removeClass('hide');

            $cartContainer.append($item);
        });
    }

    /**
     * Habilita scroll horizontal no desktop.
     */
    function enableDragScroll() {
        if(window.matchMedia('(pointer: fine)').matches) {
            $('.scroll-container, .categories-list').each(function() {
                let isDown = false;
                let startX;
                let scrollLeft;
                const $this = $(this);

                $this.on('mousedown', function(e) {
                    isDown = true;
                    startX = e.pageX - $this.offset().left;
                    scrollLeft = $this.scrollLeft();
                });

                $this.on('mouseleave mouseup', function() {
                    isDown = false;
                });

                $this.on('mousemove', function(e) {
                    if(!isDown) return;
                    e.preventDefault();
                    const x = e.pageX - $this.offset().left;
                    const walk = (x - startX) * 1;
                    $this.scrollLeft(scrollLeft - walk);
                });
            });
        }
    }

    /**
     * Observa clique na opção de diminuir quantidade.
     */
    $detailsModal.find('.btn-minus').on('click', () => {
        const quantity = parseInt($quantityField.val() || 0);
        if(quantity <= 0) return;
        $quantityField.val(quantity - 1);
    });

    /**
     * Observa clique na opção de aumentar quantidade.
     */
    $detailsModal.find('.btn-plus').on('click', () => {
        const quantity = parseInt($quantityField.val() || 0);
        $quantityField.val(quantity + 1);
    });

    /**
     * Observa clique no botão de expandir / recolher o carrinho.
     */
    $footerContainer.find('.btn-footer-toggle').on('click', () => {
        $footerContainer.toggleClass('expand');
        $footerOverlay.toggleClass('show');
        $('body').toggleClass('overflow-hidden');
    });

    /**
     * Observa clique no botão de finalizar pedido.
     */
    $footerContainer.find('.btn-finish').on('click', () => {
        if(!$footerContainer.hasClass('expand')) {
            $footerContainer.addClass('expand');
            $footerOverlay.addClass('show');
            $('body').addClass('overflow-hidden');
        }

        $finishModal.modal('show');
    });

    /**
     * Observa alteração do tipo de entrega para exibir o campo de endereço.
     */
    $finishModal.find('select[name="type"]').on('change', function() {
        const type = $(this).val();
        const $addressField = $finishModal.find('textarea[name="address"]');

        if(type === 'Delivery') {
            $addressField.closest('.form-group').removeClass('hide');
            $addressField.prop('required', true);
        } else {
            $addressField.closest('.form-group').addClass('hide');
            $addressField.prop('required', false);
        }
    });

    /**
     * Aplica máscara de telefone no campo de celular.
     */
    $finishModal.find('input[name="cellphone"]').on('input', function() {
        $(this).val(formatPhone($(this).val()));
    });

    /**
     * Realiza o envio do pedido por WhatsApp.
     */
    $finishModal.find('.form-finish').on('submit', function(e) {
        e.preventDefault();

        const formData = $(this).serializeArray();
        const form = {};
        formData.forEach(f => form[f.name] = f.value);

        localStorage.setItem('saved-form', JSON.stringify(formData));

        const totalPrice = order.reduce((sum, item) => sum + item.total, 0);
        const deliveryTax = (settings.delivery_price === 0 || form.type !== 'Delivery') ? 'Grátis' : formatPrice(settings.delivery_price);

        const message =
            `🍔 *${settings.name}* 🍟\n\n` +
            `👋 Olá, gostaria de fazer o seguinte pedido:\n\n` +
            `📝 *Dados do Cliente*\n` +
            `- *Nome:* ${form.name}\n` +
            `- *Celular:* ${form.cellphone}\n` +
            `- *Forma de pagamento:* ${form.payment}\n` +
            `- *Tipo:* ${form.type}\n` +
            (form.type === 'Delivery' ? `- *Endereço:* ${form.address}\n\n` : '\n') +
            `🛒 *Pedido*\n` +
            order.map(item =>
                `• *Produto:* ${item.name}\n` +
                `   - *Quantidade:* ${item.quantity}\n` +
                `   - *Valor:* ${formatPrice(item.price)}\n` +
                `   - *Total:* ${formatPrice(item.total)}\n` +
                (item.observations ? `   - *Observações:* ${item.observations}\n` : '')
            ).join('\n') +
            `\n💰 *Subtotal:* ${formatPrice(totalPrice)}\n` +
            `*🛵 Taxa de entrega:* ${deliveryTax}`;

        const url = 'https://wa.me/' + settings.whatsapp.replace(/\D/g, '') + '?text=' + encodeURIComponent(message);
        window.open(url, '_blank');

        Swal.fire({
            theme: 'dark',
            title: 'Pedido realizado!',
            text: 'Você será redirecionado ao WhatsApp para finalizar seu pedido. Envie a mensagem para confirmar.',
            icon: 'success'
        });

        $finishModal.modal('hide');
        $footerContainer.removeClass('expand');
        $('body').removeClass('overflow-hidden');
        $footerOverlay.removeClass('show');
        sessionStorage.removeItem('saved-order');
    });

    /**
     * Carrega os dados da loja e produtos ao iniciar.
     */
    $.getJSON('assets/data.json', data => {
        loadSettings(data.settings);
        loadProducts(data.categories);
        loadSavedData();
        enableDragScroll();
        $loading.fadeOut('fast');
    });
});