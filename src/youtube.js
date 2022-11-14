/**
 * gv_youtube
 *
 * A lightweight youtube embed. Still should feel the same to the user, just MUCH faster to initialize and paint.
 * Forked by GV from https://github.com/justinribeiro/lite-youtube
 * Changed to data-attributes from custom attributes for consistency with other GV scripts
 * Added data-thumbnail = "..." instead of style="background: url("...")"
 * Simplified the label logic to always have a visually hidden play label
 */

class GreenYtEmbed extends HTMLElement {
    connectedCallback() {
        // Set the thumbnail URL if it is given, otherwise use youtube's thumbnail
        if (this.hasAttribute('data-thumbnail')) {
            this.style.backgroundImage = `url("${this.dataset.thumbnail}")`;
        } else {
            this.style.backgroundImage = `url("https://i.ytimg.com/vi/${this.dataset.id}/hqdefault.jpg")`;
        }

        // Set up play button, and the youtube button SVG and the visually hidden label
        let playBtnEl = document.createElement('button');
        playBtnEl.type = 'button';
        playBtnEl.classList.add('gyt-playbtn');
        playBtnEl.insertAdjacentHTML(
            'beforeend',
            '<svg viewBox="0 0 68 48"><path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="red"/><path d="M45 24 27 14v20" fill="white"/></svg>'
        );
        this.append(playBtnEl);

        let playBtnLabelEl = document.createElement('span');
        playBtnLabelEl.className = 'hide-visually';
        playBtnLabelEl.textContent = 'Play';
        playBtnEl.append(playBtnLabelEl);

        // On hover (or tap), warm up the TCP connections we're (likely) about to use.
        this.addEventListener('pointerover', GreenYtEmbed.warmConnections, {
            once: true,
        });

        // Once the user clicks, add the real iframe and drop our play button
        // TODO: In the future we could be like amp-youtube and silently swap in the iframe during idle time
        //   We'd want to only do this for in-viewport or near-viewport ones: https://github.com/ampproject/amphtml/pull/5003
        this.addEventListener('click', this.addIframe);

        // Chrome & Edge desktop have no problem with the basic YouTube Embed with ?autoplay=1
        // However Safari desktop and most/all mobile browsers do not successfully track the user gesture of clicking through the creation/loading of the iframe,
        // so they don't autoplay automatically. Instead we must load an additional 2 sequential JS files (1KB + 165KB) (un-br) for the YT Player API
        // TODO: Try loading the the YT API in parallel with our iframe and then attaching/playing it. #82
        this.needsYTApiForAutoplay =
            navigator.vendor.includes('Apple') ||
            navigator.userAgent.includes('Mobi');
    }

    /**
     * Add a <link rel={preload | preconnect} ...> to the head
     */
    static addPrefetch(kind, url, as) {
        const linkEl = document.createElement('link');
        linkEl.rel = kind;
        linkEl.href = url;
        if (as) {
            linkEl.as = as;
        }
        document.head.append(linkEl);
    }

    /**
     * Begin pre-connecting to warm up the iframe load
     * Since the embed's network requests load within its iframe,
     *   preload/prefetch'ing them outside the iframe will only cause double-downloads.
     * So, the best we can do is warm up a few connections to origins that are in the critical path.
     */
    static warmConnections() {
        if (GreenYtEmbed.preconnected) return;

        // The iframe document and most of its subresources come right off youtube.com
        GreenYtEmbed.addPrefetch(
            'preconnect',
            'https://www.youtube-nocookie.com'
        );
        // The botguard script is fetched off from google.com
        GreenYtEmbed.addPrefetch('preconnect', 'https://www.google.com');

        // Not certain if these ad related domains are in the critical path. Could verify with domain-specific throttling.
        GreenYtEmbed.addPrefetch(
            'preconnect',
            'https://googleads.g.doubleclick.net'
        );
        GreenYtEmbed.addPrefetch(
            'preconnect',
            'https://static.doubleclick.net'
        );

        GreenYtEmbed.preconnected = true;
    }

    fetchYTPlayerApi() {
        if (window.YT || (window.YT && window.YT.Player)) return;

        this.ytApiPromise = new Promise((res, rej) => {
            var el = document.createElement('script');
            el.src = 'https://www.youtube.com/iframe_api';
            el.async = true;
            el.onload = (_) => {
                YT.ready(res);
            };
            el.onerror = rej;
            this.append(el);
        });
    }

    async addYTPlayerIframe(params) {
        this.fetchYTPlayerApi();
        await this.ytApiPromise;

        const videoPlaceholderEl = document.createElement('div');
        this.append(videoPlaceholderEl);

        const paramsObj = Object.fromEntries(params.entries());

        new YT.Player(videoPlaceholderEl, {
            width: '100%',
            videoId: this.dataset.id,
            playerVars: paramsObj,
            events: {
                onReady: (event) => {
                    event.target.playVideo();
                },
            },
        });
    }

    async addIframe() {
        if (this.classList.contains('gyt-activated')) return;
        this.classList.add('gyt-activated');

        const params = new URLSearchParams(this.dataset.params || []);
        params.append('autoplay', '1');
        params.append('playsinline', '1');

        if (this.needsYTApiForAutoplay) {
            return this.addYTPlayerIframe(params);
        }

        const iframeEl = document.createElement('iframe');
        iframeEl.width = 560;
        iframeEl.height = 315;
        iframeEl.title = 'Embedded Youtube video';
        iframeEl.allow =
            'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
        iframeEl.allowFullscreen = true;
        // AFAIK, the encoding here isn't necessary for XSS, but we'll do it only because this is a URL
        // https://stackoverflow.com/q/64959723/89484
        iframeEl.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
            this.dataset.id
        )}?${params.toString()}`;
        this.append(iframeEl);

        // Set focus for a11y
        iframeEl.focus();
    }
}
// Register custom element
customElements.define('green-youtube', GreenYtEmbed);
