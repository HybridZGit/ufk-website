const toast = document.querySelector("#toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.ufkToastTimer);
  window.ufkToastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

async function copyAndOpen(message) {
  try {
    await navigator.clipboard.writeText(message);
    showToast("Purchase message copied. Paste it in the UFK Discord.");
  } catch {
    showToast("Join Discord and send your purchase request.");
  }
  window.open(SITE_CONFIG.discordUrl, "_blank", "noopener,noreferrer");
}

document.querySelectorAll(".js-discord").forEach(link => link.href = SITE_CONFIG.discordUrl);



// Lightweight animated gold particles.
const canvas = document.querySelector("#gold-particles");
const ctx = canvas.getContext("2d");
let particles = [];
let dpr = Math.min(window.devicePixelRatio || 1, 2);

function resizeParticles() {
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  canvas.style.width = innerWidth + "px";
  canvas.style.height = innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = Math.min(100, Math.max(45, Math.floor(innerWidth / 18)));
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    r: Math.random() * 1.8 + .4,
    speed: Math.random() * .28 + .08,
    drift: (Math.random() - .5) * .18,
    alpha: Math.random() * .55 + .18
  }));
}

function animateParticles() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for (const p of particles) {
    p.y -= p.speed;
    p.x += p.drift;
    if (p.y < -8) { p.y = innerHeight + 8; p.x = Math.random() * innerWidth; }
    if (p.x < -8) p.x = innerWidth + 8;
    if (p.x > innerWidth + 8) p.x = -8;
    ctx.beginPath();
    ctx.fillStyle = `rgba(240, 196, 95, ${p.alpha})`;
    ctx.shadowColor = "rgba(224, 166, 62, .8)";
    ctx.shadowBlur = 8;
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  requestAnimationFrame(animateParticles);
}

addEventListener("resize", resizeParticles);
resizeParticles();
animateParticles();


// Animated floating client review panel.
const CLIENT_REVIEWS = [
  {
    name: "brpark2",
    text: "That full kit is really awesome. I really appreciate it!",
    avatar: "B"
  },
  {
    name: "strive",
    text: "Go get your custom kits!",
    avatar: "S"
  },
  {
    name: "foreverdma",
    text: "Canelo vs Caleb Plant — fire.",
    avatar: "F"
  },
  {
    name: "kingruthless09",
    text: "Some of the best kits I’ve seen. The attention to detail and communication are excellent.",
    avatar: "K"
  },
  {
    name: "yadim1607",
    text: "The colours, shorts, gloves, and overall appearance are recreated beautifully. It feels authentic and fits perfectly in the game.",
    avatar: "Y"
  }
];

const reviewFloater = document.querySelector("#review-floater");
const reviewText = document.querySelector("#review-text");
const reviewName = document.querySelector("#review-name");
const reviewAvatar = document.querySelector("#review-avatar");
const reviewProgress = document.querySelector("#review-progress-bar");
const reviewPause = document.querySelector("#review-pause");
let reviewIndex = 0;
let reviewPaused = false;
let reviewTimer;

function restartReviewProgress() {
  reviewProgress.classList.remove("is-running");
  void reviewProgress.offsetWidth;
  if (!reviewPaused) reviewProgress.classList.add("is-running");
}

function showReview(index) {
  reviewIndex = (index + CLIENT_REVIEWS.length) % CLIENT_REVIEWS.length;
  reviewFloater.classList.remove("is-changing");
  void reviewFloater.offsetWidth;
  reviewFloater.classList.add("is-changing");

  window.setTimeout(() => {
    const review = CLIENT_REVIEWS[reviewIndex];
    reviewText.textContent = `“${review.text}”`;
    reviewName.textContent = review.name;
    reviewAvatar.textContent = review.avatar;
  }, 190);

  clearTimeout(reviewTimer);
  restartReviewProgress();
  if (!reviewPaused) {
    reviewTimer = window.setTimeout(() => showReview(reviewIndex + 1), 6000);
  }
}

document.querySelector("#review-prev").addEventListener("click", () => showReview(reviewIndex - 1));
document.querySelector("#review-next").addEventListener("click", () => showReview(reviewIndex + 1));
reviewPause.addEventListener("click", () => {
  reviewPaused = !reviewPaused;
  reviewPause.textContent = reviewPaused ? "▶" : "Ⅱ";
  reviewPause.setAttribute("aria-label", reviewPaused ? "Resume reviews" : "Pause reviews");
  clearTimeout(reviewTimer);
  restartReviewProgress();
  if (!reviewPaused) reviewTimer = window.setTimeout(() => showReview(reviewIndex + 1), 6000);
});

reviewFloater.addEventListener("mouseenter", () => {
  clearTimeout(reviewTimer);
  reviewProgress.classList.remove("is-running");
});
reviewFloater.addEventListener("mouseleave", () => {
  if (!reviewPaused) {
    restartReviewProgress();
    clearTimeout(reviewTimer);
    reviewTimer = window.setTimeout(() => showReview(reviewIndex + 1), 6000);
  }
});

showReview(0);


// Stripe checkout flow.
const paymentModal = document.querySelector("#payment-modal");
const paymentItemName = document.querySelector("#payment-item-name");
const continueToStripe = document.querySelector("#continue-to-stripe");

document.querySelectorAll(".js-stripe").forEach(link => {
  link.href = SITE_CONFIG.stripeUrl;
});

let currentCheckoutItem = { item: "UFK item", price: "$0" };

function openPaymentModal(itemName, price = "") {
  currentCheckoutItem = {
    item: itemName || "UFK item",
    price: price || "$0"
  };
  paymentItemName.textContent = price ? `${currentCheckoutItem.item} (${price})` : currentCheckoutItem.item;
  continueToStripe.href = SITE_CONFIG.stripeUrl;
  paymentModal.classList.add("is-open");
  paymentModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closePaymentModal() {
  paymentModal.classList.remove("is-open");
  paymentModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

document.querySelectorAll(".pay-item").forEach(button => {
  button.addEventListener("click", () => {
    const item = button.dataset.item || "this UFK item";
    const price = button.dataset.price || "";
    openPaymentModal(item, price);
  });
});

document.querySelectorAll("[data-close-payment]").forEach(element => {
  element.addEventListener("click", closePaymentModal);
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closePaymentModal();
});


// Pause other gameplay videos when one starts playing.
const gameplayVideos = [...document.querySelectorAll("#in-action video")];
gameplayVideos.forEach(video => {
  video.addEventListener("play", () => {
    gameplayVideos.forEach(other => {
      if (other !== video && !other.paused) other.pause();
    });
  });
});

// Shared UFK accounts, orders, admin controls, and file delivery through Supabase.
const UFK_SUPABASE_URL = 'https://hxfsrsjjmicbjptzvocj.supabase.co';
const UFK_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_BWaduxuSybMcpirg-EfsPA_9MdDBHr5';
const UFK_DELIVERY_BUCKET = "ufk-deliveries";
const UFK_SIGNUP_WEBHOOK = "https://discord.com/api/webhooks/1530991181838942239/x3ewb-TB6VCsWZSms7m-CEW0Vm-El_nzLlrZHxVapMy0Vmv-xNm-wHHO2RxUfYugjvFh";
const UFK_ORDER_WEBHOOK = "https://discord.com/api/webhooks/1530989771181134025/1SKsmUS7etAJw7jXyIrkl9KZAZl7L2ZTGlS91lpMplcZCJD5yoYVDgeiAV99hHbO4hI3";

const ufkSupabase = window.supabase.createClient(
  UFK_SUPABASE_URL,
  UFK_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

const accountModal = document.querySelector("#account-modal");
const accountAuthView = document.querySelector("#account-auth-view");
const accountDashboard = document.querySelector("#account-dashboard");
const accountNavButton = document.querySelector("#account-nav-button");
const loginTab = document.querySelector("#login-tab");
const registerTab = document.querySelector("#register-tab");
const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const accountOrders = document.querySelector("#account-orders");

const adminNavButton = document.querySelector("#admin-nav-button");
const adminAuthView = document.querySelector("#admin-auth-view");
const adminDashboard = document.querySelector("#admin-dashboard");
const adminLoginForm = document.querySelector("#admin-login-form");
const adminClients = document.querySelector("#admin-clients");

let currentUser = null;
let currentProfile = null;

function escapeAccountHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function parseMoney(value) {
  const amount = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function createInvoiceId() {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("");
  const random = crypto.getRandomValues(new Uint32Array(1))[0]
    .toString(36).slice(0, 6).toUpperCase().padEnd(6, "0");
  return `UFK-${date}-${random}`;
}

function setAccountTab(mode) {
  const loginActive = mode === "login";
  loginTab.classList.toggle("is-active", loginActive);
  registerTab.classList.toggle("is-active", !loginActive);
  loginTab.setAttribute("aria-selected", String(loginActive));
  registerTab.setAttribute("aria-selected", String(!loginActive));
  loginForm.classList.toggle("is-hidden", !loginActive);
  registerForm.classList.toggle("is-hidden", loginActive);
}

function hideAllAccountViews() {
  accountAuthView.classList.add("is-hidden");
  accountDashboard.classList.add("is-hidden");
  adminAuthView.classList.add("is-hidden");
  adminDashboard.classList.add("is-hidden");
}

function openAccountModal() {
  accountModal.classList.add("is-open");
  accountModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  renderClientArea();
}

function closeAccountModal() {
  accountModal.classList.remove("is-open");
  accountModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

async function loadCurrentProfile() {
  const { data: { user }, error } = await ufkSupabase.auth.getUser();
  if (error || !user) {
    currentUser = null;
    currentProfile = null;
    return null;
  }

  currentUser = user;
  const { data: profile, error: profileError } = await ufkSupabase
    .from("profiles")
    .select("id, display_name, email, role, revoked, created_at")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Profile load failed:", profileError);
    currentProfile = null;
    return null;
  }

  currentProfile = profile;
  if (profile.revoked) {
    await ufkSupabase.auth.signOut();
    currentUser = null;
    currentProfile = null;
    showToast("This UFK account has been revoked.");
    return null;
  }

  return profile;
}

function updateAccountNav() {
  accountNavButton.textContent = currentProfile
    ? `Hi, ${currentProfile.display_name || "Client"}`
    : "My Account";
}

async function renderClientArea() {
  await loadCurrentProfile();
  hideAllAccountViews();

  if (!currentUser || !currentProfile) {
    accountAuthView.classList.remove("is-hidden");
    setAccountTab("login");
    updateAccountNav();
    return;
  }

  accountDashboard.classList.remove("is-hidden");
  document.querySelector("#account-client-name").textContent = currentProfile.display_name || "UFK Client";
  document.querySelector("#account-client-email").textContent = currentProfile.email || currentUser.email || "";

  const { data: orders, error } = await ufkSupabase
    .from("orders")
    .select("id, invoice_id, item_name, price, order_type, status, delivery_path, delivery_filename, created_at")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    accountOrders.innerHTML = '<div class="account-empty"><strong>Orders could not be loaded.</strong> Check your Supabase setup and policies.</div>';
    return;
  }

  const safeOrders = orders || [];
  document.querySelector("#account-order-count").textContent = safeOrders.length;
  const total = safeOrders.reduce((sum, order) => sum + parseMoney(order.price), 0);
  document.querySelector("#account-order-total").textContent = `$${total.toFixed(total % 1 ? 2 : 0)}`;

  if (!safeOrders.length) {
    accountOrders.innerHTML = `
      <div class="account-empty">
        <strong>No orders yet.</strong>
        Purchase a kit or download a free release and it will appear here with its invoice ID.
      </div>`;
    return;
  }

  accountOrders.innerHTML = safeOrders.map(order => `
    <article class="account-order">
      <div>
        <h4>${escapeAccountHtml(order.item_name)}</h4>
        <div class="account-order-meta">
          <span>Invoice ${escapeAccountHtml(order.invoice_id)}</span>
          <span>${new Date(order.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
        </div>
      </div>
      <div class="account-order-price">
        ${escapeAccountHtml(order.price || "—")}
        <span class="account-order-status">${escapeAccountHtml(order.status)}</span>
        ${order.delivery_path ? `
          <button class="button secondary account-download-button account-download-file"
            type="button"
            data-path="${escapeAccountHtml(order.delivery_path)}"
            data-filename="${escapeAccountHtml(order.delivery_filename || "ufk-delivery")}">
            Download ${escapeAccountHtml(order.delivery_filename || "delivered file")}
          </button>` : ""}
      </div>
    </article>
  `).join("");

  updateAccountNav();
}

async function postDiscordWebhook(url, payload) {
  try {
    const formData = new FormData();
    formData.append("payload_json", JSON.stringify(payload));
    await fetch(url, { method: "POST", mode: "no-cors", body: formData });
  } catch (error) {
    console.warn("Discord notification failed:", error);
  }
}

async function sendNewClientToDiscord(profile) {
  return postDiscordWebhook(UFK_SIGNUP_WEBHOOK, {
    username: "UFK Client Signup",
    embeds: [{
      title: "We Have a New Client Signup",
      color: 15844367,
      fields: [
        { name: "Client Name", value: profile.display_name || "Unknown", inline: true },
        { name: "Email", value: profile.email || "Unknown", inline: true },
        { name: "Account Status", value: "Active", inline: true }
      ],
      footer: { text: "UFK Shared Client System" },
      timestamp: new Date().toISOString()
    }]
  });
}

async function sendOrderToDiscord(order) {
  return postDiscordWebhook(UFK_ORDER_WEBHOOK, {
    username: "UFK Order System",
    embeds: [{
      title: order.order_type === "free" ? "New Free Kit Download" : "New Website Checkout",
      color: order.order_type === "free" ? 5763719 : 15844367,
      fields: [
        { name: "Invoice ID", value: order.invoice_id, inline: false },
        { name: "Customer", value: currentProfile?.display_name || "Unknown", inline: true },
        { name: "Email", value: currentProfile?.email || currentUser?.email || "Unknown", inline: true },
        { name: "Item", value: order.item_name, inline: false },
        { name: "Price", value: order.price || "FREE", inline: true },
        { name: "Order Type", value: order.order_type === "free" ? "Free download" : "Stripe checkout", inline: true },
        { name: "Status", value: order.status, inline: false }
      ],
      footer: { text: "UFK Shared Invoice System" },
      timestamp: order.created_at
    }]
  });
}

async function ensureSignedIn() {
  await loadCurrentProfile();
  if (!currentUser || !currentProfile) {
    showToast("Log in or create an account first so the invoice can be saved.");
    openAccountModal();
    return false;
  }
  return true;
}

async function recordOrder({ item, price, type, status }) {
  if (!await ensureSignedIn()) return null;

  const order = {
    invoice_id: createInvoiceId(),
    user_id: currentUser.id,
    customer_email: currentProfile.email || currentUser.email,
    item_name: item || "UFK item",
    price: price || (type === "free" ? "FREE" : "$0"),
    order_type: type || "paid",
    status: status || "Order created"
  };

  const { data, error } = await ufkSupabase
    .from("orders")
    .insert(order)
    .select("id, invoice_id, item_name, price, order_type, status, created_at")
    .single();

  if (error) {
    console.error(error);
    showToast("The invoice could not be saved. Check the Supabase database setup.");
    return null;
  }

  await sendOrderToDiscord(data);
  await renderClientArea();
  return data;
}

async function saveCurrentCheckout() {
  return recordOrder({
    item: currentCheckoutItem.item,
    price: currentCheckoutItem.price,
    type: "paid",
    status: "Stripe checkout opened"
  });
}

accountNavButton.addEventListener("click", openAccountModal);
document.querySelectorAll("[data-close-account]").forEach(element => {
  element.addEventListener("click", closeAccountModal);
});
loginTab.addEventListener("click", () => setAccountTab("login"));
registerTab.addEventListener("click", () => setAccountTab("register"));

registerForm.addEventListener("submit", async event => {
  event.preventDefault();
  const name = document.querySelector("#register-name").value.trim();
  const email = document.querySelector("#register-email").value.trim().toLowerCase();
  const password = document.querySelector("#register-password").value;

  const { data, error } = await ufkSupabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: name },
      emailRedirectTo: window.location.href.split("#")[0]
    }
  });

  if (error) {
    showToast(error.message || "Account creation failed.");
    return;
  }

  registerForm.reset();

  if (!data.session) {
    await sendNewClientToDiscord({ display_name: name, email });
    setAccountTab("login");
    showToast("Account created. Check your email to confirm it, then log in.");
    return;
  }

  await loadCurrentProfile();
  await sendNewClientToDiscord(currentProfile || { display_name: name, email });
  await renderClientArea();
  showToast("Your shared UFK account has been created.");
});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const email = document.querySelector("#login-email").value.trim().toLowerCase();
  const password = document.querySelector("#login-password").value;

  const { error } = await ufkSupabase.auth.signInWithPassword({ email, password });
  if (error) {
    showToast("Email or password not recognised.");
    return;
  }

  loginForm.reset();
  await loadCurrentProfile();

  if (!currentProfile) {
    showToast("Your profile could not be loaded.");
    return;
  }

  await renderClientArea();
  showToast("Welcome back to your UFK client area.");
});

document.querySelector("#account-logout").addEventListener("click", async () => {
  await ufkSupabase.auth.signOut();
  currentUser = null;
  currentProfile = null;
  updateAccountNav();
  await renderClientArea();
  showToast("You have been logged out.");
});

continueToStripe.addEventListener("click", async event => {
  event.preventDefault();
  const order = await saveCurrentCheckout();
  if (!order) {
    closePaymentModal();
    return;
  }

  showToast(`Invoice ${order.invoice_id} created. Opening Stripe checkout.`);
  window.open(continueToStripe.href, "_blank", "noopener");
  closePaymentModal();
});

document.querySelectorAll(".download-exclusive").forEach(link => {
  link.addEventListener("click", async event => {
    event.preventDefault();

    const order = await recordOrder({
      item: link.dataset.item || "UFK Free Kit",
      price: link.dataset.price || "FREE",
      type: "free",
      status: "Free download issued"
    });

    if (!order) return;

    showToast(`Invoice ${order.invoice_id} created. Your free download is starting.`);
    const download = document.createElement("a");
    download.href = link.href;
    download.download = link.getAttribute("download") || "";
    document.body.appendChild(download);
    download.click();
    download.remove();
  });
});

accountOrders.addEventListener("click", async event => {
  const button = event.target.closest(".account-download-file");
  if (!button) return;

  const { data, error } = await ufkSupabase.storage
    .from(UFK_DELIVERY_BUCKET)
    .createSignedUrl(button.dataset.path, 120, {
      download: button.dataset.filename || "ufk-delivery"
    });

  if (error || !data?.signedUrl) {
    console.error(error);
    showToast("The delivered file could not be opened.");
    return;
  }

  window.open(data.signedUrl, "_blank", "noopener");
});

async function openAdminArea() {
  accountModal.classList.add("is-open");
  accountModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  hideAllAccountViews();

  await loadCurrentProfile();
  if (currentProfile?.role === "admin") {
    adminDashboard.classList.remove("is-hidden");
    await renderAdminDashboard();
  } else {
    adminAuthView.classList.remove("is-hidden");
  }
}

async function renderAdminDashboard() {
  await loadCurrentProfile();
  if (!currentProfile || currentProfile.role !== "admin") {
    hideAllAccountViews();
    adminAuthView.classList.remove("is-hidden");
    return;
  }

  const [profilesResult, ordersResult] = await Promise.all([
    ufkSupabase
      .from("profiles")
      .select("id, display_name, email, role, revoked, created_at")
      .order("created_at", { ascending: false }),
    ufkSupabase
      .from("orders")
      .select("id, invoice_id, user_id, customer_email, item_name, price, order_type, status, delivery_path, delivery_filename, created_at")
      .order("created_at", { ascending: false })
  ]);

  if (profilesResult.error || ordersResult.error) {
    console.error(profilesResult.error || ordersResult.error);
    adminClients.innerHTML = '<div class="admin-empty">Admin data could not be loaded. Confirm your SQL policies and admin role.</div>';
    return;
  }

  const profiles = profilesResult.data || [];
  const orders = ordersResult.data || [];

  document.querySelector("#admin-client-count").textContent = profiles.length;
  document.querySelector("#admin-order-count").textContent = orders.length;
  const total = orders.reduce((sum, order) => sum + parseMoney(order.price), 0);
  document.querySelector("#admin-order-total").textContent = `$${total.toFixed(total % 1 ? 2 : 0)}`;

  if (!profiles.length) {
    adminClients.innerHTML = '<div class="admin-empty">No clients have registered yet.</div>';
    return;
  }

  adminClients.innerHTML = profiles.map(client => {
    const clientOrders = orders.filter(order => order.user_id === client.id);
    const orderHtml = clientOrders.length ? clientOrders.map(order => `
      <article class="admin-order-row">
        <div>
          <h4>${escapeAccountHtml(order.item_name)}</h4>
          <div class="admin-order-meta">
            <span>Invoice ${escapeAccountHtml(order.invoice_id)}</span>
            <span>${escapeAccountHtml(order.price || "—")}</span>
            <span>${new Date(order.created_at).toLocaleString("en-GB")}</span>
          </div>
        </div>
        <div class="admin-order-controls">
          <select class="admin-status-select" data-order-id="${escapeAccountHtml(order.id)}" aria-label="Order status">
            ${["Order created","Stripe checkout opened","Payment received","In progress","Delivered","Free download issued","Cancelled"].map(status =>
              `<option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>`
            ).join("")}
          </select>
          <label class="admin-file-label">
            ${order.delivery_filename ? "Replace delivered file" : "Attach delivered file"}
            <input class="admin-file-input"
              type="file"
              data-order-id="${escapeAccountHtml(order.id)}"
              data-user-id="${escapeAccountHtml(order.user_id)}"
              data-invoice="${escapeAccountHtml(order.invoice_id)}">
          </label>
          ${order.delivery_filename ? `<span class="admin-delivered-file">Delivered: ${escapeAccountHtml(order.delivery_filename)}</span>` : ""}
        </div>
      </article>
    `).join("") : '<div class="admin-empty">This client has no orders.</div>';

    return `
      <article class="admin-client-card ${client.revoked ? "is-revoked" : ""}">
        <div class="admin-client-header">
          <div>
            <h3>${escapeAccountHtml(client.display_name || "UFK Client")}</h3>
            <div class="admin-client-email">${escapeAccountHtml(client.email)}</div>
            <div class="admin-client-meta">
              <span>Signed up: ${new Date(client.created_at).toLocaleString("en-GB")}</span>
              <span>${clientOrders.length} order${clientOrders.length === 1 ? "" : "s"}</span>
              <span>Role: ${escapeAccountHtml(client.role)}</span>
              <span>Status: ${client.revoked ? "Revoked" : "Active"}</span>
            </div>
          </div>
          <div class="admin-client-actions">
            <button class="admin-small-button ${client.revoked ? "restore" : "danger"} admin-toggle-client"
              type="button"
              data-user-id="${escapeAccountHtml(client.id)}"
              data-revoked="${client.revoked}">
              ${client.revoked ? "Restore Account" : "Revoke Account"}
            </button>
          </div>
        </div>
        <details class="admin-client-orders">
          <summary>View order history</summary>
          ${orderHtml}
        </details>
      </article>`;
  }).join("");
}

adminNavButton.addEventListener("click", openAdminArea);

adminLoginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const email = document.querySelector("#admin-login-email").value.trim().toLowerCase();
  const password = document.querySelector("#admin-login-password").value;

  const { error } = await ufkSupabase.auth.signInWithPassword({ email, password });
  if (error) {
    showToast("Incorrect admin login.");
    return;
  }

  await loadCurrentProfile();
  if (currentProfile?.role !== "admin") {
    await ufkSupabase.auth.signOut();
    currentUser = null;
    currentProfile = null;
    showToast("This account does not have admin access.");
    return;
  }

  adminLoginForm.reset();
  hideAllAccountViews();
  adminDashboard.classList.remove("is-hidden");
  await renderAdminDashboard();
  showToast("Admin dashboard opened.");
});

document.querySelector("#admin-back-to-client").addEventListener("click", async () => {
  await renderClientArea();
});

document.querySelector("#admin-logout").addEventListener("click", async () => {
  await ufkSupabase.auth.signOut();
  currentUser = null;
  currentProfile = null;
  hideAllAccountViews();
  adminAuthView.classList.remove("is-hidden");
  updateAccountNav();
  showToast("Admin logged out.");
});

document.querySelector("#admin-refresh").addEventListener("click", renderAdminDashboard);

adminClients.addEventListener("click", async event => {
  const button = event.target.closest(".admin-toggle-client");
  if (!button) return;

  const revoked = button.dataset.revoked === "true";
  const { error } = await ufkSupabase
    .from("profiles")
    .update({ revoked: !revoked })
    .eq("id", button.dataset.userId);

  if (error) {
    console.error(error);
    showToast("The account status could not be changed.");
    return;
  }

  await renderAdminDashboard();
  showToast(revoked ? "Client account restored." : "Client account revoked.");
});

adminClients.addEventListener("change", async event => {
  const statusSelect = event.target.closest(".admin-status-select");
  if (statusSelect) {
    const { error } = await ufkSupabase
      .from("orders")
      .update({ status: statusSelect.value })
      .eq("id", statusSelect.dataset.orderId);

    if (error) {
      console.error(error);
      showToast("The order status could not be updated.");
      return;
    }

    showToast("Order status updated.");
    return;
  }

  const fileInput = event.target.closest(".admin-file-input");
  if (!fileInput || !fileInput.files.length) return;

  const file = fileInput.files[0];
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${fileInput.dataset.userId}/${fileInput.dataset.invoice}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await ufkSupabase.storage
    .from(UFK_DELIVERY_BUCKET)
    .upload(path, file, { upsert: false });

  if (uploadError) {
    console.error(uploadError);
    showToast("The delivery file could not be uploaded.");
    return;
  }

  const { error: orderError } = await ufkSupabase
    .from("orders")
    .update({
      delivery_path: path,
      delivery_filename: file.name,
      status: "Delivered"
    })
    .eq("id", fileInput.dataset.orderId);

  if (orderError) {
    console.error(orderError);
    showToast("The file uploaded, but the order could not be updated.");
    return;
  }

  await renderAdminDashboard();
  showToast(`File attached to invoice ${fileInput.dataset.invoice}.`);
});

ufkSupabase.auth.onAuthStateChange(async () => {
  await loadCurrentProfile();
  updateAccountNav();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeAccountModal();
});

(async function initialiseSharedAccounts() {
  await loadCurrentProfile();
  updateAccountNav();
})();
