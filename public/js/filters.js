// Filters Module
(function() {
  window.CBSEArchive = window.CBSEArchive || {};

  const Filters = {
    state: {
      subject: '',
      year: '',
      region: '',
      type: '',
      exam: '',
      search: ''
    },
    
    init() {
      this.bindEvents();
      this.readHash();
    },

    bindEvents() {
      const self = this;
      
      // Bind select dropdown inputs
      document.getElementById('filter-subject').addEventListener('change', function(e) {
        self.state.subject = e.target.value;
        self.updateHash();
        self.onFilterChange();
      });
      
      document.getElementById('filter-year').addEventListener('change', function(e) {
        self.state.year = e.target.value;
        self.updateHash();
        self.onFilterChange();
      });
      
      document.getElementById('filter-region').addEventListener('change', function(e) {
        self.state.region = e.target.value;
        self.updateHash();
        self.onFilterChange();
      });
      
      document.getElementById('filter-type').addEventListener('change', function(e) {
        self.state.type = e.target.value;
        self.updateHash();
        self.onFilterChange();
      });
      
      document.getElementById('filter-exam').addEventListener('change', function(e) {
        self.state.exam = e.target.value;
        self.updateHash();
        self.onFilterChange();
      });

      // Bind search input with debouncing
      const searchInput = document.getElementById('filter-search-input');
      searchInput.addEventListener('input', this.debounce(function(e) {
        self.state.search = e.target.value.trim();
        self.updateHash();
        self.onFilterChange();
      }, 200));

      // Clear filters button
      document.getElementById('btn-clear-filters').addEventListener('click', function() {
        self.clearAll();
      });

      // Handle back/forward navigation with hashchange
      window.addEventListener('hashchange', function() {
        self.readHash();
        self.onFilterChange();
      });
    },

    onFilterChange() {
      // Trigger update of rendered cards
      if (window.CBSEArchive.App && window.CBSEArchive.App.updateFilteredPapers) {
        window.CBSEArchive.App.updateFilteredPapers();
      }
    },

    // Multi-criteria filtering logic (AND logic + Search text)
    apply(papers) {
      // Toggle 2021 covid notice
      const notice = document.getElementById('notice-2021');
      if (this.state.year === '2021') {
        notice.style.display = 'block';
      } else {
        notice.style.display = 'none';
      }

      return papers.filter(paper => {
        // 1. Subject filter
        if (this.state.subject && paper.subject !== this.state.subject) return false;
        
        // 2. Year filter
        if (this.state.year && paper.year !== parseInt(this.state.year)) return false;
        
        // 3. Region filter
        if (this.state.region && paper.region !== this.state.region) return false;
        
        // 4. Type filter
        if (this.state.type && paper.type !== this.state.type) return false;
        
        // 5. Exam Type filter
        if (this.state.exam && paper.examType !== this.state.exam) return false;

        // 6. Search query filter
        if (this.state.search) {
          const query = this.state.search.toLowerCase();
          const matchesSubject = paper.subject.toLowerCase().includes(query);
          const matchesFilename = paper.filename.toLowerCase().includes(query);
          const matchesCode = paper.paperCode ? paper.paperCode.toLowerCase().includes(query) : false;
          const matchesRegion = paper.region.toLowerCase().includes(query);
          const matchesNotes = paper.notes ? paper.notes.toLowerCase().includes(query) : false;
          
          if (!matchesSubject && !matchesFilename && !matchesCode && !matchesRegion && !matchesNotes) {
            return false;
          }
        }

        return true;
      });
    },

    // Synchronize UI dropdowns/inputs with state
    syncUI() {
      document.getElementById('filter-subject').value = this.state.subject;
      document.getElementById('filter-year').value = this.state.year;
      document.getElementById('filter-region').value = this.state.region;
      document.getElementById('filter-type').value = this.state.type;
      document.getElementById('filter-exam').value = this.state.exam;
      document.getElementById('filter-search-input').value = this.state.search;
    },

    // Update hash string based on state
    updateHash() {
      const params = new URLSearchParams();
      Object.entries(this.state).forEach(([key, val]) => {
        if (val) params.set(key, val);
      });
      
      const hash = params.toString();
      if (hash) {
        window.location.hash = hash;
      } else {
        // remove hash completely
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
      }
    },

    // Read state from URL hash
    readHash() {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      
      this.state.subject = params.get('subject') || '';
      this.state.year = params.get('year') || '';
      this.state.region = params.get('region') || '';
      this.state.type = params.get('type') || '';
      this.state.exam = params.get('exam') || '';
      this.state.search = params.get('search') || '';
      
      this.syncUI();
    },

    clearAll() {
      this.state = {
        subject: '',
        year: '',
        region: '',
        type: '',
        exam: '',
        search: ''
      };
      this.updateHash();
      this.syncUI();
      this.onFilterChange();
    },

    debounce(func, wait) {
      let timeout;
      return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
      };
    }
  };

  window.CBSEArchive.Filters = Filters;
})();
