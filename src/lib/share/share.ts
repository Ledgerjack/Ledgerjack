/**
 * share — client-side sharing via the user's own apps. These open WhatsApp /
 * Telegram / the native share sheet with a pre-filled message. No backend, no
 * bot tokens, and LedgerJack never routes the data — it goes straight from the
 * user's device through their own app. (A conversational bot would need a backend
 * and would route data through Meta/Telegram, so that stays out.)
 */

export function shareViaWhatsApp(text: string, phone?: string): void {
  const num = phone ? phone.replace(/[^0-9]/g, "") : "";
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}

export function shareViaTelegram(text: string, url = ""): void {
  window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank", "noopener");
}

export function shareViaEmail(subject: string, body: string, to = ""): void {
  window.open(`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank", "noopener");
}

/** Returns true if the native share sheet is available and was invoked. */
export async function nativeShare(title: string, text: string): Promise<boolean> {
  const nav = navigator as any;
  if (typeof nav.share === "function") {
    try { await nav.share({ title, text }); return true; } catch { return false; }
  }
  return false;
}

export function nativeShareAvailable(): boolean {
  return typeof (navigator as any).share === "function";
}
