import React, { useEffect, useMemo, useState } from "react";

const hostedDownloadLinks = {
  windows:
    "https://7aakdg0aolddhlmb.public.blob.vercel-storage.com/downloads/CinchPOS-Setup.exe?v=1.0.3",
  mac: "https://7aakdg0aolddhlmb.public.blob.vercel-storage.com/downloads/CinchPOS.dmg?v=1.0.3"
};

const downloadLinks = {
  windows: import.meta.env.VITE_WINDOWS_DOWNLOAD_URL || hostedDownloadLinks.windows,
  mac: import.meta.env.VITE_MAC_DOWNLOAD_URL || hostedDownloadLinks.mac
};

const publicApiBaseUrl = (import.meta.env.VITE_CINCHPOS_PUBLIC_API_URL || "http://localhost:5001").replace(/\/+$/, "");

const tabs = [
  { id: "download", label: "Download" },
  { id: "pricing", label: "Pricing" },
  { id: "features", label: "Features" },
  { id: "about", label: "About" }
];

const latestBuild = {
  label: "July 16, 2026 build",
  title: "CinchPOS 1.0.3 desktop release",
  summary:
    "This web deploy points customers to CinchPOS 1.0.3 with the latest sales report download, trend graph, account privacy, receipt printing, billing, inventory, and invoice improvements.",
  highlights: [
    "Shop installations are prompted when a newer desktop update is available",
    "Sales Report includes a downloadable report and corrected daily, weekly, monthly, and custom sales data",
    "Account sessions and login attempts are protected with stronger local privacy controls",
    "Long thermal bills print at readable receipt width instead of shrinking",
    "CinchPOS bill item rows use the corrected MRP, discount, SP, GST, and amount layout",
    "Inventory and dashboard layouts stay usable on smaller store computers",
    "Invoice status can be updated from the invoice list",
    "Owner-restricted invoice delete support is included",
    "Sales trend hover details and stock-value revenue are included",
    "Updated Mac DMG/PKG and Windows installer/portable packages"
  ]
};

const baseModules = [
  "Dashboard",
  "CinchPOS Billing",
  "Invoices",
  "Customer Info",
  "Inventory",
  "Purchase",
  "Expenses",
  "Sales Report",
  "Manage Employee",
  "Your Bank",
  "Store Documents",
  "Retrieve Data",
  "Sell Online",
  "Print Settings"
];

const featureCards = [
  {
    title: "Fast POS billing",
    body: "Customer phone lookup, optional walk-in billing, item search, GST-ready bill preview, compact thermal printing, and save or print actions.",
    tags: ["Free core", "Counter-ready", "Print-ready"]
  },
  {
    title: "Inventory + purchase flow",
    body: "Track stock, barcodes, HSN/SAC, MRP, inclusive selling price, GST breakup, supplier purchases, and purchase bills.",
    tags: ["Stock", "Supplier", "Documents"]
  },
  {
    title: "Business records",
    body: "Keep customers, invoices, expenses, bank details, store documents, retrieve-data tools, and sell-online planning inside the same workspace.",
    tags: ["Invoices", "Bank", "Retrieve data"]
  },
  {
    title: "Print and invoice control",
    body: "Use thermal bills for counters, standard bill previews for invoice-style work, and calibration settings before sending anything to the printer.",
    tags: ["Thermal", "Standard bill", "Calibration"]
  }
];

const addOns = [
  {
    id: "cloud",
    name: "Cloud backup + restore",
    price: 399,
    status: "Roadmap",
    summary: "Safer backup, restore, and recovery path for stores that cannot risk local-only data."
  },
  {
    id: "analytics",
    name: "Advanced analytics",
    price: 599,
    status: "Optional",
    summary: "Deeper sales, product, collections, and monthly performance reports."
  },
  {
    id: "employee",
    name: "Employee permissions",
    price: 349,
    status: "Optional",
    summary: "Role-based control for cashiers, managers, and owners."
  },
  {
    id: "whatsapp",
    name: "WhatsApp reminders",
    price: 499,
    status: "Roadmap",
    summary: "Bill sharing, payment reminders, and customer follow-up automation."
  },
  {
    id: "multiOutlet",
    name: "Multi-outlet reporting",
    price: 799,
    status: "Roadmap",
    summary: "Branch-level visibility for owners running multiple counters or outlets."
  },
  {
    id: "onboarding",
    name: "Priority onboarding",
    price: 999,
    status: "Service",
    summary: "Setup assistance, migration support, and launch guidance for teams."
  }
];

const businessProfiles = [
  {
    label: "Retail store",
    value: "retail",
    recommended: ["analytics", "employee"]
  },
  {
    label: "Cafe or restaurant",
    value: "restaurant",
    recommended: ["employee", "whatsapp", "analytics"]
  },
  {
    label: "Wholesale business",
    value: "wholesale",
    recommended: ["analytics", "cloud", "onboarding"]
  },
  {
    label: "Multi-outlet chain",
    value: "chain",
    recommended: ["multiOutlet", "cloud", "analytics", "employee"]
  }
];

function detectPlatform() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  if (userAgent.includes("mac")) return "mac";
  if (userAgent.includes("win")) return "windows";
  return "windows";
}

function currency(value) {
  const amount = Number(value);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `Rs ${safeAmount.toLocaleString("en-IN", {
    minimumFractionDigits: safeAmount % 1 ? 2 : 0,
    maximumFractionDigits: 2
  })}`;
}

function App() {
  const onlineStoreSlug = parseOnlineStoreSlug();
  if (onlineStoreSlug) {
    return <OnlineStorePage storeSlug={onlineStoreSlug} />;
  }

  return <MarketingApp />;
}

function parseOnlineStoreSlug() {
  const path = window.location.pathname.replace(/\/+$/, "");
  const match = path.match(/^\/([^/]+)\/online(?:-|%20| )store$/i);
  return match ? decodeURIComponent(match[1]) : "";
}

function publicApiPath(path) {
  return `${publicApiBaseUrl}${path}`;
}

async function fetchPublicJSON(path, options = {}) {
  const response = await fetch(publicApiPath(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    cache: "no-store"
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(payload.error || "Something went wrong. Please try again.");
  }
  return payload;
}

function escapeInvoiceHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildOnlineInvoiceHTML(store, order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const rows = items
    .map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>
          <strong>${escapeInvoiceHTML(item.name)}</strong>
          <small>${escapeInvoiceHTML(item.barcode || "")}</small>
        </td>
        <td>${escapeInvoiceHTML(item.quantity)} ${escapeInvoiceHTML(item.unit || "Pcs")}</td>
        <td>${currency(item.mrp)}</td>
        <td>${currency(item.price)}</td>
        <td>${currency(item.taxable)}</td>
        <td>${currency(item.gst_amount)}</td>
        <td>${currency(item.total)}</td>
      </tr>
    `)
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeInvoiceHTML(order?.invoice_number || "CinchPOS Invoice")}</title>
  <style>
    body { color: #0b1210; font-family: Arial, sans-serif; margin: 32px; }
    .invoice { border: 1px solid #cbd8d0; margin: 0 auto; max-width: 900px; padding: 28px; }
    .header { align-items: flex-start; border-bottom: 1px solid #cbd8d0; display: flex; gap: 16px; justify-content: space-between; padding-bottom: 18px; }
    .brand { align-items: center; display: flex; gap: 14px; }
    .brand img { border-radius: 10px; height: 54px; object-fit: cover; width: 54px; }
    h1, h2, p { margin: 0; }
    h1 { font-size: 24px; }
    .muted { color: #5f7368; font-size: 13px; line-height: 1.5; }
    .grid { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; margin: 24px 0; }
    .box { border: 1px solid #d7e3db; border-radius: 10px; padding: 14px; }
    table { border-collapse: collapse; margin-top: 18px; width: 100%; }
    th, td { border-bottom: 1px solid #d7e3db; font-size: 13px; padding: 10px 8px; text-align: left; vertical-align: top; }
    th { background: #e6f4ea; }
    small { color: #5f7368; display: block; margin-top: 4px; }
    .totals { margin-left: auto; margin-top: 22px; max-width: 320px; }
    .totals div { display: flex; justify-content: space-between; padding: 7px 0; }
    .total { border-top: 2px solid #0f3d2e; font-size: 18px; font-weight: 800; }
  </style>
</head>
<body>
  <main class="invoice">
    <section class="header">
      <div class="brand">
        <img src="${escapeInvoiceHTML(store?.logo_url || "/assets/logo-cinchpos-mark.png")}" alt="" />
        <div>
          <h1>${escapeInvoiceHTML(store?.store_name || "CinchPOS Store")}</h1>
          <p class="muted">${escapeInvoiceHTML(store?.address || "")}</p>
          <p class="muted">${escapeInvoiceHTML(store?.contact_phone || "")} ${escapeInvoiceHTML(store?.contact_email || "")}</p>
        </div>
      </div>
      <div>
        <h2>Invoice</h2>
        <p class="muted">${escapeInvoiceHTML(order?.invoice_number || "")}</p>
      </div>
    </section>
    <section class="grid">
      <div class="box">
        <strong>Bill To</strong>
        <p>${escapeInvoiceHTML(order?.customer_name || "")}</p>
        <p class="muted">${escapeInvoiceHTML(order?.customer_phone || "")}</p>
        <p class="muted">${escapeInvoiceHTML(order?.customer_email || "")}</p>
        <p class="muted">${escapeInvoiceHTML(order?.customer_address || "")}</p>
      </div>
      <div class="box">
        <strong>Order Details</strong>
        <p class="muted">Status: ${escapeInvoiceHTML(order?.status || "Placed")}</p>
        <p class="muted">Payment: ${escapeInvoiceHTML(order?.payment_status || "Unpaid")}</p>
        <p class="muted">Date: ${escapeInvoiceHTML(order?.created_at || "")}</p>
      </div>
    </section>
    <table>
      <thead>
        <tr>
          <th>Sr.</th>
          <th>Item(s)</th>
          <th>Qty</th>
          <th>MRP</th>
          <th>SP</th>
          <th>Rate</th>
          <th>GST</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <section class="totals">
      <div><span>Total Rate</span><strong>${currency(order?.subtotal)}</strong></div>
      <div><span>Total GST</span><strong>${currency(order?.gst_total)}</strong></div>
      <div><span>Total Discount</span><strong>${currency(order?.discount_total)}</strong></div>
      <div class="total"><span>Total Amount</span><strong>${currency(order?.total)}</strong></div>
    </section>
  </main>
</body>
</html>`;
}

function downloadOnlineInvoice(store, order) {
  const invoiceHTML = buildOnlineInvoiceHTML(store, order);
  const blob = new Blob([invoiceHTML], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${order.invoice_number || "cinchpos-online-invoice"}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function MarketingApp() {
  const [activeTab, setActiveTab] = useState("download");
  const [platform, setPlatform] = useState("windows");
  const [theme, setTheme] = useState(() => localStorage.getItem("cinchpos-theme") || "system");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [advisorProfile, setAdvisorProfile] = useState("retail");
  const [advisorOutlets, setAdvisorOutlets] = useState("1");

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.classList.toggle("dark", resolved === "dark");
      localStorage.setItem("cinchpos-theme", theme);
    };

    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  const recommendedDownload = platform === "mac"
    ? {
        os: "macOS",
        fileName: "CinchPOS.dmg",
        url: downloadLinks.mac,
        description: "Best for Mac desktops and admin laptops."
      }
    : {
        os: "Windows",
        fileName: "CinchPOS-Setup.exe",
        url: downloadLinks.windows,
        description: "Best for billing counters, shop desktops, and POS systems."
      };

  const selectedTotal = useMemo(() => {
    const monthly = addOns
      .filter((item) => selectedAddOns.includes(item.id))
      .reduce((sum, item) => sum + item.price, 0);
    return billingCycle === "yearly" ? Math.round(monthly * 10) : monthly;
  }, [billingCycle, selectedAddOns]);

  const advisorRecommendation = useMemo(() => {
    const profile = businessProfiles.find((item) => item.value === advisorProfile) || businessProfiles[0];
    const recommended = new Set(profile.recommended);
    if (advisorOutlets !== "1") {
      recommended.add("cloud");
      recommended.add("multiOutlet");
    }
    return addOns.filter((item) => recommended.has(item.id));
  }, [advisorOutlets, advisorProfile]);

  function toggleAddOn(addOnId) {
    setSelectedAddOns((current) =>
      current.includes(addOnId) ? current.filter((id) => id !== addOnId) : [...current, addOnId]
    );
  }

  function applyAdvisorRecommendation() {
    setSelectedAddOns(advisorRecommendation.map((item) => item.id));
    setBillingCycle("monthly");
    setActiveTab("pricing");
    setAdvisorOpen(false);
  }

  return (
    <div className="min-h-screen overflow-hidden bg-grid bg-[length:44px_44px]">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-12%] top-[-20%] h-[460px] w-[460px] rounded-full bg-cinch-mint/30 blur-3xl dark:bg-cinch-emerald/10" />
        <div className="absolute bottom-[-14%] right-[-12%] h-[520px] w-[520px] rounded-full bg-cinch-blue/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-cinch-muted/20 bg-cinch-soft/80 px-4 py-3 backdrop-blur-2xl dark:bg-cinch-black/75">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => setActiveTab("download")}>
            <img
              src="/assets/logo-cinchpos-mark.png"
              alt="CinchPOS"
              className="h-11 w-11 rounded-2xl object-cover ring-1 ring-cinch-muted/30"
            />
            <span className="min-w-0">
              <strong className="block font-display text-lg tracking-[-0.04em]">CinchPOS</strong>
              <small className="block truncate text-xs font-bold text-cinch-muted dark:text-cinch-slate">
                Desktop billing download
              </small>
            </span>
          </button>

          <nav className="hidden items-center rounded-full border border-cinch-muted/20 bg-white/50 p-1 backdrop-blur-xl dark:bg-cinch-panel/70 lg:flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? "tab-button-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <select
              className="hidden rounded-2xl border border-cinch-muted/20 bg-white/70 px-3 py-2 text-xs font-extrabold text-cinch-forest outline-none dark:bg-cinch-panel dark:text-cinch-soft sm:block"
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
              aria-label="Theme preference"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <a className="primary-button px-4 py-2" href={recommendedDownload.url} download={recommendedDownload.fileName}>
              Download
            </a>
          </div>
        </div>

        <nav className="mx-auto mt-3 flex max-w-7xl gap-2 overflow-auto pb-1 lg:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button shrink-0 ${activeTab === tab.id ? "tab-button-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <Hero
          recommendedDownload={recommendedDownload}
          setActiveTab={setActiveTab}
          openAdvisor={() => setAdvisorOpen(true)}
        />

        <section className="mt-8 fade-up">
          {activeTab === "download" && <DownloadTab recommendedDownload={recommendedDownload} setActiveTab={setActiveTab} />}
          {activeTab === "pricing" && (
            <PricingTab
              billingCycle={billingCycle}
              selectedAddOns={selectedAddOns}
              selectedTotal={selectedTotal}
              setBillingCycle={setBillingCycle}
              toggleAddOn={toggleAddOn}
              openAdvisor={() => setAdvisorOpen(true)}
            />
          )}
          {activeTab === "features" && <FeaturesTab />}
          {activeTab === "about" && <AboutTab openAdvisor={() => setAdvisorOpen(true)} />}
        </section>
      </main>

      <button
        className="fixed bottom-5 right-5 z-30 hidden rounded-3xl border border-cinch-mint/40 bg-cinch-black px-4 py-3 text-left text-cinch-soft shadow-glow transition hover:-translate-y-1 dark:bg-cinch-panel sm:flex sm:items-center sm:gap-3"
        onClick={() => setAdvisorOpen(true)}
      >
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-cinch-mint font-black text-cinch-black">CP</span>
        <span>
          <strong className="block text-sm">Smart Advisor</strong>
          <small className="block text-xs text-cinch-slate">Avoid unnecessary add-ons</small>
        </span>
      </button>

      {advisorOpen && (
        <AdvisorModal
          advisorOutlets={advisorOutlets}
          advisorProfile={advisorProfile}
          advisorRecommendation={advisorRecommendation}
          applyAdvisorRecommendation={applyAdvisorRecommendation}
          setAdvisorOpen={setAdvisorOpen}
          setAdvisorOutlets={setAdvisorOutlets}
          setAdvisorProfile={setAdvisorProfile}
        />
      )}
    </div>
  );
}

function Hero({ recommendedDownload, setActiveTab, openAdvisor }) {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
      <div className="glass-card rounded-[2rem] p-6 sm:p-8 lg:p-10">
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="chip">Free desktop billing app</span>
          <span className="chip">Optional paid add-ons</span>
          <span className="chip">Print-ready build</span>
          <span className="chip">Vercel-ready frontend</span>
        </div>
        <h1 className="max-w-4xl font-display text-5xl font-bold leading-[0.92] tracking-[-0.08em] sm:text-7xl lg:text-8xl">
          Download CinchPOS Desktop.
        </h1>
        <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-cinch-muted dark:text-cinch-slate sm:text-lg">
          A modern download page for the free CinchPOS billing app, with clear pricing for optional add-ons,
          feature guidance, and a smart advisor that helps customers avoid buying what they do not need.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a className="primary-button" href={recommendedDownload.url} download={recommendedDownload.fileName}>
            Download for {recommendedDownload.os}
          </a>
          <button className="secondary-button" onClick={() => setActiveTab("pricing")}>
            View pricing
          </button>
          <button className="secondary-button" onClick={openAdvisor}>
            Ask smart advisor
          </button>
        </div>
        <div className="mt-6 rounded-[1.5rem] border border-cinch-mint/30 bg-cinch-mint/15 p-5">
          <span className="chip">{latestBuild.label}</span>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-[-0.05em]">{latestBuild.title}</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-cinch-muted dark:text-cinch-slate">
            {latestBuild.summary}
          </p>
        </div>
      </div>

      <div className="glass-card relative overflow-x-auto overflow-y-hidden rounded-[2rem] p-5 sm:p-6">
        <div className="min-w-[620px] rounded-[1.5rem] border border-cinch-muted/20 bg-cinch-black p-4 text-cinch-soft sm:min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-cinch-danger" />
              <span className="h-3 w-3 rounded-full bg-cinch-warning" />
              <span className="h-3 w-3 rounded-full bg-cinch-success" />
            </div>
            <span className="ml-auto rounded-full border border-cinch-mint/30 px-3 py-1 text-xs font-black text-cinch-mint">
              CinchPOS Workspace
            </span>
            <span className="rounded-full bg-cinch-mint px-3 py-1 text-xs font-black text-cinch-black shadow-glow">
              {recommendedDownload.fileName}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-[0.85fr_1fr]">
            <div className="space-y-2">
              {["Dashboard", "Billing", "Inventory", "Purchase", "Bank", "Documents"].map((item, index) => (
                <div
                  key={item}
                  className={`rounded-2xl border px-3 py-2 text-sm font-black ${
                    index === 1
                      ? "border-cinch-mint bg-cinch-mint text-cinch-black"
                      : "border-cinch-muted/40 bg-cinch-charcoal text-cinch-mint"
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-cinch-muted/30 bg-cinch-charcoal p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-cinch-mint">Revenue trend</p>
                  <h3 className="font-display text-2xl font-bold tracking-[-0.05em]">Billing preview</h3>
                </div>
                <span className="rounded-full bg-cinch-mint px-3 py-1 text-xs font-black text-cinch-black">Live</span>
              </div>
              <svg viewBox="0 0 520 210" className="h-48 w-full text-cinch-mint drop-shadow-[0_28px_30px_rgba(166,238,184,0.18)]">
                <defs>
                  <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.38" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M24 166 C95 130 120 142 178 105 C231 70 268 118 319 84 C369 50 412 88 496 36 L496 190 L24 190 Z" fill="url(#lineFill)" />
                <path className="draw-line" d="M24 166 C95 130 120 142 178 105 C231 70 268 118 319 84 C369 50 412 88 496 36" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="11" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DownloadTab({ recommendedDownload }) {
  const downloads = [
    {
      os: "Windows",
      file: "CinchPOS-Setup.exe",
      url: downloadLinks.windows,
      body: "Recommended for shop counters, Windows desktops, and most POS billing setups."
    },
    {
      os: "macOS",
      file: "CinchPOS.dmg",
      url: downloadLinks.mac,
      body: "Recommended for Mac laptops, admin systems, and office billing workflows."
    }
  ];

  return (
    <div className="grid gap-4">
      <section className="glass-card rounded-[1.75rem] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="chip">{latestBuild.label}</span>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-[-0.06em]">
              Download the current desktop build.
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-cinch-muted dark:text-cinch-slate">
              {latestBuild.summary}
            </p>
          </div>
          <a className="secondary-button" href="/deployment.json">
            Deployment marker
          </a>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {latestBuild.highlights.map((item) => (
            <div key={item} className="rounded-[1.25rem] border border-cinch-muted/20 bg-white/50 p-4 text-sm font-bold leading-6 dark:bg-cinch-panel">
              {item}
            </div>
          ))}
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        {downloads.map((item) => (
          <article
            key={item.os}
            className={`glass-card rounded-[1.75rem] p-6 ${
              item.os === recommendedDownload.os ? "ring-2 ring-cinch-mint" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="chip">{item.os}</span>
              <span className="font-display text-3xl font-bold tracking-[-0.06em] text-cinch-forest dark:text-cinch-mint">
                {item.file.endsWith(".exe") ? ".exe" : ".dmg"}
              </span>
            </div>
            <h2 className="mt-6 font-display text-3xl font-bold tracking-[-0.06em]">CinchPOS for {item.os}</h2>
            <p className="mt-3 min-h-20 text-sm font-semibold leading-7 text-cinch-muted dark:text-cinch-slate">
              {item.body}
            </p>
            <a className="primary-button mt-6 w-full" href={item.url} download={item.file}>
              Download {item.file}
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}

function PricingTab({ billingCycle, selectedAddOns, selectedTotal, setBillingCycle, toggleAddOn, openAdvisor }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <section className="glass-card rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="chip">Free core + optional subscription</span>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-[-0.07em] sm:text-5xl">
              Pay only for extra features.
            </h2>
          </div>
          <div className="rounded-full border border-cinch-muted/20 bg-white/60 p-1 dark:bg-cinch-panel">
            {["monthly", "yearly"].map((cycle) => (
              <button
                key={cycle}
                className={`rounded-full px-4 py-2 text-sm font-black capitalize ${
                  billingCycle === cycle ? "bg-cinch-mint text-cinch-black" : "text-cinch-muted dark:text-cinch-slate"
                }`}
                onClick={() => setBillingCycle(cycle)}
              >
                {cycle}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {addOns.map((item) => {
            const selected = selectedAddOns.includes(item.id);
            const displayPrice = billingCycle === "yearly" ? Math.round(item.price * 10) : item.price;
            return (
              <button
                key={item.id}
                className={`rounded-[1.5rem] border p-5 text-left transition hover:-translate-y-1 ${
                  selected
                    ? "border-cinch-mint bg-cinch-mint/25 shadow-glow"
                    : "border-cinch-muted/20 bg-white/50 dark:bg-cinch-charcoal/75"
                }`}
                onClick={() => toggleAddOn(item.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="chip">{item.status}</span>
                  <span className="text-sm font-black text-cinch-forest dark:text-cinch-mint">
                    {currency(displayPrice)}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-xl font-bold tracking-[-0.05em]">{item.name}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-cinch-muted dark:text-cinch-slate">
                  {item.summary}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="glass-card sticky top-28 h-fit rounded-[2rem] p-6">
        <span className="chip">Subscription cart</span>
        <h2 className="mt-4 font-display text-3xl font-bold tracking-[-0.06em]">Free billing app stays free.</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-cinch-muted dark:text-cinch-slate">
          Selected add-ons are charged separately. Use the advisor if the customer is unsure.
        </p>
        <div className="my-6 rounded-[1.5rem] border border-cinch-mint/30 bg-cinch-mint/15 p-5">
          <span className="text-xs font-black uppercase text-cinch-forest dark:text-cinch-mint">
            {billingCycle === "yearly" ? "Yearly estimate" : "Monthly estimate"}
          </span>
          <strong className="mt-2 block font-display text-5xl tracking-[-0.08em]">{currency(selectedTotal)}</strong>
        </div>
        <div className="space-y-2">
          {selectedAddOns.length ? (
            addOns
              .filter((item) => selectedAddOns.includes(item.id))
              .map((item) => (
                <div key={item.id} className="rounded-2xl bg-white/50 px-4 py-3 text-sm font-bold dark:bg-cinch-panel">
                  {item.name}
                </div>
              ))
          ) : (
            <p className="rounded-2xl bg-white/50 px-4 py-3 text-sm font-bold text-cinch-muted dark:bg-cinch-panel dark:text-cinch-slate">
              No paid add-ons selected.
            </p>
          )}
        </div>
        <button className="primary-button mt-5 w-full" onClick={openAdvisor}>
          Ask advisor
        </button>
      </aside>
    </div>
  );
}

function FeaturesTab() {
  return (
    <div className="grid gap-5">
      <section className="glass-card rounded-[2rem] p-6 sm:p-8">
        <span className="chip">Current desktop workspace</span>
        <h2 className="mt-4 max-w-4xl font-display text-4xl font-bold tracking-[-0.07em] sm:text-6xl">
          Everything customers need before choosing paid add-ons.
        </h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {baseModules.map((module) => (
            <span key={module} className="rounded-full border border-cinch-muted/25 bg-cinch-black px-4 py-2 text-sm font-black text-cinch-mint dark:bg-cinch-panel">
              {module}
            </span>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-[2rem] p-6 sm:p-8">
        <span className="chip">{latestBuild.title}</span>
        <h2 className="mt-4 max-w-4xl font-display text-4xl font-bold tracking-[-0.07em] sm:text-5xl">
          The website now matches the desktop print workflow.
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {latestBuild.highlights.map((item) => (
            <article key={item} className="rounded-[1.5rem] border border-cinch-muted/20 bg-white/50 p-5 dark:bg-cinch-charcoal/75">
              <strong className="block text-sm">{item}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {featureCards.map((card) => (
          <article key={card.title} className="glass-card rounded-[1.75rem] p-6">
            <div className="flex flex-wrap gap-2">
              {card.tags.map((tag) => (
                <span key={tag} className="chip">
                  {tag}
                </span>
              ))}
            </div>
            <h3 className="mt-5 font-display text-3xl font-bold tracking-[-0.06em]">{card.title}</h3>
            <p className="mt-3 text-sm font-semibold leading-7 text-cinch-muted dark:text-cinch-slate">{card.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

function AboutTab({ openAdvisor }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <section className="glass-card rounded-[2rem] p-6 sm:p-8">
        <span className="chip">About CinchPOS</span>
        <h2 className="mt-4 font-display text-4xl font-bold tracking-[-0.07em] sm:text-6xl">
          A free-first desktop billing system for practical businesses.
        </h2>
        <p className="mt-5 text-base font-semibold leading-8 text-cinch-muted dark:text-cinch-slate">
          CinchPOS starts with the billing workflow customers need every day, then keeps advanced business tools
          optional. This page is built for Vercel as a clean download, pricing, features, and guidance hub.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["1", "Download the free app"],
            ["2", "Run daily billing"],
            ["3", "Add paid tools only when needed"]
          ].map(([step, text]) => (
            <div key={step} className="rounded-[1.25rem] border border-cinch-muted/20 bg-white/50 p-4 dark:bg-cinch-panel">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-cinch-mint text-sm font-black text-cinch-black">
                {step}
              </span>
              <strong className="mt-3 block text-sm">{text}</strong>
            </div>
          ))}
        </div>
      </section>

      <aside className="grid gap-5">
        <div className="glass-card rounded-[2rem] p-6">
          <span className="chip">Smart Advisor</span>
          <h3 className="mt-4 font-display text-3xl font-bold tracking-[-0.06em]">
            Help customers avoid unnecessary subscriptions.
          </h3>
          <p className="mt-3 text-sm font-semibold leading-7 text-cinch-muted dark:text-cinch-slate">
            The advisor asks about business type, outlets, staff, reporting, reminders, backup, and budget before
            recommending a lean add-on bundle.
          </p>
          <button className="primary-button mt-5 w-full" onClick={openAdvisor}>
            Try advisor preview
          </button>
        </div>

        <div className="glass-card rounded-[2rem] p-6">
          <span className="chip">Contact</span>
          <h3 className="mt-4 font-display text-3xl font-bold tracking-[-0.06em]">Need setup help?</h3>
          <div className="mt-5 grid gap-3">
            <a className="secondary-button justify-start" href="tel:9038956555">
              Call 9038956555
            </a>
            <a className="secondary-button justify-start" href="mailto:cinchlive@gmail.com">
              cinchlive@gmail.com
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}

function OnlineStorePage({ storeSlug }) {
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState({});
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", address: "" });
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchPublicJSON(`/api/public/stores/${encodeURIComponent(storeSlug)}`)
      .then((payload) => {
        if (cancelled) return;
        setStore(payload.store);
        setProducts(Array.isArray(payload.products) ? payload.products : []);
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(requestError.message || "This online store could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storeSlug]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => {
      const haystack = [
        product.name,
        product.barcode,
        product.category,
        ...(Array.isArray(product.barcodes) ? product.barcodes : [])
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [products, search]);

  const cartLines = useMemo(() => (
    Object.entries(cart)
      .map(([productKey, quantity]) => {
        const product = products.find((item) => item.product_key === productKey || item.id === productKey);
        if (!product) return null;
        return {
          product,
          productKey,
          quantity,
          lineTotal: Number(product.online_price || 0) * quantity
        };
      })
      .filter(Boolean)
  ), [cart, products]);

  const cartTotal = cartLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const cartQuantity = cartLines.reduce((sum, line) => sum + line.quantity, 0);

  function productKey(product) {
    return product.product_key || product.id;
  }

  function setCartQuantity(product, quantity) {
    const key = productKey(product);
    const maxStock = Math.max(0, Math.floor(Number(product.stock || 0)));
    const nextQuantity = Math.max(0, Math.min(maxStock, Number(quantity) || 0));
    setCart((current) => {
      const nextCart = { ...current };
      if (!nextQuantity) {
        delete nextCart[key];
      } else {
        nextCart[key] = nextQuantity;
      }
      return nextCart;
    });
  }

  function addToCart(product) {
    const key = productKey(product);
    const currentQuantity = cart[key] || 0;
    setCartQuantity(product, currentQuantity + 1);
  }

  async function submitCheckout(event) {
    event.preventDefault();
    setCheckoutError("");
    setCreatedOrder(null);
    if (!customer.name.trim()) {
      setCheckoutError("Please enter the customer name.");
      return;
    }
    if (!/^\d{10}$/.test(customer.phone.replace(/\D/g, ""))) {
      setCheckoutError("Please enter a valid 10 digit phone number.");
      return;
    }
    if (!cartLines.length) {
      setCheckoutError("Please add at least one product to the cart.");
      return;
    }

    setCheckoutBusy(true);
    try {
      const payload = await fetchPublicJSON(`/api/public/stores/${encodeURIComponent(storeSlug)}/checkout`, {
        method: "POST",
        body: JSON.stringify({
          customer,
          items: cartLines.map((line) => ({
            product_key: line.productKey,
            quantity: line.quantity
          }))
        })
      });
      setCreatedOrder(payload.order);
      setStore(payload.store || store);
      setCart({});
      setProducts((current) => current.map((product) => {
        const line = cartLines.find((cartLine) => cartLine.productKey === productKey(product));
        if (!line) return product;
        return {
          ...product,
          stock: Math.max(0, Number(product.stock || 0) - line.quantity)
        };
      }));
    } catch (requestError) {
      setCheckoutError(requestError.message || "Checkout could not be completed.");
    } finally {
      setCheckoutBusy(false);
    }
  }

  async function downloadCreatedInvoice() {
    if (!createdOrder) return;
    try {
      const payload = await fetchPublicJSON(`/api/public/orders/${encodeURIComponent(createdOrder.id)}/invoice`);
      downloadOnlineInvoice(payload.store || store, payload.order || createdOrder);
    } catch {
      downloadOnlineInvoice(store, createdOrder);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-cinch-soft px-4 py-10 text-cinch-black dark:bg-cinch-black dark:text-cinch-soft">
        <section className="mx-auto max-w-5xl rounded-[2rem] border border-cinch-muted/20 bg-white/80 p-8 shadow-soft dark:bg-cinch-charcoal">
          <span className="chip">CinchPOS Online Store</span>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-[-0.06em]">Loading store...</h1>
          <p className="mt-3 text-sm font-bold text-cinch-muted dark:text-cinch-slate">Fetching live products and prices.</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-cinch-soft px-4 py-10 text-cinch-black dark:bg-cinch-black dark:text-cinch-soft">
        <section className="mx-auto max-w-5xl rounded-[2rem] border border-cinch-muted/20 bg-white/80 p-8 shadow-soft dark:bg-cinch-charcoal">
          <span className="chip">Store unavailable</span>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-[-0.06em]">This online store could not be opened.</h1>
          <p className="mt-3 text-sm font-bold text-cinch-muted dark:text-cinch-slate">{error}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cinch-soft px-4 py-6 text-cinch-black dark:bg-cinch-black dark:text-cinch-soft sm:py-8">
      <section className="mx-auto max-w-7xl">
        <header className="glass-card flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={store?.logo_url || "/assets/logo-cinchpos-mark.png"}
              alt=""
              className="h-14 w-14 rounded-2xl object-cover ring-1 ring-cinch-muted/30"
            />
            <div className="min-w-0">
              <span className="chip">CinchPOS Online Store</span>
              <h1 className="mt-2 truncate font-display text-2xl font-bold tracking-[-0.05em] sm:text-4xl">
                {store?.store_name || "Online Store"}
              </h1>
              <p className="mt-1 max-w-2xl text-xs font-bold text-cinch-muted dark:text-cinch-slate sm:text-sm">
                {store?.address || "Products available for online checkout."}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-cinch-muted/20 bg-white/70 px-4 py-3 text-sm font-black dark:bg-cinch-panel">
            {cartQuantity} item{cartQuantity === 1 ? "" : "s"} | {currency(cartTotal)}
          </div>
        </header>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
          <section className="glass-card rounded-[1.5rem] p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-[-0.05em]">Products</h2>
                <p className="mt-1 text-sm font-bold text-cinch-muted dark:text-cinch-slate">
                  {filteredProducts.length} of {products.length} product{products.length === 1 ? "" : "s"} available.
                </p>
              </div>
              <label className="grid min-w-[240px] gap-2 text-sm font-black sm:min-w-[320px]">
                Search
                <input
                  className="rounded-2xl border border-cinch-muted/25 bg-white/80 px-4 py-3 text-sm font-bold outline-none focus:border-cinch-emerald dark:bg-cinch-panel"
                  placeholder="Search product or barcode"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => {
                const key = productKey(product);
                const quantity = cart[key] || 0;
                const stock = Math.floor(Number(product.stock || 0));
                return (
                  <article key={key} className="rounded-[1.25rem] border border-cinch-muted/20 bg-white/65 p-4 dark:bg-cinch-panel">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-lg font-bold tracking-[-0.04em]">{product.name}</h3>
                        <p className="mt-1 text-xs font-bold text-cinch-muted dark:text-cinch-slate">
                          Barcode {product.barcode || "Not added"}
                        </p>
                      </div>
                      <span className="rounded-2xl bg-cinch-mint px-3 py-2 text-xs font-black text-cinch-black">
                        {stock} left
                      </span>
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <span className="text-xs font-black uppercase text-cinch-muted dark:text-cinch-slate">Online Price</span>
                        <strong className="block font-display text-2xl tracking-[-0.05em]">{currency(product.online_price)}</strong>
                        {Number(product.mrp || 0) > Number(product.online_price || 0) ? (
                          <small className="text-xs font-bold text-cinch-muted dark:text-cinch-slate">
                            MRP {currency(product.mrp)}
                          </small>
                        ) : null}
                      </div>
                      {quantity ? (
                        <div className="flex items-center rounded-2xl border border-cinch-muted/25 bg-white/70 dark:bg-cinch-charcoal">
                          <button className="px-3 py-2 font-black" onClick={() => setCartQuantity(product, quantity - 1)}>-</button>
                          <span className="min-w-8 text-center text-sm font-black">{quantity}</span>
                          <button className="px-3 py-2 font-black" onClick={() => setCartQuantity(product, quantity + 1)}>+</button>
                        </div>
                      ) : (
                        <button className="primary-button px-4 py-2" disabled={!stock} onClick={() => addToCart(product)}>
                          {stock ? "Add" : "Out"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {!filteredProducts.length ? (
              <div className="mt-5 rounded-[1.25rem] border border-cinch-muted/20 bg-white/70 p-5 text-sm font-bold text-cinch-muted dark:bg-cinch-panel dark:text-cinch-slate">
                No products matched your search.
              </div>
            ) : null}
          </section>

          <aside className="glass-card h-fit rounded-[1.5rem] p-4 sm:p-5">
            <h2 className="font-display text-2xl font-bold tracking-[-0.05em]">Checkout</h2>
            <div className="mt-4 grid gap-3">
              {cartLines.length ? cartLines.map((line) => (
                <div key={line.productKey} className="rounded-[1rem] border border-cinch-muted/20 bg-white/60 p-3 text-sm font-bold dark:bg-cinch-panel">
                  <div className="flex justify-between gap-3">
                    <span>{line.product.name}</span>
                    <strong>{currency(line.lineTotal)}</strong>
                  </div>
                  <small className="mt-1 block text-cinch-muted dark:text-cinch-slate">
                    {line.quantity} x {currency(line.product.online_price)}
                  </small>
                </div>
              )) : (
                <p className="rounded-[1rem] border border-cinch-muted/20 bg-white/60 p-4 text-sm font-bold text-cinch-muted dark:bg-cinch-panel dark:text-cinch-slate">
                  Add products to start checkout.
                </p>
              )}
            </div>

            <div className="my-5 flex items-center justify-between border-y border-cinch-muted/20 py-4">
              <span className="text-sm font-black">Total</span>
              <strong className="font-display text-3xl tracking-[-0.06em]">{currency(cartTotal)}</strong>
            </div>

            <form className="grid gap-3" onSubmit={submitCheckout}>
              <input
                className="rounded-2xl border border-cinch-muted/25 bg-white/80 px-4 py-3 text-sm font-bold outline-none focus:border-cinch-emerald dark:bg-cinch-panel"
                placeholder="Customer name"
                value={customer.name}
                onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))}
                required
              />
              <input
                className="rounded-2xl border border-cinch-muted/25 bg-white/80 px-4 py-3 text-sm font-bold outline-none focus:border-cinch-emerald dark:bg-cinch-panel"
                inputMode="numeric"
                placeholder="10 digit phone"
                value={customer.phone}
                onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))}
                required
              />
              <input
                className="rounded-2xl border border-cinch-muted/25 bg-white/80 px-4 py-3 text-sm font-bold outline-none focus:border-cinch-emerald dark:bg-cinch-panel"
                type="email"
                placeholder="Email optional"
                value={customer.email}
                onChange={(event) => setCustomer((current) => ({ ...current, email: event.target.value }))}
              />
              <textarea
                className="min-h-24 rounded-2xl border border-cinch-muted/25 bg-white/80 px-4 py-3 text-sm font-bold outline-none focus:border-cinch-emerald dark:bg-cinch-panel"
                placeholder="Address optional"
                value={customer.address}
                onChange={(event) => setCustomer((current) => ({ ...current, address: event.target.value }))}
              />
              {checkoutError ? <p className="rounded-2xl bg-cinch-danger/10 px-4 py-3 text-sm font-black text-cinch-danger">{checkoutError}</p> : null}
              <button className="primary-button w-full" disabled={checkoutBusy || !cartLines.length}>
                {checkoutBusy ? "Placing order..." : "Checkout"}
              </button>
            </form>

            {createdOrder ? (
              <div className="mt-5 rounded-[1.25rem] border border-cinch-emerald/40 bg-cinch-mint/30 p-4">
                <strong className="block text-sm">Order placed: {createdOrder.invoice_number}</strong>
                <p className="mt-1 text-xs font-bold text-cinch-muted">Download the invoice for this checkout.</p>
                <button className="secondary-button mt-3 w-full" onClick={downloadCreatedInvoice}>
                  Download Invoice
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}

function AdvisorModal({
  advisorOutlets,
  advisorProfile,
  advisorRecommendation,
  applyAdvisorRecommendation,
  setAdvisorOpen,
  setAdvisorOutlets,
  setAdvisorProfile
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-cinch-black/70 p-4 backdrop-blur-xl" onClick={() => setAdvisorOpen(false)}>
      <section
        className="glass-card max-h-[92vh] w-full max-w-3xl overflow-auto rounded-[2rem] p-6 dark:bg-cinch-charcoal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="chip">Advisor preview</span>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-[-0.07em]">Find the leanest bundle.</h2>
          </div>
          <button
            className="grid h-11 w-11 place-items-center rounded-full border border-cinch-muted/25 text-xl font-black"
            onClick={() => setAdvisorOpen(false)}
            aria-label="Close advisor"
          >
            ×
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-black">
            Business type
            <select
              className="rounded-2xl border border-cinch-muted/25 bg-white/70 px-4 py-3 font-bold outline-none dark:bg-cinch-panel"
              value={advisorProfile}
              onChange={(event) => setAdvisorProfile(event.target.value)}
            >
              {businessProfiles.map((profile) => (
                <option key={profile.value} value={profile.value}>
                  {profile.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-black">
            Number of outlets
            <select
              className="rounded-2xl border border-cinch-muted/25 bg-white/70 px-4 py-3 font-bold outline-none dark:bg-cinch-panel"
              value={advisorOutlets}
              onChange={(event) => setAdvisorOutlets(event.target.value)}
            >
              <option value="1">Single outlet</option>
              <option value="2-3">2 to 3 outlets</option>
              <option value="4+">4 or more outlets</option>
            </select>
          </label>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-cinch-mint/30 bg-cinch-mint/15 p-5">
          <p className="text-xs font-black uppercase text-cinch-forest dark:text-cinch-mint">Recommended now</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {advisorRecommendation.map((item) => (
              <div key={item.id} className="rounded-2xl bg-white/60 p-4 dark:bg-cinch-panel">
                <strong className="block text-sm">{item.name}</strong>
                <span className="mt-1 block text-xs font-bold text-cinch-muted dark:text-cinch-slate">
                  {currency(item.price)} / month
                </span>
              </div>
            ))}
          </div>
        </div>

        <button className="primary-button mt-6 w-full" onClick={applyAdvisorRecommendation}>
          Apply recommendation to pricing builder
        </button>
      </section>
    </div>
  );
}

export default App;
