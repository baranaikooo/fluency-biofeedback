/* Native form values remain compatible; all visible pickers are in-app, themed dialogs. */
(() => {
  "use strict";
  const controls = new Set();
  let active = null;
  let serial = 0;
  const picker = document.createElement("dialog");
  picker.id = "glideChoiceDialog";
  picker.className = "glide-choice-dialog";
  picker.setAttribute("aria-labelledby", "glideChoiceTitle");
  picker.innerHTML =
    '<div class="glide-choice-heading"><h2 id="glideChoiceTitle"></h2><button type="button" id="glideChoiceClose" aria-label="Zavrieť výber">✕</button></div><div id="glideChoiceList" role="listbox" aria-labelledby="glideChoiceTitle"></div>';
  document.body.append(picker);
  const list = picker.querySelector("#glideChoiceList");
  function labelFor(select) {
    const label = select.labels?.[0]?.cloneNode(true);
    if (label) {
      label.querySelectorAll("select,button").forEach((e) => e.remove());
      if (label.textContent.trim()) return label.textContent.trim();
    }
    return select.getAttribute("aria-label") || select.title || "Vyber možnosť";
  }
  function sync(state) {
    const option = state.select.selectedOptions[0];
    const text = option?.textContent?.trim() || "Vyber možnosť";
    if (state.caption.textContent !== text) state.caption.textContent = text;
    state.trigger.setAttribute("aria-label", state.label + ": " + text);
    state.trigger.disabled = state.select.disabled;
  }
  function close() {
    if (picker.open) picker.close();
  }
  function open(state) {
    if (state.select.disabled) return;
    active = state;
    sync(state);
    list.replaceChildren();
    picker.querySelector("h2").textContent = state.label;
    for (const option of state.select.options) {
      if (option.hidden) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "glide-choice-option";
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(option.selected));
      button.disabled = option.disabled || !!option.closest("optgroup")?.disabled;
      const text = document.createElement("span");
      text.textContent = option.textContent;
      const mark = document.createElement("span");
      mark.className = "glide-choice-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = option.selected ? "✓" : "";
      button.append(text, mark);
      button.onclick = () => {
        state.select.value = option.value;
        state.select.dispatchEvent(new Event("input", { bubbles: true }));
        state.select.dispatchEvent(new Event("change", { bubbles: true }));
        sync(state);
        close();
      };
      list.append(button);
    }
    state.trigger.setAttribute("aria-expanded", "true");
    picker.showModal();
    const selected =
      list.querySelector('[aria-selected="true"]:not(:disabled)') ||
      list.querySelector("button:not(:disabled)");
    selected?.focus({ preventScroll: true });
  }
  picker.querySelector("#glideChoiceClose").onclick = close;
  picker.addEventListener("close", () => {
    if (active) {
      active.trigger.setAttribute("aria-expanded", "false");
      if (active.trigger.isConnected) active.trigger.focus({ preventScroll: true });
    }
    active = null;
  });
  picker.addEventListener("click", (event) => {
    if (event.target === picker) close();
  });
  list.addEventListener("keydown", (event) => {
    const options = [...list.querySelectorAll("button:not(:disabled)")];
    const index = options.indexOf(document.activeElement);
    let next;
    if (event.key === "ArrowDown") next = (index + 1) % options.length;
    else if (event.key === "ArrowUp") next = (index - 1 + options.length) % options.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options.length - 1;
    else return;
    event.preventDefault();
    options[next]?.focus();
  });
  function enhance() {
    for (const state of controls) {
      if (!state.select.isConnected) {
        state.wrapper.remove();
        controls.delete(state);
      }
    }
    for (const select of document.querySelectorAll("select:not([data-glide-select])")) {
      const label = labelFor(select);
      select.dataset.glideSelect = "true";
      select.hidden = true;
      select.setAttribute("aria-hidden", "true");
      select.tabIndex = -1;
      const wrapper = document.createElement("span");
      wrapper.className = "glide-select";
      const trigger = document.createElement("button");
      trigger.id = select.id ? select.id + "Trigger" : "glideSelect" + ++serial;
      trigger.type = "button";
      trigger.className = "glide-select-trigger";
      trigger.setAttribute("role", "combobox");
      trigger.setAttribute("aria-haspopup", "dialog");
      trigger.setAttribute("aria-controls", "glideChoiceDialog");
      trigger.setAttribute("aria-expanded", "false");
      const caption = document.createElement("span");
      caption.className = "glide-select-caption";
      const chevron = document.createElement("span");
      chevron.className = "glide-select-chevron";
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = "⌄";
      trigger.append(caption, chevron);
      wrapper.append(trigger);
      select.after(wrapper);
      const state = { select, wrapper, trigger, caption, label };
      controls.add(state);
      for (const label of select.labels || [])
        label.addEventListener("click", (event) => {
          if (event.target.closest("button,input,textarea,a,select")) return;
          event.preventDefault();
          if (!picker.open) open(state);
        });
      select.addEventListener("click", (event) => {
        event.preventDefault();
        if (!picker.open) open(state);
      });
      sync(state);
      trigger.onclick = (event) => {
        event.preventDefault();
        open(state);
      };
      trigger.onkeydown = (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          open(state);
        }
      };
      select.addEventListener("change", () => sync(state));
      select.addEventListener("invalid", (event) => {
        event.preventDefault();
        trigger.focus();
        trigger.setAttribute("aria-invalid", "true");
      });
      const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
      Object.defineProperty(select, "value", {
        configurable: true,
        get() {
          return descriptor.get.call(this);
        },
        set(value) {
          descriptor.set.call(this, value);
          sync(state);
        },
      });
    }
  }
  function refresh() {
    enhance();
    controls.forEach(sync);
  }
  document.addEventListener("reset", () => queueMicrotask(refresh), true);
  new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
  refresh();
  window.GlideSelect = { refresh };
})();
