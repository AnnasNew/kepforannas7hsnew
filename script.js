const whatsappNumber = "6285768351775";
let selectedProduct = {};

function openModal(type) {
    const modal = document.getElementById(type + '-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeModal(type) {
    const modal = document.getElementById(type + '-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert("Nomor berhasil disalin!");
    }).catch(err => {
        console.error('Gagal menyalin: ', err);
        alert("Gagal menyalin nomor.");
    });
}

function downloadImage(imageUrl, filename) {
    fetch(imageUrl)
        .then(response => response.blob())
        .then(blob => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        })
        .catch(err => console.error('Gagal mengunduh gambar', err));
}

function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
}

function openProductModal(name, image, price) {
    selectedProduct = {
        name: name,
        image: image,
        price: price
    };
    closeModal('shop');
    document.getElementById('modal-product-name').textContent = selectedProduct.name;
    document.getElementById('modal-product-image').src = selectedProduct.image;
    document.getElementById('modal-product-price').textContent = formatRupiah(selectedProduct.price);
    document.getElementById('product-quantity').value = 1;
    updateTotalPrice();
    openModal('product');
}

function updateTotalPrice() {
    const quantity = parseInt(document.getElementById('product-quantity').value);
    const totalPrice = selectedProduct.price * quantity;
    document.getElementById('total-price').textContent = formatRupiah(totalPrice);
}

function changeQuantity(amount) {
    const quantityInput = document.getElementById('product-quantity');
    let currentQuantity = parseInt(quantityInput.value);
    currentQuantity += amount;
    if (currentQuantity < 1) {
        currentQuantity = 1;
    }
    quantityInput.value = currentQuantity;
    updateTotalPrice();
}

function sendOrder() {
    const quantity = document.getElementById('product-quantity').value;
    const total = document.getElementById('total-price').textContent;
    const message = `Halo, saya ingin order produk ini:%0A%0A*Nama Produk:* ${selectedProduct.name}%0A*Jumlah:* ${quantity}%0A*Harga Total:* ${total}%0A%0ATerima kasih.`;
    
    const whatsappLink = `https://wa.me/${whatsappNumber}?text=${message}`;
    window.open(whatsappLink, '_blank');
    closeModal('product');
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const audio = document.getElementById('background-audio');
    const musicToggleBtn = document.getElementById('musicToggleBtn');
    let isPlaying = false;

    musicToggleBtn.addEventListener('click', toggleAudio);

    function toggleAudio() {
        if (isPlaying) {
            audio.pause();
            musicToggleBtn.textContent = '▶';
            musicToggleBtn.classList.add('paused');
        } else {
            audio.play();
            musicToggleBtn.textContent = '⏸';
            musicToggleBtn.classList.remove('paused');
        }
        isPlaying = !isPlaying;
    }
});
