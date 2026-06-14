// Main Application Entry Point
(function() {
  window.CBSEArchive = window.CBSEArchive || {};

  const App = {
    allPapers: [],
    filteredPapers: [],
    
    async init() {
      // Initialize sub-modules
      if (window.CBSEArchive.Filters) window.CBSEArchive.Filters.init();
      if (window.CBSEArchive.Renderer) window.CBSEArchive.Renderer.init();
      if (window.CBSEArchive.Selection) window.CBSEArchive.Selection.init();
      if (window.CBSEArchive.Download) window.CBSEArchive.Download.init();

      // Set up scroll effect for sticky filter bar
      this.bindScrollEffect();

      // Show skeleton cards
      if (window.CBSEArchive.Renderer) {
        window.CBSEArchive.Renderer.showLoading(true);
      }

      try {
        // Fetch papers database
        const res = await fetch('/data/papers.json');
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        
        const data = await res.json();
        this.allPapers = data.papers || [];
        this.filteredPapers = this.allPapers;

        // Render stats & populate year filter dropdown
        this.renderStats(data.metadata);
        this.populateYearDropdown();

        // Sync URL Hash on load
        if (window.CBSEArchive.Filters) {
          window.CBSEArchive.Filters.readHash();
          this.filteredPapers = window.CBSEArchive.Filters.apply(this.allPapers);
        }

        // Hide skeletons and render initial grid
        if (window.CBSEArchive.Renderer) {
          window.CBSEArchive.Renderer.showLoading(false);
          window.CBSEArchive.Renderer.render(this.filteredPapers);
          this.updateResultsCount();
        }
      } catch (err) {
        console.error('Failed to initialize CBSE Archive:', err);
        if (window.CBSEArchive.Download) {
          window.CBSEArchive.Download.showToast('Failed to load papers catalog. Please refresh the page.', 'error');
        }
      }
    },

    bindScrollEffect() {
      const filterSection = document.getElementById('filter-section');
      window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
          filterSection.classList.add('scrolled');
        } else {
          filterSection.classList.remove('scrolled');
        }
      });
    },

    renderStats(metadata) {
      if (!metadata) return;
      document.getElementById('stat-total-papers').textContent = metadata.totalPapers;
    },

    populateYearDropdown() {
      const select = document.getElementById('filter-year');
      
      // We support 2015 to 2026 inclusive
      const startYear = 2015;
      const endYear = 2026;
      
      for (let y = endYear; y >= startYear; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        select.appendChild(opt);
      }
    },

    // Triggered by Filters module when values change
    updateFilteredPapers() {
      if (window.CBSEArchive.Filters) {
        this.filteredPapers = window.CBSEArchive.Filters.apply(this.allPapers);
      }
      
      if (window.CBSEArchive.Renderer) {
        window.CBSEArchive.Renderer.render(this.filteredPapers);
      }
      
      this.updateResultsCount();
    },

    updateResultsCount() {
      const countEl = document.getElementById('results-count');
      if (countEl) {
        countEl.textContent = `${this.filteredPapers.length} papers found`;
      }
    },

    getAllPapers() {
      return this.allPapers;
    },

    getFilteredPapers() {
      return this.filteredPapers;
    }
  };

  window.CBSEArchive.App = App;

  // DOM Content Loaded starts the app
  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });
})();
