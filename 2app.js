// 2app.js - Diary of the Witch - complete client-side logic
// Admin credentials: username = "admin", password = "connor"
// Posts saved in localStorage key 'diary_posts_v2'

(function(){
  const LS_KEY = 'diary_posts_v2';
  const LS_ADMIN = 'diary_admin_session';
  const EDIT_KEY = 'diary_edit_id';
  const ADMIN_USER = 'admin';
  const ADMIN_PASS = 'connor';

  /* ---------- storage helpers ---------- */
  function loadPosts(){
    try{ return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch(e){ return []; }
  }
  function savePosts(posts){
    localStorage.setItem(LS_KEY, JSON.stringify(posts || []));
  }

  function isAdmin(){
    return localStorage.getItem(LS_ADMIN) === 'true';
  }

  /* ---------- HOME rendering ---------- */
  function renderHome(){
    const container = document.getElementById('postsList');
    if(!container) return;
    const posts = loadPosts();
    container.innerHTML = '';
    if(posts.length === 0){
      container.innerHTML = '<p style="text-align:center;color:#666">No entries yet.</p>';
      return;
    }
    // newest first
    const sorted = posts.slice().sort((a,b)=>b.id - a.id);
    sorted.forEach(post=>{
      const a = document.createElement('a');
      a.className = 'card';
      a.href = `2post.html?id=${post.id}`;
      a.innerHTML = `${post.image ? `<img src="${post.image}" alt="">` : ''}<div class="card-title">${escapeHtml(post.title)}</div><div class="card-date">${escapeHtml(post.date)}</div><div class="card-summary">${escapeHtml((post.text||'').slice(0,220))}${(post.text||'').length>220?'...':''}</div>`;
      container.appendChild(a);
    });
  }

  /* ---------- VIEW POST ---------- */
  function initViewPost(){
    const container = document.getElementById('postView'); if(!container) return;
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id'), 10);
    const posts = loadPosts();
    const post = posts.find(p => p.id === id);
    if(!post){
      container.innerHTML = '<p>Post not found.</p>';
      return;
    }
    let html = `<h2>${escapeHtml(post.title)}</h2><div class="card-date">${escapeHtml(post.date)}</div>`;
    if(post.image) html += `<img src="${post.image}" alt="image">`;
    html += `<div style="margin-top:14px">${escapeHtml(post.text).replace(/\n/g,'<br>')}</div>`;
    if(isAdmin()){
      html += `<div style="margin-top:18px"><button id="editBtn" class="btn">Edit</button> <button id="delBtn" class="btn danger">Delete</button></div>`;
    }
    container.innerHTML = html;
    if(isAdmin()){
      document.getElementById('editBtn').addEventListener('click', ()=>{
        localStorage.setItem(EDIT_KEY, String(post.id));
        window.location.href = '2admin.html';
      });
      document.getElementById('delBtn').addEventListener('click', ()=>{
        if(!confirm('Delete this entry?')) return;
        const remaining = loadPosts().filter(p => p.id !== id);
        savePosts(remaining);
        window.location.href = '2index.html';
      });
    }
  }

  /* ---------- ADMIN ---------- */
  function initAdmin(){
    const loginSection = document.getElementById('loginSection');
    const manageSection = document.getElementById('manageSection');
    const btnLogin = document.getElementById('btnLogin');
    const inUser = document.getElementById('loginUser');
    const inPass = document.getElementById('loginPass');

    const postTitle = document.getElementById('postTitle');
    const postText = document.getElementById('postText');
    const postImage = document.getElementById('postImage');
    const previewWrapper = document.getElementById('imagePreviewWrapper');
    const previewImg = document.getElementById('imagePreview');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const btnSave = document.getElementById('btnSave');
    const btnCancel = document.getElementById('btnCancel');
    const adminPosts = document.getElementById('adminPosts');
    const manageTitle = document.getElementById('manageTitle');

    if(!postTitle || !postText || !postImage || !previewWrapper || !previewImg || !btnSave || !btnCancel || !adminPosts || !manageTitle) {
      // not admin page
      return;
    }

    // If already admin, show manage
    if(isAdmin()){
      if(loginSection) loginSection.classList.add('hidden');
      if(manageSection) manageSection.classList.remove('hidden');
      populateAdminList();
      checkEditQueue();
    }

    // LOGIN
    if(btnLogin){
      btnLogin.addEventListener('click', ()=>{
        const u = (inUser.value || '').trim();
        const p = (inPass.value || '').trim();
        if(u === ADMIN_USER && p === ADMIN_PASS){
          localStorage.setItem(LS_ADMIN, 'true');
          if(loginSection) loginSection.classList.add('hidden');
          if(manageSection) manageSection.classList.remove('hidden');
          populateAdminList();
          checkEditQueue();
          alert('Admin unlocked for this browser.');
        } else {
          alert('Invalid credentials.');
        }
      });
    }

    // image input -> preview
    postImage.addEventListener('change', async (ev)=>{
      const f = ev.target.files[0];
      if(!f){ hidePreview(); return; }
      try{
        const data = await readFileAsDataURL(f);
        showPreview(data);
      } catch(e){
        console.warn(e);
        alert('Failed to load image.');
        hidePreview();
      }
    });

    removeImageBtn.addEventListener('click', ()=>{
      postImage.value = '';
      hidePreview();
    });

    // Save
    btnSave.addEventListener('click', async ()=>{
      const title = (postTitle.value || '').trim();
      const text = (postText.value || '').trim();
      if(!title || !text){ alert('Title and entry required.'); return; }

      const posts = loadPosts();
      const editingId = localStorage.getItem(EDIT_KEY);
      let imageData = previewImg.src || '';

      // If no preview but a file is selected (edge case), read it
      if(!imageData && postImage.files && postImage.files[0]){
        try{ imageData = await readFileAsDataURL(postImage.files[0]); } catch(e){ console.warn(e); }
      }

      if(editingId){
        // update existing
        const idNum = parseInt(editingId,10);
        const idx = posts.findIndex(p => p.id === idNum);
        if(idx >= 0){
          posts[idx] = { id: idNum, title, text, image: imageData || '', date: (new Date()).toLocaleString() };
          savePosts(posts);
          localStorage.removeItem(EDIT_KEY);
          alert('Entry updated.');
        } else {
          alert('Edit failed — original not found.');
        }
      } else {
        // create new
        const newId = Date.now();
        posts.push({ id: newId, title, text, image: imageData || '', date: (new Date()).toLocaleString() });
        savePosts(posts);
        alert('Entry saved.');
      }

      // reset form
      postTitle.value = '';
      postText.value = '';
      postImage.value = '';
      hidePreview();
      manageTitle.textContent = 'New Entry';
      populateAdminList();
      renderHome();
      window.scrollTo({top:0,behavior:'smooth'});
    });

    // Cancel
    btnCancel.addEventListener('click', ()=>{
      postTitle.value = '';
      postText.value = '';
      postImage.value = '';
      hidePreview();
      localStorage.removeItem(EDIT_KEY);
      manageTitle.textContent = 'New Entry';
      window.scrollTo({top:0,behavior:'smooth'});
    });

    // Fill admin listing
    function populateAdminList(){
      adminPosts.innerHTML = '';
      const posts = loadPosts();
      if(posts.length === 0){ adminPosts.innerHTML = '<p style="color:#666">No entries yet.</p>'; return; }
      // oldest to newest in admin listing
      posts.forEach(p=>{
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `${p.image? `<img src="${p.image}" alt="">` : ''}<div class="card-title">${escapeHtml(p.title)}</div><div class="card-date">${escapeHtml(p.date)}</div><div style="margin-top:8px"><button class="btn small secondary" data-edit="${p.id}">Edit</button> <button class="btn small danger" data-del="${p.id}">Delete</button></div>`;
        adminPosts.appendChild(div);
      });

      // attach edit/delete
      adminPosts.querySelectorAll('[data-edit]').forEach(btn=>{
        btn.addEventListener('click', (ev)=>{
          const id = parseInt(ev.currentTarget.getAttribute('data-edit'),10);
          localStorage.setItem(EDIT_KEY, String(id));
          checkEditQueue();
          window.scrollTo({top:0,behavior:'smooth'});
        });
      });

      adminPosts.querySelectorAll('[data-del]').forEach(btn=>{
        btn.addEventListener('click', (ev)=>{
          const id = parseInt(ev.currentTarget.getAttribute('data-del'),10);
          if(!confirm('Delete this entry?')) return;
          const remaining = loadPosts().filter(p => p.id !== id);
          savePosts(remaining);
          populateAdminList();
          renderHome();
        });
      });
    }

    // If an edit id was queued (either from post view or admin list), prefill the form
    function checkEditQueue(){
      const q = localStorage.getItem(EDIT_KEY);
      if(!q) return;
      const idNum = parseInt(q,10);
      const posts = loadPosts();
      const rec = posts.find(p => p.id === idNum);
      if(!rec) { localStorage.removeItem(EDIT_KEY); return; }
      document.getElementById('postTitle').value = rec.title || '';
      document.getElementById('postText').value = rec.text || '';
      if(rec.image){
        showPreview(rec.image);
      } else {
        hidePreview();
      }
      document.getElementById('manageTitle').textContent = 'Edit Entry';
    }

    // preview helpers
    function showPreview(dataUrl){
      previewImg.src = dataUrl;
      previewWrapper.classList.remove('hidden');
      previewWrapper.setAttribute('aria-hidden', 'false');
    }
    function hidePreview(){
      previewImg.src = '';
      previewWrapper.classList.add('hidden');
      previewWrapper.setAttribute('aria-hidden', 'true');
    }

    // read file helper
    function readFileAsDataURL(file){
      return new Promise((resolve, reject)=>{
        const fr = new FileReader();
        fr.onload = ()=> resolve(fr.result);
        fr.onerror = ()=> reject(new Error('file read error'));
        fr.readAsDataURL(file);
      });
    }

    // initial setup if admin page
    populateAdminList();
  }

  /* ---------- utilities ---------- */
  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }

  // expose API
  window.App = {
    renderHome,
    initViewPost,
    initAdmin
  };
})();
