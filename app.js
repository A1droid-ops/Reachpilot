const STORAGE = {
  leads: "reachpilot_leads_v1",
  campaigns: "reachpilot_campaigns_v1",
  templates: "reachpilot_templates_v1"
};
const read = key => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } };
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
let leads = read(STORAGE.leads), campaigns = read(STORAGE.campaigns), templates = read(STORAGE.templates);
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let toastTimer;
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600);}
function navigate(page){
  $$(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${page}`));
  $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  $("#breadcrumb").textContent=({overview:"Overview",leads:"Leads",campaigns:"Campaigns",templates:"Templates",accounts:"Gmail accounts"})[page]||"Overview";
  $("#sidebar").classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
}
$$("[data-page]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
$("#mobileMenu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$$("[data-close]").forEach(b=>b.addEventListener("click",()=>$("#"+b.dataset.close).close()));
$(".notice-close")?.addEventListener("click",e=>e.currentTarget.closest(".notice").remove());

function renderStats(){
  $("#statLeads").textContent=leads.length;
  $("#statCampaigns").textContent=campaigns.length;
  $("#statAccounts").textContent="0";
  $("#leadCount").textContent=`${leads.length} lead${leads.length===1?"":"s"}`;
  $("#campaignCount").textContent=`${campaigns.length} campaign${campaigns.length===1?"":"s"}`;
}
function renderLeads(){
  const query=$("#leadSearch").value.trim().toLowerCase();
  const filtered=leads.filter(l=>[l.name,l.email,l.company].join(" ").toLowerCase().includes(query));
  $("#leadRows").innerHTML=filtered.map(l=>`<tr><td>${escapeHTML(l.name)}</td><td>${escapeHTML(l.company||"—")}</td><td>${escapeHTML(l.email)}</td><td><span class="status-pill">${escapeHTML(l.status||"New")}</span></td><td><button class="delete-button" data-delete-lead="${l.id}" title="Delete lead">×</button></td></tr>`).join("");
  $("#leadsEmpty").hidden=filtered.length>0;
  $("#leadRows").closest("table").hidden=filtered.length===0;
  $$("[data-delete-lead]").forEach(b=>b.addEventListener("click",()=>{leads=leads.filter(x=>x.id!==b.dataset.deleteLead);save(STORAGE.leads,leads);refresh();toast("Lead deleted.");}));
}
function renderCampaigns(){
  $("#campaignList").innerHTML=campaigns.map(c=>`<div class="campaign-row"><div class="campaign-symbol">✉</div><div class="campaign-info"><strong>${escapeHTML(c.name)}</strong><small>${escapeHTML(c.subject)} · Created ${new Date(c.created).toLocaleDateString()}</small></div><span class="status-pill">Draft</span><button class="delete-button" data-delete-campaign="${c.id}" title="Delete campaign">×</button></div>`).join("");
  $("#campaignsEmpty").hidden=campaigns.length>0;
  $("#campaignList").hidden=campaigns.length===0;
  $$("[data-delete-campaign]").forEach(b=>b.addEventListener("click",()=>{campaigns=campaigns.filter(x=>x.id!==b.dataset.deleteCampaign);save(STORAGE.campaigns,campaigns);refresh();toast("Campaign deleted.");}));
  const recent=$("#recentCampaigns");
  if(campaigns.length){
    recent.className="campaign-list";
    recent.innerHTML=campaigns.slice(-3).reverse().map(c=>`<div class="campaign-row"><div class="campaign-symbol">✉</div><div class="campaign-info"><strong>${escapeHTML(c.name)}</strong><small>${new Date(c.created).toLocaleDateString()} · Draft</small></div><span class="status-pill">Draft</span></div>`).join("");
  } else {
    recent.className="empty-state";
    recent.innerHTML='<div class="empty-illustration">✉</div><strong>No campaigns yet</strong><p>Create a campaign draft to start organizing your outreach.</p><button class="secondary-button" data-page="campaigns">Create your first campaign</button>';
    recent.querySelector("[data-page]").addEventListener("click",()=>navigate("campaigns"));
  }
}
function renderTemplates(){
  $("#templateGrid").innerHTML=templates.map(t=>`<article class="template-card"><h3>${escapeHTML(t.name)}</h3><div class="subject">${escapeHTML(t.subject)}</div><p>${escapeHTML(t.message)}</p><button class="text-button" data-delete-template="${t.id}">Delete template</button></article>`).join("");
  $("#templatesEmpty").hidden=templates.length>0;
  $("#templateGrid").hidden=templates.length===0;
  $$("[data-delete-template]").forEach(b=>b.addEventListener("click",()=>{templates=templates.filter(x=>x.id!==b.dataset.deleteTemplate);save(STORAGE.templates,templates);refresh();toast("Template deleted.");}));
}
function refresh(){renderStats();renderLeads();renderCampaigns();renderTemplates();}
function openDialog(id){$("#"+id).showModal();}
$("#addLeadBtn").addEventListener("click",()=>openDialog("leadDialog"));
$("#newCampaignBtn").addEventListener("click",()=>openDialog("campaignDialog"));
$("#emptyNewCampaign").addEventListener("click",()=>openDialog("campaignDialog"));
$("#newTemplateBtn").addEventListener("click",()=>openDialog("templateDialog"));
$("#leadSearch").addEventListener("input",renderLeads);

$("#leadForm").addEventListener("submit",e=>{
  e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));
  if(leads.some(l=>l.email.toLowerCase()===data.email.toLowerCase())){toast("That email is already in your lead list.");return;}
  leads.push({...data,id:crypto.randomUUID(),status:"New",created:new Date().toISOString()});save(STORAGE.leads,leads);e.currentTarget.reset();$("#leadDialog").close();refresh();toast("Lead saved.");
});
$("#campaignForm").addEventListener("submit",e=>{
  e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));
  campaigns.push({...data,id:crypto.randomUUID(),created:new Date().toISOString()});save(STORAGE.campaigns,campaigns);e.currentTarget.reset();$("#campaignDialog").close();refresh();toast("Campaign draft saved. No email was sent.");
});
$("#templateForm").addEventListener("submit",e=>{
  e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));
  templates.push({...data,id:crypto.randomUUID()});save(STORAGE.templates,templates);e.currentTarget.reset();$("#templateDialog").close();refresh();toast("Template saved.");
});

function parseCSV(text){
  const rows=[];let row=[],cell="",quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i],next=text[i+1];
    if(ch==='"'&&quoted&&next==='"'){cell+='"';i++;}
    else if(ch==='"')quoted=!quoted;
    else if(ch===','&&!quoted){row.push(cell);cell="";}
    else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&next==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell="";}
    else cell+=ch;
  }
  row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
  if(rows.length<2)return [];
  const headers=rows.shift().map(h=>h.trim().toLowerCase().replace(/\s+/g,"_"));
  return rows.map(cols=>{const o={};headers.forEach((h,i)=>o[h]=(cols[i]||"").trim());return o;});
}
$("#csvFile").addEventListener("change",async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    const rows=parseCSV(await file.text());let added=0,skipped=0;
    rows.forEach(r=>{
      const email=r.email||r.email_address||"";
      const name=r.name||[r.first_name,r.last_name].filter(Boolean).join(" ")||r.full_name||"";
      if(!email||!email.includes("@")||leads.some(l=>l.email.toLowerCase()===email.toLowerCase())){skipped++;return;}
      leads.push({id:crypto.randomUUID(),name,email,company:r.company||r.organization||"",website:r.website||"",status:r.status||"New",created:new Date().toISOString()});added++;
    });
    save(STORAGE.leads,leads);refresh();toast(`Imported ${added} lead(s). ${skipped} skipped.`);
  }catch(err){toast("Could not read that CSV file.");}
  e.target.value="";
});
refresh();
