/* ============================================================
   auth.js - Supabase authentication + attempt history.
   Every method is a safe no-op when Supabase is not configured
   (or the CDN failed to load), so the site keeps working offline.
   ============================================================ */

const Auth = (() => {
  const cfg = window.SUPABASE_CONFIG || {};
  const enabled = Boolean(cfg.url && cfg.anonKey && window.supabase);
  const client = enabled ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;

  async function getUser() {
    if (!enabled) return null;
    const { data } = await client.auth.getSession();
    return data.session ? data.session.user : null;
  }

  /* Redirects to login.html when signed out. Resolves to the user (or null when auth is disabled). */
  async function requireAuth() {
    if (!enabled) return null;
    const user = await getUser();
    if (!user) {
      const next = location.pathname.split("/").pop() + location.search;
      location.replace(`login.html?next=${encodeURIComponent(next)}`);
      return new Promise(() => {});
    }
    return user;
  }

  async function logout() {
    if (enabled) await client.auth.signOut();
    location.replace("login.html");
  }

  /* Adds History link, user email and Logout button to the navbar. */
  function renderNav(user) {
    const actions = document.querySelector(".nav-actions");
    if (!enabled || !user || !actions) return;

    const wrap = document.createElement("div");
    wrap.className = "nav-user";
    wrap.innerHTML = `
      <a href="history.html" class="btn btn-ghost" title="Score history">📊 History</a>
      <span class="nav-email"></span>
      <button class="btn btn-outline" type="button">Logout</button>
    `;
    const email = wrap.querySelector(".nav-email");
    email.textContent = email.title = user.email;
    wrap.querySelector("button").addEventListener("click", logout);
    actions.prepend(wrap);
  }

  async function saveAttempt(attempt) {
    if (!enabled) return;
    const { error } = await client.from("attempts").insert(attempt);
    if (error) console.warn("Could not save attempt:", error.message);
  }

  async function getAttempts() {
    if (!enabled) return [];
    const { data, error } = await client
      .from("attempts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }

  return { enabled, client, getUser, requireAuth, logout, renderNav, saveAttempt, getAttempts };
})();
