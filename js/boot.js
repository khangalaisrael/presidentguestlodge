// Runs in <head> before the page draws, so there is no flash:
// marks JavaScript as available and picks the page from the URL hash.
(function () {
  var root = document.documentElement;
  var pages = ['home', 'rooms', 'facilities', 'gallery'];
  var hash = location.hash.slice(1);
  if (hash === 'boardroom' || hash === 'dining') hash = 'facilities'; // old links
  root.classList.add('js');
  root.dataset.page = pages.indexOf(hash) > -1 ? hash : 'home';
})();
