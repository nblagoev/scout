'use babel';

let {Disposable, CompositeDisposable} = require('event-kit');

class WindowEventSubscriptions {
  constructor() {
    this.subscriptions = new CompositeDisposable();

    //window.onbeforeunload = () => {  scout.storeState(); scout.unloadScoutWindow(); }
    //this.subscriptions.add(new Disposable(() => window.onbeforeunload = null));

    window.onunload = () => scout.removeScoutWindow();
    this.subscriptions.add(new Disposable(() => window.onunload = null));

    document.addEventListener('keydown', this.onKeydown);

    document.addEventListener('drop', this.onDrop);
    this.subscriptions.add(new Disposable(() => {
      document.removeEventListener('drop', this.onDrop);
    }));

    document.addEventListener('dragover', this.onDragOver);
    this.subscriptions.add(new Disposable(() => {
      document.removeEventListener('dragover', this.onDragOver);
    }));

    document.oncontextmenu = (e) => {
      e.preventDefault();
      //scout.contextMenu.showForEvent(e);
    };
    this.subscriptions.add(new Disposable(() => {
      document.oncontextmenu = null;
    }));
  }

  onKeydown(event) {
    //scout.keymaps.handleKeyboardEvent(event)
    event.stopImmediatePropagation()
  }

  onDrop(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'none';
  }

  unsubscribe() {
    if (this.subscriptions) {
      this.subscriptions.dispose();
    }

    this.subscriptions = null;
  }
}

module.exports = WindowEventSubscriptions;
