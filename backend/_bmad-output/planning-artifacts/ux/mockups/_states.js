// State selector for the key-screen mocks. Each [data-state] block is one page
// state from the spec's "Page States" table; the toolbar shows one at a time.
// The chosen state is kept in the URL hash (#state=error) so a link reopens it.
// A block shared by several states lists the extra ones in data-also="a b".
(function () {
  var blocks = Array.prototype.slice.call(document.querySelectorAll("[data-state], [data-also]"));
  var bar = document.querySelector(".mock-bar .states");
  if (!blocks.length || !bar) return;

  var names = [];
  blocks.forEach(function (b) {
    if (b.dataset.state && names.indexOf(b.dataset.state) < 0) names.push(b.dataset.state);
  });

  // A block marked data-default opens first; otherwise the first state in the page does.
  var def = document.querySelector("[data-state][data-default]");
  if (def) { names.splice(names.indexOf(def.dataset.state), 1); names.unshift(def.dataset.state); }

  function inState(b, name) {
    return b.dataset.state === name || (b.dataset.also || "").split(/\s+/).indexOf(name) >= 0;
  }

  function show(name) {
    if (names.indexOf(name) < 0) name = names[0];
    blocks.forEach(function (b) { b.hidden = !inState(b, name); });
    Array.prototype.forEach.call(bar.querySelectorAll("button"), function (btn) {
      btn.setAttribute("aria-pressed", String(btn.dataset.show === name));
    });
    try { history.replaceState(null, "", "#state=" + name); } catch (e) { /* file:// */ }
  }

  names.forEach(function (n) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.show = n;
    btn.textContent = (document.querySelector('[data-state="' + n + '"]').dataset.label) || n;
    btn.addEventListener("click", function () { show(n); });
    bar.appendChild(btn);
  });

  var m = /state=([\w-]+)/.exec(location.hash);
  show(m ? m[1] : names[0]);
})();
