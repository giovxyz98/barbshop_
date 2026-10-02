// Nome e identità del locale: da cambiare SOLO qui. Le pagine leggono questi valori
// tramite gli attributi data-brand (testo) e data-brand-logo (immagine del logo).
const BRAND = {
    nome: 'Simone Barber',
    sottotitolo: 'Barber Shop',
    logo: 'logo.jpeg',
};

(function () {
    const valori = {
        nome: BRAND.nome,
        completo: `${BRAND.nome} ${BRAND.sottotitolo}`.trim(),
        benvenuto: `Benvenuto su ${BRAND.nome}`,
    };

    function applyBrand() {
        document.querySelectorAll('[data-brand]').forEach(el => {
            const v = valori[el.dataset.brand];
            if (v !== undefined) el.textContent = v;
        });
        document.querySelectorAll('[data-brand-logo]').forEach(img => {
            img.src = BRAND.logo;
            img.alt = BRAND.nome;
        });
        const sezione = document.documentElement.dataset.titolo;
        let icon = document.querySelector('link[rel="icon"]');
        if (!icon) { icon = document.createElement('link'); icon.rel = 'icon'; document.head.appendChild(icon); }
        icon.href = BRAND.logo;
        document.title = sezione ? `${sezione} · ${BRAND.nome}` : BRAND.nome;
    }
    window.applyBrand = applyBrand;

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyBrand);
    else applyBrand();
})();
