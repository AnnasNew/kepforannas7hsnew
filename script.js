let selectedProduct = {};

function openModal(modalId) {
    const modal = document.getElementById(modalId + '-modal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId + '-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

function openProductModal(name, image, price) {
    selectedProduct = { name, image, price };
    document.getElementById('modal-product-name').innerText = name;
    document.getElementById('modal-product-image').src = image;
    document.getElementById('modal-product-price').innerText = formatRupiah(price);
    document.getElementById('product-quantity').value = 1;
    updateTotalPrice();
    closeModal('shop');
    openModal('product');
}

function changeQuantity(change) {
    const quantityInput = document.getElementById('product-quantity');
    let quantity = parseInt(quantityInput.value);
    quantity += change;
    if (quantity < 1) {
        quantity = 1;
        showNotification('Jumlah tidak bisa kurang dari 1.');
    }
    quantityInput.value = quantity;
    updateTotalPrice();
}

function updateTotalPrice() {
    const quantity = parseInt(document.getElementById('product-quantity').value);
    const totalPrice = selectedProduct.price * quantity;
    document.getElementById('total-price').innerText = formatRupiah(totalPrice);
}

function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
}

function sendOrder() {
    const quantity = document.getElementById('product-quantity').value;
    const total = document.getElementById('total-price').innerText;
    const message = `Halo, saya ingin memesan produk:\n\n*Nama Produk:* ${selectedProduct.name}\n*Jumlah:* ${quantity}\n*Total Harga:* ${total}\n\nMohon petunjuk untuk pembayarannya.`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappNumber = '6283173814158';
    const url = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    window.open(url, '_blank');
    closeModal('product-modal');
    showNotification('Pesanan terkirim via WhatsApp!', 'success');
}

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Nomor berhasil disalin!', 'success');
    }).catch(err => {
        console.error('Gagal menyalin: ', err);
        showNotification('Gagal menyalin nomor.', 'error');
    });
}

function downloadImage(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Gambar berhasil diunduh!', 'success');
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification-area');
    notification.innerText = message;
    notification.classList.add('show');
    
    if (type === 'error') {
        notification.style.backgroundColor = 'var(--danger-color)';
    } else {
        notification.style.backgroundColor = 'var(--success-color)';
    }

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

const audio = document.getElementById('background-audio');
const musicBtn = document.getElementById('musicToggleBtn');
let isPlaying = false;

musicBtn.addEventListener('click', () => {
    if (isPlaying) {
        audio.pause();
        musicBtn.innerText = '▶';
        showNotification('Musik dihentikan.', 'info');
    } else {
        audio.play().catch(e => console.error("Audio playback failed:", e));
        musicBtn.innerText = '⏸';
        showNotification('Musik diputar.', 'info');
    }
    isPlaying = !isPlaying;
});

document.addEventListener('DOMContentLoaded', () => {
    const quantityInput = document.getElementById('product-quantity');
    if (quantityInput) {
        quantityInput.addEventListener('focus', (e) => {
            e.target.blur();
        });
    }
});
