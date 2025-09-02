
/*! blog/blog.js — filters + search (robust, no double counts) */
(function(){
  var grid = document.getElementById('blog-grid') || document.querySelector('.blog__grid');
  if(!grid){ return; }

  // Collect unique cards from the SINGLE grid only
  var rawCards = Array.prototype.slice.call(grid.querySelectorAll('.blog-card'));
  var uniqSet = new Set();
  var cards = [];
  rawCards.forEach(function(el){ if(!uniqSet.has(el)) { uniqSet.add(el); cards.push(el); } });

  // Helpers
  function qs(sel, ctx){ return (ctx||document).querySelector(sel); }
  function qsa(sel, ctx){ return Array.prototype.slice.call((ctx||document).querySelectorAll(sel)); }
  function norm(s){ return (s||"").toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }

  var searchInput = document.getElementById('blog-search');
  var filterStatus = document.getElementById('filter-status');
  var countEl = filterStatus ? qs('.filter-count', filterStatus) : null;
  var catEl = filterStatus ? qs('.filter-category', filterStatus) : null;
  var catCards = qsa('.categories-grid .category-card');

  // Build data model for faster search
  var model = cards.map(function(card){
    var href = (qs('.blog-card__title a', card) || {}).href || '';
    var cat = (card.getAttribute('data-category') || 'all').toLowerCase();
    var text = norm((qs('.blog-card__title', card) || {}).textContent + ' ' + (qs('.blog-card__excerpt', card) || {}).textContent);
    return {el:card, href:href, cat:cat, text:text};
  });

  // Deduplicate DOM cards by href (if duplicates slipped in markup)
  (function removeDomDupes(){
    var seen = new Set(); var removed = 0;
    model.forEach(function(m){
      if(!m.href) return;
      if(seen.has(m.href)){
        if(m.el && m.el.parentNode){ m.el.parentNode.removeChild(m.el); removed++; }
      } else {
        seen.add(m.href);
      }
    });
    if(removed>0){
      // Rebuild collections after DOM mutation
      rawCards = Array.prototype.slice.call(grid.querySelectorAll('.blog-card'));
      uniqSet = new Set(rawCards);
      cards = rawCards;
      model.length = 0;
      cards.forEach(function(card){
        var href = (qs('.blog-card__title a', card) || {}).href || '';
        var cat = (card.getAttribute('data-category') || 'all').toLowerCase();
        var text = norm((qs('.blog-card__title', card) || {}).textContent + ' ' + (qs('.blog-card__excerpt', card) || {}).textContent);
        model.push({el:card, href:href, cat:cat, text:text});
      });
    }
  })();

  function updateCounts(currentSlug, query){
    var visibleByCat = {};
    // Pre-count by category under current filters
    model.forEach(function(m){
      var inCat = (currentSlug==='all' || m.cat===currentSlug);
      var inText = !query || m.text.indexOf(query) !== -1;
      var show = inCat && inText;
      if(show){ visibleByCat[m.cat] = (visibleByCat[m.cat]||0) + 1; }
    });
    // Update category cards
    catCards.forEach(function(cc){
      var slug = (cc.getAttribute('data-category') || 'all').toLowerCase();
      var count = 0;
      if(slug==='all'){
        count = model.filter(function(m){
          var inText = !query || m.text.indexOf(query) !== -1;
          return inText;
        }).length;
      } else {
        count = visibleByCat[slug] || 0;
      }
      var span = qs('.category-card__count', cc);
      if(span){ span.textContent = count + (count===1?' articolo':' articoli'); }
    });
  }

  function render(slug, query){
    var q = norm(query||'');
    var visible = 0;
    model.forEach(function(m){
      var inCat = (slug==='all' || m.cat===slug);
      var inText = !q || m.text.indexOf(q) !== -1;
      var show = inCat && inText;
      m.el.style.display = show ? '' : 'none';
      if(show) visible++;
    });
    if(filterStatus && countEl && catEl){
      filterStatus.style.display = (slug!=='all' || (q && q.length>0)) ? '' : 'none';
      countEl.textContent = visible + (visible===1 ? ' articolo' : ' articoli');
      catEl.textContent = (slug==='all' ? 'Tutte' : slug.replace(/-/g,' ').replace(/\b\w/g, s=>s.toUpperCase()));
    }
    updateCounts(slug, q);
  }

  // Init UI: mark "all" active if present
  (function initUI(){
    var active = qs('.categories-grid .category-card.active');
    if(!active){
      var all = qs('.categories-grid .category-card[data-category="all"]');
      if(all){ all.classList.add('active'); }
    }
  })();

  // Bind category clicks (and keyboard)
  catCards.forEach(function(card){
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.addEventListener('click', function(){
      catCards.forEach(function(c){ c.classList.remove('active'); c.setAttribute('aria-pressed','false'); });
      this.classList.add('active'); this.setAttribute('aria-pressed','true');
      var slug = (this.getAttribute('data-category') || 'all').toLowerCase();
      render(slug, searchInput ? searchInput.value : '');
    });
    card.addEventListener('keydown', function(e){
      if(e.key==='Enter' || e.key===' '){ e.preventDefault(); this.click(); }
    });
  });

  // Debounced search (diacritics-insensitive)
  var t;
  if(searchInput){
    searchInput.addEventListener('input', function(){
      clearTimeout(t);
      var v = this.value || '';
      t = setTimeout(function(){
        var active = qs('.categories-grid .category-card.active');
        var slug = active ? (active.getAttribute('data-category')||'all').toLowerCase() : 'all';
        render(slug, v);
      }, 160);
    });
  }

  // Clear filter exposed globally
  window.clearFilter = function(){
    if(searchInput) searchInput.value='';
    catCards.forEach(function(c){ c.classList.remove('active'); c.setAttribute('aria-pressed','false'); });
    var all = qs('.categories-grid .category-card[data-category="all"]');
    if(all){ all.classList.add('active'); all.setAttribute('aria-pressed','true'); }
    render('all','');
  };

  // First paint
  render('all','');
})();
