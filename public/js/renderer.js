// Renderer Module
(function() {
  window.CBSEArchive = window.CBSEArchive || {};

  const Renderer = {
    gridElement: null,
    emptyStateElement: null,
    loadingElement: null,
    
    init() {
      this.gridElement = document.getElementById('papers-grid');
      this.emptyStateElement = document.getElementById('empty-state');
      this.loadingElement = document.getElementById('loading-state');
    },

    showLoading(show) {
      if (show) {
        this.loadingElement.style.display = 'grid';
        this.gridElement.style.display = 'none';
        this.emptyStateElement.style.display = 'none';
        
        // Render skeletons
        this.loadingElement.innerHTML = Array(12).fill(0).map(() => `
          <div class="skeleton-card"></div>
        `).join('');
      } else {
        this.loadingElement.style.display = 'none';
        this.gridElement.style.display = 'grid';
      }
    },

    // Renders the list of papers
    render(papers) {
      this.gridElement.innerHTML = '';
      
      if (papers.length === 0) {
        this.gridElement.style.display = 'none';
        this.emptyStateElement.style.display = 'block';
        return;
      }

      this.gridElement.style.display = 'grid';
      this.emptyStateElement.style.display = 'none';

      // Sort papers: Available first, then unavailable, and sort by year desc, then subject
      const sortedPapers = [...papers].sort((a, b) => {
        if (a.available !== b.available) {
          return a.available ? -1 : 1; // available first
        }
        if (a.year !== b.year) {
          return b.year - a.year; // newer first
        }
        return a.subject.localeCompare(b.subject); // alphabet subject
      });

      // Render in batches using requestAnimationFrame for butter-smooth UI performance
      const BATCH_SIZE = 50;
      let index = 0;

      const renderBatch = () => {
        const batch = sortedPapers.slice(index, index + BATCH_SIZE);
        const fragment = document.createDocumentFragment();

        batch.forEach(paper => {
          const card = this.createCardDOM(paper);
          fragment.appendChild(card);
        });

        this.gridElement.appendChild(fragment);
        
        // Apply staggered animations to the newly appended cards
        const cards = this.gridElement.querySelectorAll(`.paper-card:nth-last-child(-n+${batch.length})`);
        cards.forEach((card, idx) => {
          card.style.opacity = '0';
          card.style.transform = 'translateY(15px)';
          card.style.transition = 'opacity 300ms ease, transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), border-color 200ms ease, box-shadow 200ms ease, background-color 200ms ease';
          
          requestAnimationFrame(() => {
            setTimeout(() => {
              card.style.opacity = '1';
              card.style.transform = 'translateY(0)';
            }, idx * 25); // 25ms stagger delay
          });
        });

        index += BATCH_SIZE;
        if (index < sortedPapers.length) {
          requestAnimationFrame(renderBatch);
        }
      };

      requestAnimationFrame(renderBatch);
    },

    // Creates the HTML element for a paper card
    createCardDOM(paper) {
      const isSelected = window.CBSEArchive.Selection && window.CBSEArchive.Selection.has(paper.id);
      
      const div = document.createElement('div');
      div.className = `paper-card ${isSelected ? 'selected' : ''} ${!paper.available ? 'unavailable' : ''}`;
      div.setAttribute('data-id', paper.id);
      div.setAttribute('role', 'listitem');

      const subjectClass = paper.subject.toLowerCase().replace(/\s/g, '-');
      const tagTypeClass = paper.type === 'Question Paper' ? 'tag-qp' : 'tag-ms';

      // SVG icons for download and external link
      const downloadIcon = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/>
        </svg>
      `;

      const externalIcon = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
        </svg>
      `;

      div.innerHTML = `
        <div class="card-checkbox">
          <input type="checkbox" id="check-${paper.id}"
                 ${isSelected ? 'checked' : ''}
                 ${!paper.available ? 'disabled' : ''}
                 aria-label="Select ${paper.filename}">
          <label for="check-${paper.id}" class="checkbox-visual"></label>
        </div>
        <div class="card-body">
          <div class="card-tags">
            <span class="tag tag-subject tag-${subjectClass}">${paper.subject}</span>
            <span class="tag tag-type ${tagTypeClass}">${paper.type}</span>
            ${paper.term ? `<span class="tag tag-term">${paper.term}</span>` : ''}
            ${paper.examType === 'Compartment' ? '<span class="tag tag-comp">Compartment</span>' : ''}
            ${paper.examType === 'Sample' ? '<span class="tag tag-sample">Sample</span>' : ''}
          </div>
          <h3 class="card-title" title="${paper.subject} ${paper.year}">${paper.subject} ${paper.year}</h3>
          <p class="card-meta">
            ${paper.paperCode ? `Code: ${paper.paperCode} · ` : ''}
            ${paper.region}${paper.set ? ` · Set ${paper.set}` : ''}
          </p>
          ${paper.notes ? `<p class="card-notes">${paper.notes}</p>` : ''}
        </div>
        <div class="card-actions">
          ${paper.available && paper.directDownload
            ? `<a href="${paper.sourceUrl}" target="_blank" rel="noopener" class="btn btn-sm btn-icon" title="Download PDF" aria-label="Download ${paper.filename}">
                 ${downloadIcon}
               </a>`
            : paper.available
              ? `<a href="${paper.sourceUrl}" target="_blank" rel="noopener" class="btn btn-sm btn-icon" title="View Source" aria-label="View source for ${paper.filename}">
                   ${externalIcon}
                 </a>`
              : `<span class="unavailable-text">Not Available</span>`
          }
        </div>
      `;

      // Set up click handlers
      const self = this;
      
      // Prevent card click from triggering when clicking download buttons
      const actionLink = div.querySelector('.card-actions a');
      if (actionLink) {
        actionLink.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }

      // Checkbox click event
      const checkbox = div.querySelector('input[type="checkbox"]');
      if (checkbox) {
        checkbox.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent duplicate trigger from card click
          if (window.CBSEArchive.Selection) {
            window.CBSEArchive.Selection.toggle(paper.id, e.shiftKey);
          }
        });
      }

      // Card click event triggers checkbox toggle
      div.addEventListener('click', (e) => {
        if (!paper.available) return;
        if (e.target.tagName === 'A' || e.target.closest('a')) return;
        
        const checkbox = div.querySelector('input[type="checkbox"]');
        if (checkbox) {
          checkbox.click();
        }
      });

      return div;
    }
  };

  window.CBSEArchive.Renderer = Renderer;
})();
// CSS rules for QP vs MS tags inside card tag list
const qpMsStyles = document.createElement('style');
qpMsStyles.innerHTML = `
  .tag-type.tag-qp { color: #818cf8; background: rgba(99, 102, 241, 0.1); border-color: rgba(99, 102, 241, 0.2); }
  .tag-type.tag-ms { color: #f472b6; background: rgba(244, 114, 182, 0.1); border-color: rgba(244, 114, 182, 0.2); }
`;
document.head.appendChild(qpMsStyles);
