export class PlaygroundPage extends HTMLElement {
  connectedCallback() {
    if (this._connected) return;
    this._connected = true;
    const title = this.getAttribute('page-title') || 'SPARQL playground';
    document.title = title;
    this.classList.add('playground-page');
  }
}

customElements.define('playground-page', PlaygroundPage);
