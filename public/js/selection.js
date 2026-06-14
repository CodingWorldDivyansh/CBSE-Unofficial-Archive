// Selection Module
(function() {
  window.CBSEArchive = window.CBSEArchive || {};

  const Selection = {
    selectedIds: new Set(),
    lastSelectedId: null, // Tracks last clicked item for Shift+Click range selection

    init() {
      this.bindEvents();
    },

    bindEvents() {
      const self = this;

      // Select All Visible Button
      document.getElementById('btn-select-all').addEventListener('click', () => {
        self.selectAllVisible();
      });

      // Deselect All Button (if visible in future filters)
      document.getElementById('btn-deselect-all').addEventListener('click', () => {
        self.deselectAll();
      });

      // Clear Selection Button in floating bar
      document.getElementById('btn-clear-selection').addEventListener('click', () => {
        self.deselectAll();
      });
    },

    has(id) {
      return this.selectedIds.has(id);
    },

    // Toggle card selection state
    toggle(id, shiftKey) {
      const papers = window.CBSEArchive.App.getFilteredPapers();
      const availablePapers = papers.filter(p => p.available);
      
      if (shiftKey && this.lastSelectedId) {
        // Shift+Click range selection
        const indexCurrent = availablePapers.findIndex(p => p.id === id);
        const indexLast = availablePapers.findIndex(p => p.id === this.lastSelectedId);
        
        if (indexCurrent !== -1 && indexLast !== -1) {
          const start = Math.min(indexCurrent, indexLast);
          const end = Math.max(indexCurrent, indexLast);
          
          // Determine if we are selecting or deselecting based on the current state of last selected
          const makeSelected = this.selectedIds.has(this.lastSelectedId);
          
          for (let i = start; i <= end; i++) {
            const paperId = availablePapers[i].id;
            if (makeSelected) {
              this.selectedIds.add(paperId);
              this.updateCardUI(paperId, true);
            } else {
              this.selectedIds.delete(paperId);
              this.updateCardUI(paperId, false);
            }
          }
        }
      } else {
        // Normal click
        if (this.selectedIds.has(id)) {
          this.selectedIds.delete(id);
          this.updateCardUI(id, false);
        } else {
          this.selectedIds.add(id);
          this.updateCardUI(id, true);
        }
      }

      this.lastSelectedId = id;
      this.updateDownloadBar();
    },

    // Directly update a card's visual state in the DOM
    updateCardUI(id, isSelected) {
      const card = document.querySelector(`.paper-card[data-id="${id}"]`);
      if (card) {
        if (isSelected) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
        
        const checkbox = card.querySelector('input[type="checkbox"]');
        if (checkbox) {
          checkbox.checked = isSelected;
        }
      }
    },

    // Select all visible papers that are available
    selectAllVisible() {
      const papers = window.CBSEArchive.App.getFilteredPapers();
      const availablePapers = papers.filter(p => p.available);
      
      availablePapers.forEach(paper => {
        this.selectedIds.add(paper.id);
        this.updateCardUI(paper.id, true);
      });

      this.updateDownloadBar();
    },

    // Clear selection entirely
    deselectAll() {
      this.selectedIds.forEach(id => {
        this.updateCardUI(id, false);
      });
      this.selectedIds.clear();
      this.lastSelectedId = null;
      this.updateDownloadBar();
    },

    // Update count and transition download bar into view
    updateDownloadBar() {
      const count = this.selectedIds.size;
      const countEl = document.getElementById('download-count');
      const barEl = document.getElementById('download-bar');
      const selectAllEl = document.getElementById('btn-select-all');
      const deselectAllEl = document.getElementById('btn-deselect-all');
      
      countEl.textContent = count;
      
      if (count > 0) {
        barEl.classList.add('show');
        selectAllEl.style.display = 'none';
        deselectAllEl.style.display = 'inline-flex';
      } else {
        barEl.classList.remove('show');
        selectAllEl.style.display = 'inline-flex';
        deselectAllEl.style.display = 'none';
      }
    },

    // Returns the selected paper objects
    getSelectedPapers() {
      const allPapers = window.CBSEArchive.App.getAllPapers();
      return allPapers.filter(paper => this.selectedIds.has(paper.id));
    }
  };

  window.CBSEArchive.Selection = Selection;
})();
