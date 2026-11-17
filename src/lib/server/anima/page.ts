/** ANIMA — rendu de la page personnalisée « Ce qu'AULIA ferait pour vous » (charte or et noir). */

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

type PageData = {
  titre: string;
  profil?: string;
  besoins?: string[];
  propositions?: { nom: string; statut: string; domaine: string; apport?: string }[];
  prochaine_etape?: string;
};

export function renderPage(d: PageData, lang: string, siteUrl: string): string {
  const t = lang === 'en'
    ? ['Your profile', 'Your needs', 'What AULIA would bring you', 'Next step', 'Statuses reflect the real state of each company: AULIA is a group under construction.', "Prepared by ANIMA, AULIA's intelligence", 'Back to AULIA']
    : ['Votre profil', 'Vos besoins', "Ce qu'AULIA vous apporterait", 'Prochaine étape', "Les statuts indiqués reflètent l'état réel de chaque filiale : AULIA est un groupe en construction.", "Préparé par ANIMA, l'intelligence d'AULIA", 'Retour à AULIA'];
  const sections: string[] = [];
  if (d.profil) sections.push(`<section><h2>${t[0]}</h2><p>${esc(d.profil)}</p></section>`);
  if (d.besoins?.length) sections.push(`<section><h2>${t[1]}</h2><ul>${d.besoins.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></section>`);
  sections.push(`<section><h2>${t[2]}</h2><div class="grid">${(d.propositions ?? []).map((p) => `
    <article class="card"><div class="head"><h3>${esc(p.nom)}</h3><span class="badge">${esc(p.statut)}</span></div>
    <p class="dom">${esc(p.domaine)}</p><p>${esc(p.apport)}</p></article>`).join('')}</div></section>`);
  if (d.prochaine_etape) sections.push(`<section class="next"><h2>${t[3]}</h2><p>${esc(d.prochaine_etape)}</p></section>`);
  return `<!DOCTYPE html><html lang="${lang === 'en' ? 'en' : 'fr'}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${esc(d.titre)} — AULIA</title>
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700&display=swap">
<style>
:root{--bg:#11100d;--panel:#1a1814;--line:#3a3220;--text:#f3efe6;--muted:#a59d8a;--gold:#c6a45c;--gold2:#ffd230}
*{box-sizing:border-box}body{margin:0;font-family:Urbanist,system-ui,sans-serif;color:var(--text);line-height:1.6;
background:radial-gradient(1100px 520px at 80% -10%,#2a2412 0%,transparent 60%),var(--bg)}
main{max-width:880px;margin:0 auto;padding:56px 22px 80px}
.brand{letter-spacing:.34em;font-size:12px;color:var(--gold)}
h1{font-size:clamp(30px,5vw,46px);font-weight:600;margin:.35em 0 .9em;line-height:1.15}
h2{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin:0 0 12px;font-weight:600}
section{margin:0 0 36px}ul{padding-left:20px}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.card{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:22px}
.head{display:flex;justify-content:space-between;gap:10px;align-items:center}h3{margin:0;font-size:19px}
.badge{font-size:11px;padding:4px 10px;border-radius:999px;border:1px solid var(--gold);color:var(--gold);white-space:nowrap}
.dom{color:var(--muted);font-size:14px}
.next{background:linear-gradient(135deg,rgba(198,164,92,.14),rgba(255,210,48,.05));border:1px solid var(--line);border-radius:18px;padding:22px}
footer{color:var(--muted);font-size:13px;border-top:1px solid var(--line);padding-top:18px}
a{color:var(--gold2)}
</style></head><body><main>
<div class="brand">AULIA · ANIMA</div><h1>${esc(d.titre)}</h1>
${sections.join('\n')}
<footer><p>${t[4]}</p><p>${t[5]} · <a href="${esc(siteUrl)}">${t[6]}</a></p></footer></main></body></html>`;
}
