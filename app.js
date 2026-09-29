// 1. Line ~434 par slice hata kar pura data load karein:
// const fresh = Array.isArray(data.batches) ? data.batches : [];

// 2. openBatch aur in-app viewer logic:
function openBatch(batch) {
  const id = batch._id || batch.batch_id;
  if (!id) return showToast("This course is not available right now.");
  addRecentlyViewed(batch);
  renderRecentlyWatched();
  openCourseView(batch);
}

let cvBatch = null, cvStage = "subjects", cvSubject = null, cvChapter = null;

function openCourseView(batch) {
  cvBatch = batch; cvStage = "subjects"; cvSubject = null; cvChapter = null;
  let overlay = document.getElementById("courseViewOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "courseViewOverlay";
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:var(--bg,#0b0d12);overflow-y:auto;display:none;";
    document.body.appendChild(overlay);
  }
  overlay.style.display = "block";
  document.body.style.overflow = "hidden";
  renderCourseView();
}

function closeCourseView() {
  const overlay = document.getElementById("courseViewOverlay");
  if (overlay) overlay.style.display = "none";
  document.body.style.overflow = "";
  cvBatch = null;
}

function cvBack() {
  if (cvStage === "contents") { cvStage = "chapters"; cvChapter = null; }
  else if (cvStage === "chapters") { cvStage = "subjects"; cvSubject = null; }
  else { closeCourseView(); return; }
  renderCourseView();
}

function renderCourseView() {
  const overlay = document.getElementById("courseViewOverlay");
  if (!overlay || !cvBatch) return;
  const subjects = cvBatch.subjects || [];
  let html = `<div style="max-width:820px;margin:0 auto;padding:18px 16px 60px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
      <button id="cvBackBtn" type="button" style="background:none;border:1px solid var(--line-strong,#333);color:var(--text,#fff);border-radius:10px;padding:8px 14px;cursor:pointer;">← Back</button>
      <h2 style="font:600 20px sans-serif;color:var(--text,#fff);margin:0;">${escapeHtml(cvBatch.name || "Course")}</h2>
    </div>`;

  if (cvStage === "subjects") {
    html += `<div style="display:grid;gap:10px;">` + subjects.map((s, i) =>
      `<button class="cv-row" type="button" data-cv-subject="${i}" style="text-align:left;background:var(--panel,#12141a);border:1px solid var(--line,#262a33);color:var(--text,#fff);border-radius:14px;padding:14px 16px;cursor:pointer;font-size:14px;">${escapeHtml(s.subject_name || "Subject")} <span style="opacity:.55;font-size:12px;">• ${(s.chapters || []).length} chapters</span></button>`
    ).join("") + `</div>`;
  } else if (cvStage === "chapters") {
    const chapters = (cvSubject && cvSubject.chapters) || [];
    html += `<h3 style="color:var(--text,#fff);font:600 16px sans-serif;margin:6px 0 14px;">${escapeHtml(cvSubject?.subject_name || "")}</h3><div style="display:grid;gap:10px;">` +
      chapters.map((c, i) => `<button class="cv-row" type="button" data-cv-chapter="${i}" style="text-align:left;background:var(--panel,#12141a);border:1px solid var(--line,#262a33);color:var(--text,#fff);border-radius:14px;padding:14px 16px;cursor:pointer;font-size:14px;">${escapeHtml(c.title || "Chapter")}</button>`).join("") + `</div>`;
  } else if (cvStage === "contents") {
    const walk = (node, out) => { (node.contents || []).forEach(c => c.type === "folder" ? walk(c, out) : out.push(c)); };
    const items = []; walk(cvChapter || {}, items);
    html += `<h3 style="color:var(--text,#fff);font:600 16px sans-serif;margin:6px 0 14px;">${escapeHtml(cvChapter?.title || "")}</h3><div style="display:grid;gap:8px;">` +
      items.map((it, i) => {
        const url = it.stream_url || (it.download_links && it.download_links[0]?.url) || "";
        const isVideo = /\.m3u8/i.test(url);
        return `<button class="cv-row" type="button" data-cv-item="${i}" style="text-align:left;background:var(--panel,#12141a);border:1px solid var(--line,#262a33);color:var(--text,#fff);border-radius:12px;padding:12px 14px;cursor:pointer;font-size:13px;">${isVideo ? "▶ Lecture" : "📄 PDF Note"}: ${escapeHtml(it.title || "Item")}</button>`;
      }).join("") + `</div>`;
  }
  html += `</div>`;
  overlay.innerHTML = html;

  overlay.querySelector("#cvBackBtn")?.addEventListener("click", cvBack);
  overlay.querySelectorAll("[data-cv-subject]").forEach(btn => btn.addEventListener("click", () => {
    cvSubject = subjects[Number(btn.dataset.cvSubject)]; cvStage = "chapters"; renderCourseView();
  }));
  overlay.querySelectorAll("[data-cv-chapter]").forEach(btn => btn.addEventListener("click", () => {
    cvChapter = ((cvSubject && cvSubject.chapters) || [])[Number(btn.dataset.cvChapter)]; cvStage = "contents"; renderCourseView();
  }));
  overlay.querySelectorAll("[data-cv-item]").forEach(btn => btn.addEventListener("click", () => {
    const items = [];
    const walk = (node) => (node.contents || []).forEach(c => c.type === "folder" ? walk(c) : items.push(c));
    walk(cvChapter || {});
    const item = items[Number(btn.dataset.cvItem)];
    const url = item?.stream_url || item?.download_links?.[0]?.url;
    if (url) window.open(url, "_blank", "noopener");
  }));
}
