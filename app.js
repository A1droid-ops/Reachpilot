
// ReachPilot - Supabase configuration
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
  el.textContent = text;
  el.style.color = error ? "#b54747" : "#16845b";
}

function showAuth() {
  $("auth-screen").classList.remove("hidden");
  $("app").classList.add("hidden");
}

function showApp(user) {
  currentUser = user;
  $("auth-screen").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("sidebar-email").textContent = user.email;
  $("top-email").textContent = user.email;
  loadLeads();
  loadCloudItems();
}

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === "signup";
  $("auth-heading").textContent = signup ? "Create your account" : "Welcome back";
  $("auth-subheading").textContent = signup
    ? "Create a ReachPilot account to keep your leads in sync."
    : "Sign in to access your leads from any device.";
  $("auth-submit").textContent = signup ? "Create account" : "Sign in";
  $("auth-switch-text").textContent = signup
    ? "Already have an account?"
    : "New to ReachPilot?";
  $("auth-switch").textContent = signup ? "Sign in" : "Create account";
  $("auth-password").autocomplete = signup ? "new-password" : "current-password";
  $("auth-message").textContent = "";
}

$("auth-switch").addEventListener("click", () => {
  setAuthMode(authMode === "signin" ? "signup" : "signin");
});

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

      if (data.session) {
        showApp(data.user);
      } else {
        message(
          $("auth-message"),
          "Account created. Check your email for a confirmation link, then sign in."
        );
        setAuthMode("signin");
      }
    } else {
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showApp(data.user);
    }
  } catch (err) {
    message($("auth-message"), err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = authMode === "signup" ? "Create account" : "Sign in";
  }
});

$("sign-out").addEventListener("click", async () => {
  await db.auth.signOut();
  currentUser = null;
  showAuth();
});

db.auth.onAuthStateChange((_event, session) => {
  if (session?.user && !currentUser) {
    showApp(session.user);
  } else if (!session?.user) {
    currentUser = null;
    showAuth();
  }
});

// Navigation
function go(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  $("view-" + view).classList.remove("hidden");

  document.querySelectorAll(".nav-item[data-view]").forEach(b => {
    b.classList.toggle("active", b.dataset.view === view);
  });

  $("page-title").textContent = view[0].toUpperCase() + view.slice(1);

  if (view === "leads") renderLeads();
  if (view === "campaigns" || view === "templates") renderCloudItems();
}

document.querySelectorAll("[data-view]").forEach(b => {
  b.addEventListener("click", () => go(b.dataset.view));
});

document.querySelectorAll("[data-go]").forEach(b => {
  b.addEventListener("click", () => go(b.dataset.go));
});

// Leads
async function loadLeads() {
  if (!currentUser) return;

  $("leads-list").innerHTML = '<div class="empty-state">Loading your leads…</div>';

  const { data, error } = await db
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    $("leads-list").innerHTML =
      '<div class="empty-state">Could not load leads: ' +
      escapeHtml(error.message) + "</div>";
    return;
  }

  leadsCache = data || [];
  renderLeads();
  updateStats();
}

function renderLeads() {
  const q = ($("lead-search").value || "").toLowerCase();

  const items = leadsCache.filter(l =>
    [l.name, l.email, l.company, l.status].join(" ").toLowerCase().includes(q)
  );

  $("leads-list").innerHTML = items.length
    ? items.map(l => `
      <article class="lead-card">
        <div>
          <h3>${escapeHtml(l.name)}</h3>
          <p>${escapeHtml(l.email || "No email")}${l.company ? " · " + escapeHtml(l.company) : ""}</p>
          <div class="lead-meta">
            <span class="tag">${escapeHtml(l.status || "New")}</span>
            ${l.notes ? `<span class="tag">${escapeHtml(l.notes)}</span>` : ""}
          </div>
        </div>
        <button class="delete-button" data-delete="${l.id}">Delete</button>
      </article>
    `).join("")
    : '<div class="empty-state">No leads found. Add your first lead to get started.</div>';

  document.querySelectorAll("[data-delete]").forEach(b => {
    b.addEventListener("click", () => deleteLead(b.dataset.delete));
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

$("lead-search").addEventListener("input", renderLeads);
$("refresh-leads").addEventListener("click", loadLeads);

$("add-lead-toggle").addEventListener("click", () => {
  $("lead-form").classList.toggle("hidden");
  $("lead-name").focus();
});

$("cancel-lead").addEventListener("click", () => {
  $("lead-form").reset();
  $("lead-form").classList.add("hidden");
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

    $("lead-form").reset();
    $("lead-form").classList.add("hidden");
    await loadLeads();
    message($("global-message"), "Lead saved to your cloud workspace.");
  } catch (err) {
    message($("global-message"), "Could not save lead: " + err.message, true);
  } finally {
    btn.disabled = false;
  }
});

async function deleteLead(id) {
  if (!confirm("Delete this lead?")) return;

  const { error } = await db.from("leads").delete().eq("id", id);

  if (error) {
    message($("global-message"), error.message, true);
    return;
  }

  await loadLeads();
}

// Cloud campaigns and templates
async function loadCloudItems() {
  if (!currentUser) return;

  $("campaign-list").innerHTML =
    '<div class="empty-state">Loading campaigns…</div>';
  $("template-list").innerHTML =
    '<div class="empty-state">Loading templates…</div>';

  const [campaignResult, templateResult] = await Promise.all([
    db.from("campaigns").select("*").order("created_at", { ascending: false }),
    db.from("templates").select("*").order("created_at", { ascending: false })
  ]);

  if (campaignResult.error) {
    $("campaign-list").innerHTML =
      '<div class="empty-state">Campaign error: ' +
      escapeHtml(campaignResult.error.message) + "</div>";
  } else {
    campaigns = campaignResult.data || [];
  }

  if (templateResult.error) {
    $("template-list").innerHTML =
      '<div class="empty-state">Template error: ' +
      escapeHtml(templateResult.error.message) + "</div>";
  } else {
    templates = templateResult.data || [];
  }

  renderCloudItems();
  updateStats();
}

function renderCloudItems() {
  $("campaign-list").innerHTML = campaigns.length
    ? campaigns.map(c => `
      <article class="item-card">
        <div>
          <h3>${escapeHtml(c.name)}</h3>
          <p>${escapeHtml(c.subject || "No subject added")}</p>
          <p>${escapeHtml(c.body || "")}</p>
          <span class="tag">Draft · ${Number(c.daily_target || 100)} emails/day target</span>
        </div>
        <button class="delete-button" data-campaign="${c.id}">Delete</button>
      </article>
    `).join("")
    : '<div class="empty-state">No campaign drafts yet. Create your first campaign.</div>';

  $("template-list").innerHTML = templates.length
    ? templates.map(t => `
      <article class="item-card">
        <div>
          <h3>${escapeHtml(t.name)}</h3>
          <p><strong>${escapeHtml(t.subject || "No subject")}</strong></p>
          <p>${escapeHtml(t.body)}</p>
          <span class="tag">Saved to your cloud workspace</span>
        </div>
        <button class="delete-button" data-template="${t.id}">Delete</button>
      </article>
    `).join("")
    : '<div class="empty-state">No templates yet. Save your first email template.</div>';

  document.querySelectorAll("[data-campaign]").forEach(b => {
    b.addEventListener("click", () => deleteCloudItem("campaigns", b.dataset.campaign));
  });

  document.querySelectorAll("[data-template]").forEach(b => {
    b.addEventListener("click", () => deleteCloudItem("templates", b.dataset.template));
  });
}

async function createCampaign() {
  if (!currentUser) return;

  const name = prompt("Campaign name:");
  if (!name?.trim()) return;

  const subject = prompt("Email subject (optional):") || "";
  const body = prompt("Write the campaign email/message:") || "";
  const targetInput = prompt("Your preferred daily sending target:", "100");
  if (targetInput === null) return;

  const dailyTarget = Math.max(1, Math.floor(Number(targetInput) || 100));

  const { error } = await db.from("campaigns").insert({
    user_id: currentUser.id,
    name: name.trim(),
    subject,
    body,
    status: "draft",
    daily_target: dailyTarget
  });

  if (error) {
    message($("global-message"), "Could not save campaign: " + error.message, true);
    return;
  }

  await loadCloudItems();
  message($("global-message"), "Campaign saved to your cloud workspace.");
}

async function createTemplate() {
  if (!currentUser) return;

  const name = prompt("Template name:");
  if (!name?.trim()) return;

  const subject = prompt("Email subject (optional):") || "";
  const body = prompt("Paste your email template:");
  if (body === null || !body.trim()) return;

  const { error } = await db.from("templates").insert({
    user_id: currentUser.id,
    name: name.trim(),
    subject,
    body: body.trim()
  });

  if (error) {
    message($("global-message"), "Could not save template: " + error.message, true);
    return;
  }

  await loadCloudItems();
  message($("global-message"), "Template saved to your cloud workspace.");
}

async function deleteCloudItem(table, id) {
  if (!confirm("Delete this item?")) return;

  const { error } = await db.from(table).delete().eq("id", id);

  if (error) {
    message($("global-message"), "Could not delete item: " + error.message, true);
    return;
  }

  await loadCloudItems();
  message($("global-message"), "Item deleted.");
}

$("new-campaign").addEventListener("click", createCampaign);
$("new-template").addEventListener("click", createTemplate);

function updateStats() {
  $("stat-leads").textContent = leadsCache.length;
  $("stat-campaigns").textContent = campaigns.length;
  $("stat-templates").textContent = templates.length;
}

// Restore existing login session
(async () => {
  const { data: { session } } = await db.auth.getSession();

  if (session?.user) {
    showApp(session.user);
  } else {
    showAuth();
  }
})();
