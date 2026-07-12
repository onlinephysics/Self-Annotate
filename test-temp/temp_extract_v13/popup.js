/* ══════════════════════════════════════════════════════════
   Self Annotate v1.2 — popup.js
   Main settings + Toolbar Layout Editor (Annotate & Whiteboard)
══════════════════════════════════════════════════════════ */
(function () {

  /* ── All available buttons ── */
  var ALL_BTNS = {
    // Annotate toolbar buttons
    pen:    { icon:'✏️', label:'Pen' },
    magic:  { icon:'✨', label:'Magic' },
    marker: { icon:'🖊️', label:'Marker' },
    arrow:  { icon:'➡️', label:'Arrow' },
    rect:   { icon:'⬜', label:'Rect' },
    circle: { icon:'⭕', label:'Circle' },
    text:   { icon:'T',  label:'Text' },
    eraser: { icon:'🧹', label:'Eraser' },
    colors: { icon:'🎨', label:'Colors' },
    slider: { icon:'〰️', label:'Thickness' },
    undo:   { icon:'↩️', label:'Undo' },
    clear:  { icon:'🗑️', label:'Clear' },
    hide:   { icon:'👁️', label:'Hide' },
    scroll: { icon:'🤚', label:'Scroll' },
    rotate: { icon:'↔️', label:'Rotate' },
    wb:     { icon:'🖥️', label:'Whiteboard' },
    close:  { icon:'✖',  label:'Close' }
  };

  var WB_BTNS = {
    pen:    { icon:'✏️', label:'Pen' },
    magic:  { icon:'✨', label:'Magic' },
    marker: { icon:'🖊️', label:'Marker' },
    arrow:  { icon:'➡️', label:'Arrow' },
    rect:   { icon:'⬜', label:'Rect' },
    circle: { icon:'⭕', label:'Circle' },
    text:   { icon:'T',  label:'Text' },
    eraser: { icon:'🧹', label:'Eraser' },
    colors: { icon:'🎨', label:'Colors' },
    slider: { icon:'〰️', label:'Thickness' },
    bg:     { icon:'🖼️', label:'BG Color' },
    zoom:   { icon:'🔍', label:'Zoom' },
    save:   { icon:'💾', label:'Save .sswb' },
    load:   { icon:'📂', label:'Load .sswb' },
    undo:   { icon:'↩️', label:'Undo' },
    clear:  { icon:'🗑️', label:'Clear' }
  };

  /* ── Built-in presets ── */
  var AN_PRESETS = {
    default: {
      name: 'Default',
      groups: [
        { id:'g1', name:'Draw',    icon:'✏️', mode:'inline',  btns:['pen','magic','marker'] },
        { id:'g2', name:'Shapes',  icon:'📐', mode:'flyout',  btns:['arrow','rect','circle'] },
        { id:'g3', name:'More',    icon:'➕', mode:'flyout',  btns:['text','eraser'] },
        { id:'g4', name:'Colors',  icon:'🎨', mode:'inline',  btns:['colors','slider'] },
        { id:'g5', name:'Actions', icon:'⚡', mode:'inline',  btns:['undo','clear','hide','scroll','rotate','wb','close'] }
      ]
    },
    minimal: {
      name: 'Minimal',
      groups: [
        { id:'g1', name:'Tools',   icon:'🖊️', mode:'flyout',  btns:['pen','magic','marker','arrow','rect','circle','text','eraser'] },
        { id:'g2', name:'Colors',  icon:'🎨', mode:'inline',  btns:['colors','slider'] },
        { id:'g3', name:'Actions', icon:'⚡', mode:'inline',  btns:['undo','clear','hide','scroll','rotate','wb','close'] }
      ]
    },
    drawing: {
      name: 'Drawing',
      groups: [
        { id:'g1', name:'Pen',     icon:'✏️', mode:'inline',  btns:['pen','magic','marker'] },
        { id:'g2', name:'Shapes',  icon:'📐', mode:'inline',  btns:['arrow','rect','circle'] },
        { id:'g3', name:'Text',    icon:'T',  mode:'inline',  btns:['text','eraser'] },
        { id:'g4', name:'Style',   icon:'🎨', mode:'inline',  btns:['colors','slider'] },
        { id:'g5', name:'Control', icon:'⚙️', mode:'flyout',  btns:['undo','clear','hide','scroll','rotate','wb','close'] }
      ]
    },
    compact: {
      name: 'Compact',
      groups: [
        { id:'g1', name:'Draw',    icon:'✏️', mode:'flyout',  btns:['pen','magic','marker','arrow','rect','circle','text','eraser','colors','slider'] },
        { id:'g2', name:'Actions', icon:'⚡', mode:'flyout',  btns:['undo','clear','hide','scroll','rotate','wb','close'] }
      ]
    }
  };

  var WB_PRESETS = {
    default: {
      name: 'Default',
      groups: [
        { id:'g1', name:'Draw',    icon:'✏️', mode:'inline',  btns:['pen','magic','marker'] },
        { id:'g2', name:'Shapes',  icon:'📐', mode:'flyout',  btns:['arrow','rect','circle'] },
        { id:'g3', name:'More',    icon:'➕', mode:'flyout',  btns:['text','eraser'] },
        { id:'g4', name:'Style',   icon:'🎨', mode:'inline',  btns:['colors','slider','bg'] },
        { id:'g5', name:'Actions', icon:'⚡', mode:'inline',  btns:['undo','clear'] }
      ]
    },
    minimal: {
      name: 'Minimal',
      groups: [
        { id:'g1', name:'Tools',   icon:'🖊️', mode:'flyout',  btns:['pen','magic','marker','arrow','rect','circle','text','eraser'] },
        { id:'g2', name:'Style',   icon:'🎨', mode:'inline',  btns:['colors','slider','bg'] },
        { id:'g3', name:'Actions', icon:'⚡', mode:'inline',  btns:['undo','clear'] }
      ]
    },
    compact: {
      name: 'Compact',
      groups: [
        { id:'g1', name:'All',     icon:'✏️', mode:'flyout',  btns:['pen','magic','marker','arrow','rect','circle','text','eraser','colors','slider','bg','zoom','undo','clear','save','load'] }
      ]
    }
  };

  var ICONS = ['✏️','🖊️','📐','📝','⬜','⭕','➡️','✨','🎨','🖌️','🖍️','⚡','⚙️','➕','🗂️','🔧','📌','🏷️','💡','🔍','T','✖','👁️','🤚','↔️','↩️','🗑️','🖥️','〰️','🖼️','💾','📂'];

  /* ── State ── */
  var anGroups = [];
  var wbGroups = [];
  var activeAnPreset = 'default';
  var activeWbPreset = 'default';

  /* ── Tab switching ── */
  document.querySelectorAll('.tab').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(function(b){ b.classList.remove('active'); });
      document.querySelectorAll('.tab-panel').forEach(function(p){ p.classList.remove('active'); });
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  /* ── Main tab: ON/OFF & settings ── */
  var toggle    = document.getElementById('onoffToggle');
  var statusLbl = document.getElementById('statusLabel');

  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs[0] && tabs[0].url && tabs[0].url.startsWith('file://'))
      document.getElementById('fileNotice').classList.add('show');
  });

  chrome.runtime.sendMessage({ type: 'GET_STATE' }, function(resp) {
    if (resp && resp.isOn) { toggle.checked = true; statusLbl.textContent = 'Active — annotations enabled'; }
    else { toggle.checked = false; statusLbl.textContent = 'Inactive — click to activate'; }
  });

  toggle.addEventListener('change', function() {
    chrome.runtime.sendMessage({ type: 'TOGGLE' }, function(resp) {
      toggle.checked = !!(resp && resp.isOn);
      statusLbl.textContent = toggle.checked ? 'Active — annotations enabled' : 'Inactive — click to activate';
    });
  });

  var themeIds = ['themeDevice','themeLight','themeDark'];
  var langIds  = ['langBN','langEN'];

  function setActive(ids, activeId) {
    ids.forEach(function(id){ document.getElementById(id).classList.toggle('active', id===activeId); });
  }
  function applyBodyTheme(theme) {
    var dark = (theme==='dark') || (theme==='device' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.body.classList.toggle('dark', dark);
  }

  chrome.storage.local.get(['AN_theme','AN_lang','AN_groups','WB_groups','AN_activePreset','WB_activePreset'], function(r) {
    var theme = r.AN_theme || 'device';
    var lang  = r.AN_lang  || 'en';
    setActive(themeIds, theme==='dark'?'themeDark':theme==='light'?'themeLight':'themeDevice');
    setActive(langIds, lang==='bn'?'langBN':'langEN');
    applyBodyTheme(theme);

    // Load layout data
    activeAnPreset = r.AN_activePreset || 'default';
    activeWbPreset = r.WB_activePreset || 'default';
    anGroups = r.AN_groups ? JSON.parse(r.AN_groups) : deepClone(AN_PRESETS[activeAnPreset].groups);
    wbGroups = r.WB_groups ? JSON.parse(r.WB_groups) : deepClone(WB_PRESETS[activeWbPreset].groups);

    renderPresets('an', AN_PRESETS, activeAnPreset);
    renderPresets('wb', WB_PRESETS, activeWbPreset);
    renderGroups('an', anGroups, ALL_BTNS);
    renderGroups('wb', wbGroups, WB_BTNS);
  });

  themeIds.forEach(function(id) {
    document.getElementById(id).addEventListener('click', function() {
      setActive(themeIds, id);
      applyBodyTheme(id==='themeDark'?'dark':id==='themeLight'?'light':'device');
    });
  });
  langIds.forEach(function(id) {
    document.getElementById(id).addEventListener('click', function(){ setActive(langIds, id); });
  });

  document.getElementById('saveBtn').addEventListener('click', function() {
    var theme = document.getElementById('themeDark').classList.contains('active')?'dark'
              : document.getElementById('themeLight').classList.contains('active')?'light':'device';
    var lang  = document.getElementById('langBN').classList.contains('active')?'bn':'en';
    chrome.storage.local.set({ AN_theme: theme, AN_lang: lang }, function() {
      var st = document.getElementById('savedTag');
      st.classList.add('show');
      setTimeout(function(){ st.classList.remove('show'); }, 2000);
    });
  });

  /* ── Layout save buttons ── */
  document.getElementById('an-save').addEventListener('click', function() {
    chrome.storage.local.set({ AN_groups: JSON.stringify(anGroups), AN_activePreset: activeAnPreset }, function() {
      // Notify active tab
      chrome.tabs.query({ active:true, currentWindow:true }, function(tabs) {
        if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type:'AN_GROUPS_UPDATE', groups: anGroups }).catch(function(){});
      });
      showSaved('an-saved');
    });
  });

  document.getElementById('wb-save').addEventListener('click', function() {
    chrome.storage.local.set({ WB_groups: JSON.stringify(wbGroups), WB_activePreset: activeWbPreset }, function() {
      chrome.tabs.query({ active:true, currentWindow:true }, function(tabs) {
        if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type:'WB_GROUPS_UPDATE', groups: wbGroups }).catch(function(){});
      });
      showSaved('wb-saved');
    });
  });

  function showSaved(id) {
    var el = document.getElementById(id);
    el.classList.add('show');
    setTimeout(function(){ el.classList.remove('show'); }, 2000);
  }

  /* ── Preset rendering ── */
  function renderPresets(prefix, presets, active) {
    var row = document.getElementById(prefix + '-presets');
    row.innerHTML = '';
    Object.keys(presets).forEach(function(key) {
      var btn = document.createElement('button');
      btn.className = 'preset-pill' + (key===active?' active':'');
      btn.textContent = presets[key].name;
      btn.addEventListener('click', function() {
        if (prefix==='an') {
          activeAnPreset = key;
          anGroups = deepClone(presets[key].groups);
          renderGroups('an', anGroups, ALL_BTNS);
        } else {
          activeWbPreset = key;
          wbGroups = deepClone(presets[key].groups);
          renderGroups('wb', wbGroups, WB_BTNS);
        }
        document.querySelectorAll('#'+prefix+'-presets .preset-pill').forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
      });
      row.appendChild(btn);
    });
  }

  /* ── Group rendering ── */
  function renderGroups(prefix, groups, btnDefs) {
    var container = document.getElementById(prefix + '-groups');
    container.innerHTML = '';
    groups.forEach(function(grp, gi) {
      container.appendChild(buildGroupBlock(prefix, grp, gi, groups, btnDefs));
    });
  }

  function buildGroupBlock(prefix, grp, gi, groups, btnDefs) {
    var block = document.createElement('div');
    block.className = 'group-block';
    block.dataset.id = grp.id;

    // Header
    var hdr = document.createElement('div');
    hdr.className = 'group-header';

    // Icon picker trigger
    var iconEl = document.createElement('span');
    iconEl.className = 'group-icon-pick';
    iconEl.textContent = grp.icon || '📦';
    iconEl.title = 'Pick icon';
    iconEl.addEventListener('click', function(e) {
      showIconPicker(e, function(ic) { grp.icon = ic; iconEl.textContent = ic; });
    });

    // Name input
    var nameEl = document.createElement('input');
    nameEl.className = 'group-name';
    nameEl.value = grp.name || 'Group';
    nameEl.addEventListener('input', function(){ grp.name = nameEl.value; });

    // Mode toggle (inline ↔ flyout)
    var modeBtn = document.createElement('button');
    modeBtn.className = 'group-mode ' + (grp.mode||'inline');
    modeBtn.textContent = grp.mode==='flyout' ? '📂 Flyout' : '📌 Inline';
    modeBtn.title = 'Click to toggle: Inline shows all buttons always; Flyout collapses to one button that expands on click';
    modeBtn.addEventListener('click', function() {
      grp.mode = grp.mode==='flyout' ? 'inline' : 'flyout';
      modeBtn.className = 'group-mode ' + grp.mode;
      modeBtn.textContent = grp.mode==='flyout' ? '📂 Flyout' : '📌 Inline';
    });

    // Delete group
    var delBtn = document.createElement('button');
    delBtn.className = 'group-del';
    delBtn.title = 'Delete group';
    delBtn.innerHTML = '✕';
    delBtn.addEventListener('click', function() {
      groups.splice(gi, 1);
      renderGroups(prefix, groups, btnDefs);
    });

    hdr.appendChild(iconEl);
    hdr.appendChild(nameEl);
    hdr.appendChild(modeBtn);
    hdr.appendChild(delBtn);

    // Chips area
    var chipsArea = document.createElement('div');
    chipsArea.className = 'group-chips';

    grp.btns.forEach(function(key, bi) {
      var def = btnDefs[key];
      if (!def) return;
      var chip = document.createElement('span');
      chip.className = 'chip';
      var chipIcon = document.createElement('span');
      chipIcon.className = 'chip-icon';
      chipIcon.textContent = def.icon;
      var chipDel = document.createElement('button');
      chipDel.className = 'chip-del';
      chipDel.innerHTML = '✕';
      chipDel.title = 'Remove';
      chipDel.addEventListener('click', function() {
        grp.btns.splice(bi, 1);
        renderGroups(prefix, groups, btnDefs);
      });
      chip.appendChild(chipIcon);
      chip.appendChild(chipDel);
      chip.title = def.label;
      chipsArea.appendChild(chip);
    });

    // "Add button" trigger
    var addBtn = document.createElement('button');
    addBtn.className = 'group-add-btn';
    addBtn.innerHTML = '＋ Add';
    addBtn.addEventListener('click', function() {
      togglePicker(block, prefix, grp, groups, btnDefs);
    });
    chipsArea.appendChild(addBtn);

    block.appendChild(hdr);
    block.appendChild(chipsArea);
    return block;
  }

  /* ── Button picker within a group ── */
  function togglePicker(block, prefix, grp, groups, btnDefs) {
    // Remove any open picker first
    var existing = block.querySelector('.btn-picker');
    if (existing) { existing.remove(); return; }
    document.querySelectorAll('.btn-picker').forEach(function(p){ p.remove(); });

    var picker = document.createElement('div');
    picker.className = 'btn-picker';

    Object.keys(btnDefs).forEach(function(key) {
      var def = btnDefs[key];
      var item = document.createElement('div');
      item.className = 'picker-item' + (isUsed(key, groups) ? ' used' : '');
      item.dataset.key = key;
      item.textContent = def.icon;
      item.title = def.label;
      item.addEventListener('click', function() {
        if (!isUsed(key, groups)) {
          grp.btns.push(key);
          renderGroups(prefix, groups, btnDefs);
        }
      });
      picker.appendChild(item);
    });

    block.appendChild(picker);
  }

  function isUsed(key, groups) {
    for (var i=0; i<groups.length; i++) {
      if (groups[i].btns.indexOf(key) !== -1) return true;
    }
    return false;
  }

  /* ── Add group ── */
  document.getElementById('an-add-group').addEventListener('click', function() {
    var id = 'g_' + Date.now();
    anGroups.push({ id:id, name:'New Group', icon:'📦', mode:'inline', btns:[] });
    renderGroups('an', anGroups, ALL_BTNS);
  });
  document.getElementById('wb-add-group').addEventListener('click', function() {
    var id = 'g_' + Date.now();
    wbGroups.push({ id:id, name:'New Group', icon:'📦', mode:'inline', btns:[] });
    renderGroups('wb', wbGroups, WB_BTNS);
  });

  /* ── Icon picker popup ── */
  var iconPickerEl = null;
  function showIconPicker(e, callback) {
    if (iconPickerEl) { iconPickerEl.remove(); iconPickerEl = null; }
    var popup = document.createElement('div');
    popup.className = 'icon-popup';
    ICONS.forEach(function(ic) {
      var sp = document.createElement('span');
      sp.textContent = ic;
      sp.title = ic;
      sp.addEventListener('click', function() {
        callback(ic);
        popup.remove();
        iconPickerEl = null;
      });
      popup.appendChild(sp);
    });
    document.body.appendChild(popup);
    var rect = e.target.getBoundingClientRect();
    popup.style.top  = (rect.bottom + 2) + 'px';
    popup.style.left = Math.min(rect.left, window.innerWidth - 170) + 'px';
    iconPickerEl = popup;
    setTimeout(function() {
      document.addEventListener('click', function dismiss(ev) {
        if (!popup.contains(ev.target)) { popup.remove(); iconPickerEl=null; document.removeEventListener('click',dismiss); }
      });
    }, 10);
  }

  /* ── Open Whiteboard in Tab ── */
  document.getElementById('openWbTabBtn').addEventListener('click', function() {
    chrome.runtime.sendMessage({ type: 'OPEN_WB_TAB' });
  });

  /* ── Helpers ── */
  function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

  // ════════════════════════════════════════════
  //  AUTOSAVE
  // ════════════════════════════════════════════

  var asOn = false, asRules = [];

  function asSetBodyOpacity() {
    document.getElementById('asBody').style.opacity = asOn ? '1' : '0.4';
  }

  function asRenderRules() {
    var container = document.getElementById('asRuleList');
    container.innerHTML = '';
    asRules.forEach(function(rule, i) {
      var chip = document.createElement('span');
      chip.className = 'rule-chip';
      chip.innerHTML = '<span class="rule-text">' + escHtml(rule) + '</span><button class="rule-del" data-i="' + i + '">\u2715</button>';
      container.appendChild(chip);
    });
    document.getElementById('asNoRules').style.display = asRules.length === 0 ? 'block' : 'none';
  }

  function escHtml(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function asAddRule() {
    var input = document.getElementById('asRuleInput');
    var val = input.value.trim();
    if (!val || asRules.indexOf(val) !== -1) return;
    asRules.push(val);
    input.value = '';
    asRenderRules();
    asSaveSettings();
  }

  function asSaveSettings() {
    chrome.runtime.sendMessage({
      type: 'AUTOSAVE_SAVE_SETTINGS',
      autosave: asOn,
      mode: 'blacklist',
      rules: asRules
    });
  }

  // Load autosave settings
  chrome.runtime.sendMessage({ type: 'AUTOSAVE_GET_SETTINGS' }, function(resp) {
    if (!resp) return;
    asOn = resp.autosave === true;
    asRules = resp.rules || [];
    document.getElementById('asToggle').checked = asOn;
    asSetBodyOpacity();
    asRenderRules();
    asLoadSites();
  });

  // Autosave toggle
  document.getElementById('asToggle').addEventListener('change', function() {
    asOn = this.checked;
    asSetBodyOpacity();
    asSaveSettings();
  });

  // Add rule
  document.getElementById('asAddRule').addEventListener('click', asAddRule);
  document.getElementById('asRuleInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') asAddRule();
  });

  // Delete rule (event delegation)
  document.getElementById('asRuleList').addEventListener('click', function(e) {
    var btn = e.target.closest('.rule-del');
    if (!btn) return;
    var i = parseInt(btn.dataset.i, 10);
    if (!isNaN(i)) {
      asRules.splice(i, 1);
      asRenderRules();
      asSaveSettings();
    }
  });

  function asLoadSites() {
    chrome.runtime.sendMessage({ type: 'AUTOSAVE_GET_SITES' }, function(resp) {
      var container = document.getElementById('asSiteList');
      var empty = document.getElementById('asNoSites');
      var clearBtn = document.getElementById('asClearAll');
      if (!resp || !resp.sites || resp.sites.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'block';
        clearBtn.style.display = 'none';
        return;
      }
      empty.style.display = 'none';
      clearBtn.style.display = 'block';
      container.innerHTML = '';
      resp.sites.forEach(function(site) {
        var row = document.createElement('div');
        row.className = 'site-row';
        var dateStr = '';
        if (site.savedAt) {
          try { dateStr = new Date(site.savedAt).toLocaleDateString(undefined, { month:'short', day:'numeric' }); } catch(e) {}
        }
        row.innerHTML = '<div class="site-info"><div class="site-title">' + escHtml(site.title) + '</div><div class="site-url">' + escHtml(site.url) + ' <span style="color:#94a3b8;font-size:9px;">' + dateStr + '</span></div></div><div class="site-actions"><button class="site-btn" title="Open page">&nearr;</button><button class="site-btn del" title="Delete">\u2715</button></div>';
        row.querySelector('.site-btn:not(.del)').addEventListener('click', function() {
          chrome.tabs.create({ url: site.url });
        });
        row.querySelector('.site-btn.del').addEventListener('click', function() {
          chrome.runtime.sendMessage({ type: 'AUTOSAVE_DELETE_SITE', url: site.url }, function() {
            asLoadSites();
          });
        });
        container.appendChild(row);
      });
    });
  }

  // Clear all sites
  document.getElementById('asClearAll').addEventListener('click', function() {
    chrome.runtime.sendMessage({ type: 'AUTOSAVE_GET_SITES' }, function(resp) {
      if (!resp || !resp.sites) return;
      chrome.storage.local.set({ AN_autosave_sites: {} }, function() {
        asLoadSites();
      });
    });
  });

})();
