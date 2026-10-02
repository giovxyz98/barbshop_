// Nome e identità del locale: da cambiare SOLO qui. Le pagine leggono questi valori
// tramite gli attributi data-brand (testo) e data-brand-src / data-brand-alt (logo).
const BRAND = {
    nome: 'Tophair',
    sottotitolo: 'Barber Shop',
    logo: 'logo.jpeg',
};

(function () {
    const valori = {
        nome: BRAND.nome,
        completo: `${BRAND.nome} ${BRAND.sottotitolo}`.trim(),
        benvenuto: `Benvenuto su ${BRAND.nome}`,
    };

    function applica() {
        document.querySelectorAll('[data-brand]').forEach(el => {
            const v = valori[el.dataset.brand];
            if (v !== undefined) el.textContent = v;
        });
        document.querySelectorAll('[data-brand-logo]').forEach(img => {
            img.src = BRAND.logo;
            img.alt = BRAND.nome;
        });
        document.title = BRAND.nome;
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applica);
    else applica();
})();
