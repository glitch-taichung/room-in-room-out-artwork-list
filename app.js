const app = {
    data: {
        artworkList: [],
        artworkDetail: [],
        about: null,
        artists: []
    },
    touchStartX: 0,
    touchEndX: 0,
    
    async init() {
        try {
            await this.fetchData();
            this.renderArtworkList();
            this.renderAbout();
            this.setupRouter();
            
            // Setup swipe events for modal gallery using pointer events (supports mouse drag and touch swipe)
            const modalImgContainer = document.querySelector('.modal-image-container');
            if (modalImgContainer) {
                modalImgContainer.addEventListener('pointerdown', e => {
                    this.touchStartX = e.clientX;
                }, {passive: true});
                modalImgContainer.addEventListener('pointerup', e => {
                    this.touchEndX = e.clientX;
                    this.handleSwipe();
                }, {passive: true});
            }
        } catch (error) {
            console.error("Error initializing app:", error);
        }
    },

    async fetchData() {
        const [listRes, detailRes, aboutRes, artistRes] = await Promise.all([
            fetch('./public/data/artwork-list.json'),
            fetch('./public/data/artwork-detail.json'),
            fetch('./public/data/about.json'),
            fetch('./public/data/artist.json')
        ]);
        
        this.data.artworkList = await listRes.json();
        this.data.artworkDetail = await detailRes.json();
        this.data.artists = await artistRes.json();
        
        const aboutData = await aboutRes.json();
        this.data.about = aboutData[0];
    },

    renderArtworkList(artistFilter = null) {
        const grid = document.getElementById('artwork-grid');
        grid.innerHTML = '';
        
        let filteredList = this.data.artworkList;
        if (artistFilter) {
            filteredList = filteredList.filter(item => item.artist === artistFilter);
        }

        filteredList.forEach(item => {
            const card = document.createElement('div');
            card.className = 'artwork-card';
            card.onclick = () => this.openModal(item.content_id);
            
            card.innerHTML = `
                <div class="artwork-image-wrapper">
                    <img src="./${item.img}" alt="${item.artwork}" loading="lazy">
                </div>
                <div class="artwork-caption">
                    ${item.artist}，&lt;${item.artwork}&gt;，${item.year}
                </div>
            `;
            
            grid.appendChild(card);
        });
    },

    renderAbout() {
        const container = document.getElementById('about-container');
        if (!this.data.about) return;
        
        const info = this.data.about;
        
        // Parse artists and urls
        const artists = info["藝術家"].split(', ');
        const artistUrls = info["藝術家url"].split(', ');
        const artistLinks = artists.map((a, i) => `<a href="${artistUrls[i]}" target="_blank">${a}</a>`).join(', ');

        const zhParas = info["中文論述"].split('\n\n');
        const zhHtml = zhParas.map((p, i) => {
            if (i === 0) return p;
            if (i < 3) return `\n\n${p}`;
            return `<span class="zh-extra-para mobile-hidden">\n\n${p}</span>`;
        }).join('');

        container.innerHTML = `
            <div class="about-left-col">
                <div class="about-text-content">
                    <div class="about-desc-zh">${zhHtml}</div>
                    <div class="about-desc-en hidden" id="about-desc-en">${info["英文論述"]}</div>
                    <button class="about-read-more-btn" id="about-read-more-btn" onclick="app.toggleAboutDesc()">Read More</button>
                    <h1 class="about-title roboto" style="margin-top: 40px;">${info["標題"]}</h1>
                    <div class="about-info-block" style="margin-top: 0px;">
                        <div class="info-item">
                            <span class="info-label">Curator</span>
                            <span class="info-value"><a href="${info["策展人url"]}" target="_blank">${info["策展人"]}</a></span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Artists</span>
                            <span class="info-value">${artistLinks}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Exhibition Dates</span>
                            <span class="info-value">${info["展覽資訊"]["展期"]}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Opening Hours</span>
                            <span class="info-value">${info["展覽資訊"]["時間"]}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Venue</span>
                            <span class="info-value"><a href="${info["展覽資訊"]["地點url"]}" target="_blank">${info["展覽資訊"]["地點"]}</a></span>
                        </div>
                        ${(info["展覽資訊"]["note"] || info["note"]) ? `
                        <div class="info-item" style="margin-top: 35px;">
                            <span class="info-value">${info["展覽資訊"]["note"] || info["note"]}</span>
                        </div>` : ''}
                    </div>
                </div>
            </div>
            <div class="about-right-col">
                <img src="${info["主視覺"]}" alt="${info["標題"]}" class="about-visual">
                <div class="artist-profiles-grid">
                    ${(this.data.artists || []).map((artist, index) => `
                        <div class="artist-profile-card" onclick="app.openArtistModal(${index})">
                            <img src="./${artist.圖片}" alt="${artist.藝術家}" loading="lazy">
                            <div class="artist-profile-name">${artist.藝術家}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    openArtistModal(index) {
        const artist = this.data.artists[index];
        if (!artist) return;

        const modal = document.getElementById('artwork-modal');
        const infoContainer = document.getElementById('modal-info');
        
        let infoHtml = `
            <div class="modal-info-value title" style="margin-bottom: 2em;">${artist.藝術家}</div>
        `;
        
        const keysToRender = ['簡介', '學歷', '經歷'];
        
        keysToRender.forEach(key => {
            if (artist[key]) {
                infoHtml += `
                    <div class="modal-info-item" style="margin-bottom: 2em;">
                        <span class="modal-info-value" style="white-space: pre-wrap;">${artist[key]}</span>
                    </div>
                `;
            }
        });

        infoContainer.innerHTML = infoHtml;
        
        this.currentModalImages = [artist.圖片];
        this.currentModalImageIndex = 0;
        this.currentArtworkTitle = artist.藝術家;
        this.currentArtworkImageCaption = null;
        this.renderModalGallery();

        modal.classList.add('artist-mode');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    toggleAboutDesc() {
        const descEn = document.getElementById('about-desc-en');
        const btn = document.getElementById('about-read-more-btn');
        const extraZh = document.querySelectorAll('.zh-extra-para');
        if (!descEn || !btn) return;

        if (descEn.classList.contains('hidden')) {
            descEn.classList.remove('hidden');
            extraZh.forEach(el => el.classList.remove('mobile-hidden'));
            btn.textContent = 'Read Less';
        } else {
            descEn.classList.add('hidden');
            extraZh.forEach(el => el.classList.add('mobile-hidden'));
            btn.textContent = 'Read More';
        }
    },

    openModal(contentId) {
        const detail = this.data.artworkDetail.find(d => d.content_id === contentId);
        if (!detail) return;

        const modal = document.getElementById('artwork-modal');
        const modalInfo = document.getElementById('modal-info');
        const modalImageContainer = document.querySelector('.modal-image-container');

        // Parse images array
        if (Array.isArray(detail.img)) {
            this.currentModalImages = detail.img.map(s => String(s).trim()).filter(Boolean);
        } else if (typeof detail.img === 'string') {
            this.currentModalImages = [detail.img.trim()];
        } else {
            this.currentModalImages = [];
        }

        this.currentModalImageIndex = 0;
        this.currentArtworkTitle = detail.artwork;
        this.currentArtworkImageCaption = detail.image_caption || null;
        this.renderModalGallery();

        let formattedTitle = detail.artwork.replace(/(（共\d+件）)/g, '<span style="font-size: 0.5em; vertical-align: middle;">$1</span>');

        modalInfo.innerHTML = `
            <div class="modal-info-value title">${formattedTitle}</div>
            
            <div class="modal-info-item">
                <span class="modal-info-label">Artist</span>
                <span class="modal-info-value">${detail.artist}</span>
            </div>
            <div class="modal-info-item">
                <span class="modal-info-label">Year</span>
                <span class="modal-info-value">${detail.year}</span>
            </div>
            <div class="modal-info-item">
                <span class="modal-info-label">Medium</span>
                <span class="modal-info-value">${detail.medium}</span>
            </div>
            <div class="modal-info-item">
                <span class="modal-info-label">Dimensions</span>
                <span class="modal-info-value">${detail.size}</span>
            </div>
            <div class="modal-info-item">
                <span class="modal-info-label">Price</span>
                <span class="modal-info-value price">${detail.price}</span>
            </div>
            
            <div class="modal-info-item" style="margin-top: 15px;">
                <span class="modal-info-label">${detail.notes ? "*含壓克力保護框，購藏請洽毛刺Glitch" : "*購藏請洽毛刺Glitch"}</span>
            </div>
        `;

        modal.classList.remove('artist-mode');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    renderModalGallery() {
        const container = document.querySelector('.modal-image-container');
        if (!container) return;

        const images = this.currentModalImages || [];
        const currentIndex = this.currentModalImageIndex || 0;
        const title = this.currentArtworkTitle || 'Artwork';

        if (images.length === 0) {
            container.innerHTML = '';
            return;
        }

        let navHtml = '';
        if (images.length > 1) {
            navHtml = `
                <div class="gallery-nav">
                    <button class="gallery-arrow gallery-prev" onclick="app.prevModalImage(event)" aria-label="Previous Image">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <div class="gallery-counter">${currentIndex + 1} / ${images.length}</div>
                    <button class="gallery-arrow gallery-next" onclick="app.nextModalImage(event)" aria-label="Next Image">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                </div>
            `;
        }
        
        let captionHtml = '';
        if (this.currentArtworkImageCaption) {
            captionHtml = `<div class="gallery-caption">${this.currentArtworkImageCaption}</div>`;
        }

        container.innerHTML = `
            <div class="gallery-wrapper">
                <img src="./${images[currentIndex]}" alt="${title}">
                ${navHtml}
                ${captionHtml}
            </div>
        `;
    },

    prevModalImage(e) {
        if (e) e.stopPropagation();
        if (!this.currentModalImages || this.currentModalImages.length <= 1) return;
        this.currentModalImageIndex = (this.currentModalImageIndex - 1 + this.currentModalImages.length) % this.currentModalImages.length;
        this.renderModalGallery();
    },

    nextModalImage(e) {
        if (e) e.stopPropagation();
        if (!this.currentModalImages || this.currentModalImages.length <= 1) return;
        this.currentModalImageIndex = (this.currentModalImageIndex + 1) % this.currentModalImages.length;
        this.renderModalGallery();
    },

    handleSwipe() {
        if (!this.currentModalImages || this.currentModalImages.length <= 1) return;
        const threshold = 50; // pixels to consider it a swipe
        const diff = this.touchEndX - this.touchStartX;
        
        if (diff > threshold) {
            // Swiped right -> previous image
            this.prevModalImage();
        } else if (diff < -threshold) {
            // Swiped left -> next image
            this.nextModalImage();
        }
    },

    closeModal() {
        const modal = document.getElementById('artwork-modal');
        modal.classList.remove('active');
        setTimeout(() => modal.classList.remove('artist-mode'), 400); // Remove after animation
        document.body.style.overflow = '';
    },

    // Navigation and Interactions
    toggleDropdown(e) {
        e.preventDefault();
        e.stopPropagation();
        const dropdown = document.getElementById('artist-dropdown');
        const arrow = document.getElementById('dropdown-arrow');
        
        dropdown.classList.toggle('show');
        arrow.classList.toggle('rotated');
    },

    filterArtist(e, artist) {
        e.preventDefault();
        e.stopPropagation();
        
        // Remove active from all nav items
        document.querySelectorAll('#nav-list a').forEach(el => el.classList.remove('active'));
        // Add active to clicked artist
        e.target.classList.add('active');
        
        this.renderArtworkList(artist);
        this.switchView('artwork-view');
    },

    goHome(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        // Remove active from all
        document.querySelectorAll('#nav-list a').forEach(el => el.classList.remove('active'));
        document.getElementById('nav-artwork-list').classList.add('active');
        
        this.renderArtworkList(null);
        this.switchView('artwork-view');
    },

    showAbout(e) {
        e.preventDefault();
        this.switchView('about-view');
        
        // Update nav active states
        document.querySelectorAll('#nav-list a').forEach(el => el.classList.remove('active'));
        document.getElementById('nav-about').classList.add('active');
    },
    
    switchView(viewId) {
        document.querySelectorAll('.view').forEach(el => {
            el.classList.remove('active');
            setTimeout(() => { if(!el.classList.contains('active')) el.style.display = 'none'; }, 400); // Wait for transition
        });
        
        const activeView = document.getElementById(viewId);
        activeView.style.display = 'block';
        setTimeout(() => activeView.classList.add('active'), 50);
        
        this.closeModal();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    setupRouter() {
        // Handle escape key for modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });

        // Hide logo on scroll for mobile
        window.addEventListener('scroll', () => {
            if (window.innerWidth <= 900) {
                document.body.classList.toggle('is-scrolled', window.scrollY > 50);
            }
        });
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();

    // Prevent context menu (right-click) on image containers to disable image downloading/copying
    document.addEventListener('contextmenu', function(e) {
        if (e.target.tagName === 'IMG' || 
            e.target.closest('.artwork-card') || 
            e.target.closest('.modal-image-container') || 
            e.target.closest('.about-visual')) {
            e.preventDefault();
        }
    });
});
