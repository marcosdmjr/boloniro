// ============================================
// CONFIGURAÇÃO DA API DUTTYFY
// ============================================
// IMPORTANTE: Substitua 'SUA_CHAVE_ENCRIPTADA' pela sua chave real da Duttyfy
const DUTTYFY_API_KEY = 'z9X2Hv1P6NXRo1EdPH3sMvYnNbkO34eOO0ywJTntcp3YrWLuMH_QWC4Xo6KjXRU4AP_trJzhtGBJXDkmPOnGGQ';
const DUTTYFY_API_URL = 'https://app.duttyfy.com.br/api-pix';

// ============================================
// CONFIGURAÇÃO DA API XTRACKY
// ============================================
const XTRACKY_API_URL = 'https://api.xtracky.com/api/integrations/api';

// Extrair UTM source da URL
function getUtmSource() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('utm_source') || '';
}

// Enviar dados para Xtracky
async function sendToXtracky(orderId, amount, status) {
    try {
        const response = await fetch(XTRACKY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                orderId: orderId,
                amount: amount,
                status: status,
                utm_source: getUtmSource()
            })
        });

        if (!response.ok) {
            console.error('Erro ao enviar para Xtracky:', response.status);
        }
    } catch (error) {
        console.error('Erro ao enviar para Xtracky:', error);
    }
}

// ============================================
// CONTROLE DO VÍDEO E SOM
// ============================================
const video = document.getElementById('mainVideo');
const soundButton = document.getElementById('soundButton');

soundButton.addEventListener('click', () => {
    video.currentTime = 0;
    video.muted = false;
    video.play();
    soundButton.style.display = 'none';
});

// Autoplay do vídeo mutado
video.play().catch(error => {
    console.log('Autoplay prevented:', error);
});

// ============================================
// MODAL PIX
// ============================================
const modal = document.getElementById('pixModal');
const closeModalBtn = document.getElementById('closeModal');
const donationButtons = document.querySelectorAll('.donation-btn');

// Variáveis globais para controle
let currentTransactionId = null;
let currentTransactionAmount = 0;
let statusCheckInterval = null;
let timerInterval = null;
let timeRemaining = 900; // 15 minutos em segundos
let selectedAmount = 0;
let includesShipping = false;
const SHIPPING_COST = 20;

// Fechar modal
closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

function closeModal() {
    modal.style.display = 'none';
    clearInterval(statusCheckInterval);
    clearInterval(timerInterval);
    currentTransactionId = null;
    timeRemaining = 900;
    includesShipping = false;
}

// ============================================
// BOTÕES DE DOAÇÃO
// ============================================
donationButtons.forEach(button => {
    button.addEventListener('click', () => {
        const amount = parseFloat(button.dataset.amount);
        selectedAmount = amount;

        if (amount >= 50) {
            showAddressForm(amount);
        } else {
            includesShipping = false;
            generatePix(amount);
        }
    });
});

// ============================================
// BOTÕES DE RECOMPENSA
// ============================================
const rewardButtons = document.querySelectorAll('.reward-donate-btn');
rewardButtons.forEach(button => {
    button.addEventListener('click', () => {
        const amount = parseFloat(button.dataset.amount);
        selectedAmount = amount;
        showAddressForm(amount);
    });
});

// ============================================
// FORMULÁRIO DE ENDEREÇO
// ============================================
function showAddressForm(amount) {
    const addressForm = document.getElementById('addressForm');
    addressForm.style.display = 'block';

    document.getElementById('donationValue').textContent = `R$ ${amount.toFixed(2).replace('.', ',')}`;
    const total = amount + SHIPPING_COST;
    document.getElementById('totalValue').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;

    addressForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Máscara para CEP
document.getElementById('cep').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 5) {
        value = value.slice(0, 5) + '-' + value.slice(5, 8);
    }
    e.target.value = value;

    if (value.replace(/\D/g, '').length === 8) {
        searchCEP(value.replace(/\D/g, ''));
    }
});

// Buscar CEP na API ViaCEP
async function searchCEP(cep) {
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();

        if (data.erro) {
            alert('CEP não encontrado!');
            return;
        }

        document.getElementById('street').value = data.logradouro || '';
        document.getElementById('neighborhood').value = data.bairro || '';
        document.getElementById('city').value = data.localidade || '';
        document.getElementById('state').value = data.uf || '';

        document.getElementById('number').focus();
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        alert('Erro ao buscar CEP. Tente novamente.');
    }
}

// Confirmar doação com endereço
document.getElementById('confirmDonation').addEventListener('click', () => {
    const requiredFields = [
        { id: 'cep', name: 'CEP' },
        { id: 'street', name: 'Rua' },
        { id: 'number', name: 'Número' },
        { id: 'neighborhood', name: 'Bairro' },
        { id: 'city', name: 'Cidade' },
        { id: 'state', name: 'Estado' },
        { id: 'name', name: 'Nome completo' },
        { id: 'phone', name: 'Telefone' }
    ];

    for (const field of requiredFields) {
        const input = document.getElementById(field.id);
        if (!input.value.trim()) {
            alert(`Por favor, preencha o campo: ${field.name}`);
            input.focus();
            return;
        }
    }

    const total = selectedAmount + SHIPPING_COST;
    includesShipping = true;
    generatePix(total);
});

// ============================================
// GERAÇÃO DO PIX
// ============================================
async function generatePix(amount) {
    // Mostrar modal com loading
    modal.style.display = 'block';

    // Atualizar breakdown do PIX
    if (includesShipping) {
        document.getElementById('modalDonationAmount').textContent = `R$ ${selectedAmount.toFixed(2).replace('.', ',')}`;
        document.getElementById('shippingRow').style.display = 'flex';
        document.getElementById('modalAmount').textContent = `R$ ${amount.toFixed(2).replace('.', ',')}`;
    } else {
        document.getElementById('modalDonationAmount').textContent = `R$ ${amount.toFixed(2).replace('.', ',')}`;
        document.getElementById('shippingRow').style.display = 'none';
        document.getElementById('modalAmount').textContent = `R$ ${amount.toFixed(2).replace('.', ',')}`;
    }

    document.getElementById('qrcodeContainer').innerHTML = '<p>Gerando PIX...</p>';
    document.getElementById('pixCode').value = '';
    document.getElementById('successMessage').style.display = 'none';

    // Converter valor para centavos
    const amountInCents = Math.round(amount * 100);

    // Dados da requisição
    const requestBody = {
        amount: amountInCents,
        description: "Doação campanha",
        customer: {
            name: "Apoiador",
            document: "12345678909",
            email: "apoio@email.com",
            phone: "11999999999"
        },
        item: {
            title: "Doação",
            price: amountInCents,
            quantity: 1
        },
        paymentMethod: "PIX"
    };

    try {
        const response = await fetch(`${DUTTYFY_API_URL}/${DUTTYFY_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error('Erro ao gerar PIX');
        }

        const data = await response.json();

        // Armazenar ID da transação e valor
        currentTransactionId = data.transactionId;
        currentTransactionAmount = amountInCents;

        // Enviar para Xtracky - aguardando pagamento
        sendToXtracky(data.transactionId, amountInCents, 'waiting_payment');

        // Exibir código PIX
        document.getElementById('pixCode').value = data.pixCode;

        // Gerar QR Code
        generateQRCode(data.pixCode);

        // Iniciar timer
        startTimer();

        // Iniciar verificação de status
        startStatusCheck();

    } catch (error) {
        console.error('Erro ao gerar PIX:', error);
        document.getElementById('qrcodeContainer').innerHTML = '<p style="color: red;">Erro ao gerar PIX. Tente novamente.</p>';
    }
}

// ============================================
// GERAÇÃO DO QR CODE
// ============================================
function generateQRCode(pixCode) {
    // Usar API pública para gerar QR Code
    const qrcodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode)}`;

    document.getElementById('qrcodeContainer').innerHTML = `
        <img src="${qrcodeUrl}" alt="QR Code PIX" style="max-width: 100%; height: auto;">
    `;
}

// ============================================
// COPIAR CÓDIGO PIX
// ============================================
document.getElementById('copyButton').addEventListener('click', () => {
    const pixCodeInput = document.getElementById('pixCode');
    pixCodeInput.select();
    document.execCommand('copy');

    const copyBtn = document.getElementById('copyButton');
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = '<span class="copy-icon">✓</span> Copiado!';
    copyBtn.style.backgroundColor = '#218838';

    setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.style.backgroundColor = '#28a745';
    }, 2000);
});

// ============================================
// TIMER DE 15 MINUTOS
// ============================================
function startTimer() {
    timeRemaining = 900; // Reset para 15 minutos
    updateTimerDisplay();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            closeModal();
            alert('Tempo expirado. Por favor, gere um novo PIX.');
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    document.getElementById('timer').textContent =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ============================================
// VERIFICAÇÃO DE STATUS DO PAGAMENTO
// ============================================
function startStatusCheck() {
    clearInterval(statusCheckInterval);

    statusCheckInterval = setInterval(async () => {
        if (currentTransactionId) {
            await checkPaymentStatus();
        }
    }, 10000); // A cada 10 segundos
}

async function checkPaymentStatus() {
    try {
        const response = await fetch(
            `${DUTTYFY_API_URL}/${DUTTYFY_API_KEY}?transactionId=${currentTransactionId}`
        );

        if (!response.ok) {
            throw new Error('Erro ao verificar status');
        }

        const data = await response.json();

        if (data.status === 'COMPLETED') {
            // Pagamento confirmado!
            clearInterval(statusCheckInterval);
            clearInterval(timerInterval);

            // Enviar para Xtracky - pagamento aprovado
            sendToXtracky(currentTransactionId, currentTransactionAmount, 'paid');

            document.getElementById('successMessage').style.display = 'block';
            document.querySelector('.modal-status').textContent = 'Pagamento confirmado!';

            // Atualizar métricas (simulação)
            updateMetrics();

            // Fechar modal após 5 segundos
            setTimeout(() => {
                closeModal();
            }, 5000);
        }

    } catch (error) {
        console.error('Erro ao verificar status:', error);
    }
}

// ============================================
// ATUALIZAR MÉTRICAS NA PÁGINA
// ============================================
function updateMetrics() {
    // Incrementar número de participantes
    const participantsElement = document.getElementById('participantsCount');
    let currentParticipants = parseInt(participantsElement.textContent.replace(/\./g, ''));
    currentParticipants++;
    participantsElement.textContent = currentParticipants.toLocaleString('pt-BR');

    // Incrementar total arrecadado (simulação)
    const totalElement = document.getElementById('totalAmount');
    let currentTotal = parseFloat(totalElement.textContent.replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
    // Aqui você deveria somar o valor real da doação
    totalElement.textContent = `R$ ${currentTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

    // Atualizar barra de progresso (simulação - baseado em meta fictícia de 2 milhões)
    const meta = 2000000;
    const percentage = Math.min((currentTotal / meta) * 100, 100);
    document.getElementById('progressFill').style.width = `${percentage}%`;
    document.getElementById('progressPercentage').textContent = `${Math.round(percentage)}%`;
}

// ============================================
// ANIMAÇÕES E EFEITOS
// ============================================
// Scroll suave
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Animação de entrada dos elementos ao scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Aplicar animação aos cards
document.querySelectorAll('.metric-card, .donation-btn').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'all 0.6s ease';
    observer.observe(el);
});

// ============================================
// AUTO-INCREMENT DOS VALORES (SIMULAÇÃO)
// ============================================
function startAutoIncrement() {
    setInterval(() => {
        // Incrementar participantes aleatoriamente (1 a 3 pessoas a cada 5-15 segundos)
        const participantsElement = document.getElementById('participantsCount');
        let currentParticipants = parseInt(participantsElement.textContent.replace(/\./g, ''));
        const incrementParticipants = Math.floor(Math.random() * 3) + 1;
        currentParticipants += incrementParticipants;
        participantsElement.textContent = currentParticipants.toLocaleString('pt-BR');

        // Incrementar total arrecadado proporcionalmente (20 a 100 reais por doação)
        const totalElement = document.getElementById('totalAmount');
        let currentTotal = parseFloat(totalElement.textContent.replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
        const incrementAmount = (Math.random() * 80 + 20) * incrementParticipants;
        currentTotal += incrementAmount;
        totalElement.textContent = `R$ ${currentTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

        // Atualizar barra de progresso (meta de 2 milhões)
        const meta = 2000000;
        const percentage = Math.min((currentTotal / meta) * 100, 100);
        document.getElementById('progressFill').style.width = `${percentage}%`;
        document.getElementById('progressPercentage').textContent = `${Math.round(percentage)}%`;
    }, Math.random() * 10000 + 5000); // Entre 5 e 15 segundos
}

// Iniciar auto-increment quando a página carregar
startAutoIncrement();

// ============================================
// FAQ ACCORDION
// ============================================
document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
        const faqItem = button.parentElement;
        const isActive = faqItem.classList.contains('active');

        // Fechar todos os outros itens
        document.querySelectorAll('.faq-item').forEach(item => {
            item.classList.remove('active');
        });

        // Abrir o item clicado se não estava ativo
        if (!isActive) {
            faqItem.classList.add('active');
        }
    });
});

console.log('Site de doações carregado com sucesso!');
console.log('LEMBRE-SE: Substitua "SUA_CHAVE_ENCRIPTADA" pela sua chave real da Duttyfy no início do arquivo script.js');
