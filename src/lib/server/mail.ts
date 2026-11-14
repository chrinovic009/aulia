/**
 * Envoi des e-mails (codes à 6 chiffres, invitations, alertes de contact) via l'API Resend.
 * Variables : RESEND_API_KEY, MAIL_FROM (ex. « AULIA <no-reply@aulia-holding.com> »).
 * En développement, sans clé, le message est affiché dans la console du serveur.
 */
import { env, isProd } from './env.ts';

export type Mail = { to: string; subject: string; text: string; html?: string; replyTo?: string };

export async function sendMail(mail: Mail): Promise<{ ok: boolean; error?: string }> {
  const key = env('RESEND_API_KEY');
  if (!key) {
    if (isProd()) return { ok: false, error: 'L’envoi d’e-mails n’est pas encore configuré (RESEND_API_KEY).' };
    console.info(`\n[AULIA · e-mail de développement]\nÀ : ${mail.to}\nObjet : ${mail.subject}\n${mail.text}\n`);
    return { ok: true };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env('MAIL_FROM') ?? 'AULIA <onboarding@resend.dev>',
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        html: mail.html ?? layout(mail.subject, mail.text),
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      }),
    });
    if (!res.ok) return { ok: false, error: `Envoi refusé par le service d’e-mail (${res.status}).` };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Service d’e-mail injoignable.' };
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function layout(title: string, text: string, code?: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0d0c0a;font-family:Urbanist,Segoe UI,Arial,sans-serif;color:#f3efe6">
<div style="max-width:520px;margin:0 auto;padding:40px 28px">
<div style="font-weight:800;letter-spacing:.32em;color:#ffd230;font-size:14px">AULIA</div>
<h1 style="font-size:22px;font-weight:600;margin:28px 0 16px">${esc(title)}</h1>
${code ? `<div style="font-size:34px;letter-spacing:.42em;font-weight:700;color:#ffd230;background:#1a1814;border:1px solid #3a352b;border-radius:14px;padding:18px 0;text-align:center;margin:8px 0 22px">${esc(code)}</div>` : ''}
<div style="font-size:15px;line-height:1.6;color:#cfc8b8;white-space:pre-line">${esc(text)}</div>
<p style="font-size:12px;color:#7d776b;margin-top:36px">Building Intelligence. Transforming Systems.</p>
</div></body></html>`;
}

export function codeMail(to: string, code: string, purpose: 'BOOTSTRAP' | 'JOIN' | 'RECOVERY'): Mail {
  const what = purpose === 'RECOVERY' ? 'réinitialiser votre mot de passe' : 'confirmer votre adresse et créer votre accès';
  const subject = `${code} — votre code AULIA`;
  const text = `Voici votre code pour ${what} sur l’espace AULIA.\nIl est valable 10 minutes et ne peut servir qu’une fois.\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez ce message : rien ne sera modifié.`;
  return { to, subject, text: `${code}\n\n${text}`, html: layout('Votre code de vérification', text, code) };
}

export function inviteMail(to: string, org: string, role: string, by: string, url: string): Mail {
  const subject = `Invitation — ${org} (AULIA)`;
  const text = `${by} vous invite à rejoindre ${org} dans l’espace AULIA, avec le rôle « ${role} ».\n\nPour activer votre accès, ouvrez ${url} et saisissez cette adresse e-mail : vous recevrez un code à 6 chiffres.\n\nL’invitation est valable 7 jours.`;
  return { to, subject, text };
}

export function contactAlertMail(to: string, org: string, from: { name: string; email: string; topic: string; message: string }, url: string): Mail {
  return {
    to,
    replyTo: from.email,
    subject: `Nouveau message — ${org} — ${from.topic}`,
    text: `${from.name} <${from.email}> a écrit depuis le site :\n\n${from.message}\n\nRépondre ou suivre : ${url}`,
  };
}
