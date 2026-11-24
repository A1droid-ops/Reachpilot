// ReachPilot — cloud-connected workspace
const SUPABASE_URL = "https://bsnvuxozcqorzxygkhre.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-G-1dLXM_9QF874txmoDog_r3z8BNpS";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);

let currentUser = null;
let authMode = "signin";
let leadsCache = [];
let campaigns = [];
let templates = [];

function message(el, text, error = false) {
  if (!el) return;
  el.textContent = text;
  el.style.color = error ? "#b54747" : "#16845b";
}
function showAuth() {
  $("auth-screen").classList.remove("hidden");
  $("app").classList.add("hidden");
}
function showApp(user) {
  if (!user) return;
  currentUser = user;
  $("auth-screen").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("sidebar-email").textContent = user.email || "";
  $("top-email").textContent = user.email || "";
  loadLeads();
  loadCloudItems();
}
function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === "signup";
  $("auth-heading").textContent = signup ? "Create your account" : "Welcome back";
  $("auth-subheading").textContent = signup
    ? "Create a ReachPilot account to keep your workspace in sync."
    : "Sign in to access your workspace from any device.";
  $("auth-submit").textContent = signup ? "Create account" : "Sign in";
  $("auth-switch-text").textContent = signup ? "Already have an account?" : "New to ReachPilot?";
  $("auth-switch").textContent = signup ? "Sign in" : "Create account";
  $("auth-password").autocomplete = signup ? "new-password" : "current-password";
  $("auth-message").textContent = "";
}
$("auth-switch").addEventListener("click", () => setAuthMode(authMode === "signin" ? "signup" : "signin"));
$("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("auth-email").value.trim();
  const password = $("auth-password").value;
  const btn = $("auth-submit");
  btn.disabled = true;
  btn.textContent = "Please wait…";
  try {
    if (authMode === "signup") {
      const { data, error } = await db.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session) showApp(data.user);
      else {
        message($("auth-message"), "Account created. Check your email for a confirmation link, then sign in.");
        setAuthMode("signin");
      }
    } else {
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showApp(data.user);
    }
  } catch (err) {
    message($("auth-message"), err.message || "Authentication failed.", true);
  } finally {
    btn.disabled = false;
    btn.textContent = authMode === "signup" ? "Create account" : "Sign in";
  }
});
$("sign-out").addEventListener("click", async () => {
  await db.auth.signOut();
  currentUser = null;
  leadsCache = []; campaigns = []; templates = [];
  showAuth();
});
db.auth.onAuthStateChange((_event, session) => {
  if (session?.user && !currentUser) showApp(session.user);
  else if (!session?.user) { currentUser = null; showAuth(); }
});

// Navigation
function go(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  const target = $("view-" + view);
  if (target) target.classList.remove("hidden");
  document.querySelectorAll(".nav-item[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  $("page-title").textContent = view[0].toUpperCase() + view.slice(1);
  if (view === "leads") renderLeads();
  if (view === "campaigns" || view === "templates") renderCloudItems();
}
document.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => go(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => go(b.dataset.go)));

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
function updateStats() {
  $("stat-leads").textContent = leadsCache.length;
  $("stat-campaigns").textContent = campaigns.length;
  $("stat-templates").textContent = templates.length;
}

// Leads
async function loadLeads() {
  if (!currentUser) return;
  $("leads-list").innerHTML = '<div class="empty-state">Loading your leads…</div>';
  const { data, error } = await db.from("leads").select("*")
    .eq("user_id", currentUser.id).order("created_at", { ascending: false });
  if (error) {
    $("leads-list").innerHTML = `<div class="empty-state">Could not load leads: ${escapeHtml(error.message)}</div>`;
    return;
  }
  leadsCache = data || [];
  renderLeads();
  updateStats();
}
function renderLeads() {
  const q = ($("lead-search")?.value || "").toLowerCase();
  const items = leadsCache.filter(l =>
    [l.name, l.email, l.company, l.status, l.notes].join(" ").toLowerCase().includes(q));
  $("leads-list").innerHTML = items.length ? items.map(l => `
    <article class="lead-card">
      <div><h3>${escapeHtml(l.name)}</h3>
        <p>${escapeHtml(l.email || "No email")}${l.company ? " · " + escapeHtml(l.company) : ""}</p>
        <div class="lead-meta"><span class="tag">${escapeHtml(l.status || "New")}</span>
        ${l.notes ? `<span class="tag">${escapeHtml(l.notes)}</span>` : ""}</div>
      </div><button class="delete-button" data-delete-lead="${l.id}">Delete</button>
    </article>`).join("") : '<div class="empty-state">No leads found. Add your first lead to get started.</div>';
  document.querySelectorAll("[data-delete-lead]").forEach(b =>
    b.addEventListener("click", () => deleteLead(b.dataset.deleteLead)));
}
$("lead-search").addEventListener("input", renderLeads);
$("refresh-leads").addEventListener("click", loadLeads);
$("add-lead-toggle").addEventListener("click", () => {
  $("lead-form").classList.toggle("hidden");
  $("lead-name").focus();
});
$("cancel-lead").addEventListener("click", () => {
  $("lead-form").reset(); $("lead-form").classList.add("hidden");
});
$("lead-form").addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentUser) return;
  const lead = {
    user_id: currentUser.id,
    name: $("lead-name").value.trim(),
    email: $("lead-email").value.trim() || null,
    company: $("lead-company").value.trim() || null,
    status: $("lead-status").value,
    notes: $("lead-notes").value.trim() || null
  };
  const btn = e.submitter;
  btn.disabled = true;
  try {
    const { error } = await db.from("leads").insert(lead);
    if (error) throw error;
    $("lead-form").reset(); $("lead-form").classList.add("hidden");
    await loadLeads(); message($("global-message"), "Lead saved to your cloud workspace.");
  } catch (err) { message($("global-message"), "Could not save lead: " + err.message, true); }
  finally { btn.disabled = false; }
});
async function deleteLead(id) {
  if (!confirm("Delete this lead?")) return;
  const { error } = await db.from("leads").delete().eq("id", id).eq("user_id", currentUser.id);
  if (error) { message($("global-message"), error.message, true); return; }
  await loadLeads();
}

// CSV import: supports headers name,email,company,status,notes
$("csv-file").addEventListener("change", async e => {
  const file = e.target.files?.[0];
  if (!file || !currentUser) return;
  try {
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error("The CSV needs a header row and at least one lead.");
    const headers = rows[0].map(h => h.trim().toLowerCase());
    const idx = key => headers.indexOf(key);
    if (idx("name") < 0) throw new Error('Add a "name" column to your CSV.');
    const records = rows.slice(1).filter(r => r.some(v => v.trim())).map(r => ({
      user_id: currentUser.id,
      name: r[idx("name")]?.trim() || "",
      email: idx("email") >= 0 ? (r[idx("email")]?.trim() || null) : null,
      company: idx("company") >= 0 ? (r[idx("company")]?.trim() || null) : null,
      status: idx("status") >= 0 ? (r[idx("status")]?.trim() || "New") : "New",
      notes: idx("notes") >= 0 ? (r[idx("notes")]?.trim() || null) : null
    })).filter(r => r.name);
    if (!records.length) throw new Error("No valid lead rows were found.");
    const { error } = await db.from("leads").insert(records);
    if (error) throw error;
    await loadLeads();
    message($("global-message"), `${records.length} leads imported successfully.`);
  } catch (err) { message($("global-message"), "CSV import failed: " + err.message, true); }
  finally { e.target.value = ""; }
});
function parseCSV(input) {
  const rows = []; let row = []; let cell = ""; let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i], next = input[i + 1];
    if (c === '"' && quoted && next === '"') { cell += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && next === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// Campaigns and templates
async function loadCloudItems() {
  if (!currentUser) return;
  $("campaign-list").innerHTML = '<div class="empty-state">Loading campaigns…</div>';
  $("template-list").innerHTML = '<div class="empty-state">Loading templates…</div>';
  const [cr, tr] = await Promise.all([
    db.from("campaigns").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false }),
    db.from("templates").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false })
  ]);
  campaigns = cr.error ? [] : (cr.data || []);
  templates = tr.error ? [] : (tr.data || []);
  renderCloudItems(); updateStats();
  if (cr.error) $("campaign-list").innerHTML = `<div class="empty-state">Campaign error: ${escapeHtml(cr.error.message)}</div>`;
  if (tr.error) $("template-list").innerHTML = `<div class="empty-state">Template error: ${escapeHtml(tr.error.message)}</div>`;
}
function renderCloudItems() {
  $("campaign-list").innerHTML = campaigns.length ? campaigns.map(c => `
    <article class="item-card"><div><h3>${escapeHtml(c.name)}</h3>
      <p><strong>${escapeHtml(c.subject || "No subject added")}</strong></p>
      <p>${escapeHtml(c.body || "")}</p>
      <span class="tag">${escapeHtml(c.status || "Draft")} · ${Number(c.daily_target || 100)} emails/day preferred target</span>
    </div><button class="delete-button" data-delete-campaign="${c.id}">Delete</button></article>
  `).join("") : '<div class="empty-state">No campaign drafts yet. Create your first campaign.</div>';
  $("template-list").innerHTML = templates.length ? templates.map(t => `
    <article class="item-card"><div><h3>${escapeHtml(t.name)}</h3>
      <p><strong>${escapeHtml(t.subject || "No subject")}</strong></p>
      <p>${escapeHtml(t.body || "")}</p><span class="tag">Saved to your cloud workspace</span>
    </div><button class="delete-button" data-delete-template="${t.id}">Delete</button></article>
  `).join("") : '<div class="empty-state">No templates yet. Save your first email template.</div>';
  document.querySelectorAll("[data-delete-campaign]").forEach(b =>
    b.addEventListener("click", () => deleteCloudItem("campaigns", b.dataset.deleteCampaign)));
  document.querySelectorAll("[data-delete-template]").forEach(b =>
    b.addEventListener("click", () => deleteCloudItem("templates", b.dataset.deleteTemplate)));
}
$("campaign-form").addEventListener("submit", createCampaign);
async function createCampaign(e) {
  e.preventDefault();
  if (!currentUser) return;
  const name = $("campaign-name").value.trim();
  const subject = $("campaign-subject").value.trim();
  const body = $("campaign-body").value.trim();
  const dailyTarget = Number($("campaign-target").value);
  if (!name || !body || !Number.isInteger(dailyTarget) || dailyTarget < 1) {
    message($("global-message"), "Complete the required fields and enter a valid daily target.", true); return;
  }
  const btn = e.submitter; btn.disabled = true; btn.textContent = "Saving…";
  try {
    const { error } = await db.from("campaigns").insert({
      user_id: currentUser.id, name, subject, body, status: "draft", daily_target: dailyTarget
    });
    if (error) throw error;
    $("campaign-form").reset(); $("campaign-target").value = 100;
    await loadCloudItems(); message($("global-message"), "Campaign saved successfully.");
  } catch (err) { message($("global-message"), "Could not save campaign: " + err.message, true); }
  finally { btn.disabled = false; btn.textContent = "Save campaign"; }
}
$("template-form").addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentUser) return;
  const name = $("template-name").value.trim();
  const subject = $("template-subject").value.trim();
  const body = $("template-body").value.trim();
  if (!name || !body) { message($("global-message"), "Enter a template name and message.", true); return; }
  const btn = e.submitter; btn.disabled = true; btn.textContent = "Saving…";
  try {
    const { error } = await db.from("templates").insert({ user_id: currentUser.id, name, subject, body });
    if (error) throw error;
    $("template-form").reset(); await loadCloudItems();
    message($("global-message"), "Template saved successfully.");
  } catch (err) { message($("global-message"), "Could not save template: " + err.message, true); }
  finally { btn.disabled = false; btn.textContent = "Save template"; }
});
async function deleteCloudItem(table, id) {
  if (!confirm("Delete this item?")) return;
  const { error } = await db.from(table).delete().eq("id", id).eq("user_id", currentUser.id);
  if (error) { message($("global-message"), error.message, true); return; }
  await loadCloudItems(); message($("global-message"), "Item deleted.");
}

// Gmail connection is intentionally a placeholder until secure Google OAuth is configured.
$("gmail-connect").addEventListener("click", () => {
  message($("gmail-message"), "Gmail connection is not configured yet. The next stage requires Google OAuth consent and secure server-side token storage.", true);
});

// Restore existing session after handlers are registered.
(async () => {
  const { data, error } = await db.auth.getSession();
  if (error) message($("auth-message"), error.message, true);
  if (data?.session?.user) showApp(data.session.user);
  else showAuth();
})();
