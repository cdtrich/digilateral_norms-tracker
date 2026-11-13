// Header: title, Explore / Methodology tabs, report and download links.
import { h } from "./dom.js";

export function createHeader(ctx) {
  const { copy, store, actions } = ctx;
  const tab = (view) =>
    h(
      "a",
      {
        class: "tab",
        href: view === "explore" ? "./" : "?tab=methodology",
        // Switch the view only: no scrolling, focus stays on the tab.
        onClick: (e) => {
          e.preventDefault();
          store.set({ tab: view });
        },
      },
      copy.tabs[view],
    );
  const tabs = { explore: tab("explore"), methodology: tab("methodology") };
  const report = copy.header.reportUrl
    ? h("a", { href: copy.header.reportUrl, target: "_blank", rel: "noopener" }, copy.header.readReport)
    : h(
        "span",
        { class: "placeholder" },
        `${copy.header.readReport} ${copy.header.reportUrlPlaceholder}`,
      );

  const el = h(
    "header",
    { class: "site-header" },
    h(
      "a",
      {
        class: "site-title",
        href: "./",
        onClick: (e) => {
          e.preventDefault();
          store.set({ tab: "explore" });
        },
      },
      copy.title,
    ),
    h(
      "nav",
      { class: "tabs", "aria-label": "Main" },
      tabs.explore,
      tabs.methodology,
    ),
    h(
      "div",
      { class: "header-links" },
      report,
      h(
        "a",
        {
          href: "?tab=methodology#download",
          onClick: (e) => {
            e.preventDefault();
            actions.goMethodology("download");
          },
        },
        copy.header.downloadData,
      ),
    ),
  );

  return {
    el,
    update(state) {
      for (const [view, a] of Object.entries(tabs)) {
        if (state.tab === view) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      }
    },
  };
}
