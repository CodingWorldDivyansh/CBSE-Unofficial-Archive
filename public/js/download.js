// Download Module
(function() {
  window.CBSEArchive = window.CBSEArchive || {};

  const Download = {
    init() {
      this.bindEvents();
    },

    bindEvents() {
      const self = this;
      
      // Floating Download Bar Button
      document.getElementById('btn-download').addEventListener('click', () => {
        self.handleDownload();
      });
    },

    async handleDownload() {
      if (!window.CBSEArchive.Selection) return;

      const selected = window.CBSEArchive.Selection.getSelectedPapers();
      if (selected.length === 0) return;

      // 1. SINGLE PAPER: Open source URL directly (no ZIP)
      if (selected.length === 1) {
        const paper = selected[0];
        if (paper.available) {
          if (paper.directDownload) {
            const a = document.createElement('a');
            a.href = paper.sourceUrl;
            a.target = '_blank';
            a.rel = 'noopener';
            a.click();
            this.showToast(`Opening: ${paper.filename}`, 'success');
          } else {
            window.open(paper.sourceUrl, '_blank');
            this.showToast(`Opening source page for: ${paper.filename}`, 'warning');
          }
        } else {
          this.showToast('Paper is not available', 'error');
        }
        return;
      }

      // 2. MULTIPLE PAPERS: Call node server for ZIP generation
      const files = selected
        .filter(p => p.available && p.directDownload)
        .map(p => ({
          url: p.sourceUrl,
          filename: p.filename
        }));

      if (files.length === 0) {
        this.showToast('No downloadable PDFs in selection', 'warning');
        return;
      }

      if (files.length > 200) {
        const proceed = confirm(`You have selected ${files.length} papers for download. Packaging more than 200 papers in a single ZIP may take a while. Do you want to proceed?`);
        if (!proceed) {
          return;
        }
      }

      this.showLoading(true);
      this.showToast(`Requesting ZIP for ${files.length} papers. Please wait...`, 'info');

      try {
        const response = await fetch('/api/download-zip', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ files })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Server failed to generate ZIP');
        }

        // Trigger binary download of the generated ZIP file
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CBSE_Commerce_Papers_${new Date().toISOString().slice(0, 10)}.zip`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast(`Successfully downloaded ${files.length} papers as ZIP!`, 'success');
        
        // Clear selection after successful download
        window.CBSEArchive.Selection.deselectAll();
      } catch (err) {
        console.error('ZIP Download failed:', err);
        this.showToast(`Download failed: ${err.message}`, 'error');
      } finally {
        this.showLoading(false);
      }
    },

    showLoading(isLoading) {
      const btn = document.getElementById('btn-download');
      const text = btn.querySelector('.btn-download-text');
      const loading = btn.querySelector('.btn-download-loading');
      
      if (isLoading) {
        btn.disabled = true;
        text.style.display = 'none';
        loading.style.display = 'inline-flex';
      } else {
        btn.disabled = false;
        text.style.display = 'inline-flex';
        loading.style.display = 'none';
      }
    },

    // Toast alert system
    showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      
      // Select symbol/icon based on type
      let icon = 'ℹ️';
      if (type === 'success') icon = '✅';
      if (type === 'warning') icon = '⚠️';
      if (type === 'error') icon = '❌';

      toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <div class="toast-message">${message}</div>
        <button class="toast-close" aria-label="Close notification">&times;</button>
      `;

      // Close handler
      toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px) scale(0.9)';
        setTimeout(() => toast.remove(), 200);
      });

      container.appendChild(toast);

      // Auto dismiss after 4 seconds
      setTimeout(() => {
        if (toast.parentNode) {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(-10px) scale(0.9)';
          setTimeout(() => toast.remove(), 200);
        }
      }, 4000);
    }
  };

  window.CBSEArchive.Download = Download;
})();
