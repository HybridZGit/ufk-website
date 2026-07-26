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
const paymentChoiceActions = document.querySelector("#payment-choice-actions");
const otherPaymentButton = document.querySelector("#other-payment-button");
const otherPaymentConfirm = document.querySelector("#other-payment-confirm");
const otherPaymentMethod = document.querySelector("#other-payment-method");
const confirmOtherPayment = document.querySelector("#confirm-other-payment");
const cancelOtherPayment = document.querySelector("#cancel-other-payment");
const paymentWaiting = document.querySelector("#payment-waiting");

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
  paymentChoiceActions?.classList.remove("is-hidden");
  creditPaymentResult?.classList.add("is-hidden");
  loadCurrentProfile().then(() => {
    if (checkoutCreditBalance) checkoutCreditBalance.textContent = moneyFromCents(currentProfile?.store_credit_cents || 0);
  });
  otherPaymentConfirm?.classList.add("is-hidden");
  paymentWaiting?.classList.add("is-hidden");
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

otherPaymentButton?.addEventListener("click", () => {
  paymentChoiceActions?.classList.add("is-hidden");
  otherPaymentConfirm?.classList.remove("is-hidden");
});

cancelOtherPayment?.addEventListener("click", () => {
  otherPaymentConfirm?.classList.add("is-hidden");
  paymentChoiceActions?.classList.remove("is-hidden");
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
      storage: window.localStorage,
      storageKey: "ufk-auth-session",
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

const accountModal = document.querySelector("#account-modal");
const accountAuthView = document.querySelector("#account-auth-view");
const accountDashboard = document.querySelector("#account-dashboard");
const accountNavButton = document.querySelector("#account-nav-button");
const navCreditBalance = document.querySelector("#nav-credit-balance");
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
const publicOrderLog = document.querySelector("#public-order-log");
const clientSupportMessages = document.querySelector("#client-support-messages");
const clientSupportForm = document.querySelector("#client-support-form");
const adminSupportThreads = document.querySelector("#admin-support-threads");
const adminSupportMessages = document.querySelector("#admin-support-messages");
const adminSupportForm = document.querySelector("#admin-support-form");
const supportChatWidget = document.querySelector("#support-chat-widget");
const supportChatLauncher = document.querySelector("#support-chat-launcher");
const supportChatWindow = document.querySelector("#support-chat-window");
const supportChatClose = document.querySelector("#support-chat-close");
const supportChatUnread = document.querySelector("#support-chat-unread");
const accountCreditBalance = document.querySelector("#account-credit-balance");
const checkoutCreditBalance = document.querySelector("#checkout-credit-balance");
const payWithCreditButton = document.querySelector("#pay-with-credit-button");
const creditPaymentResult = document.querySelector("#credit-payment-result");
const creditTopupForm = document.querySelector("#credit-topup-form");
const creditTopupStatus = document.querySelector("#credit-topup-status");
const adminTopupRequests = document.querySelector("#admin-topup-requests");

let currentUser = null;
let currentProfile = null;
let currentSupportThread = null;
let selectedAdminThreadId = null;
let supportChannel = null;
let supportChatUnreadCount = 0;
let supportChatIsOpen = false;
let pendingOtherPaymentOrderId = null;
let pendingPaymentChannel = null;

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
function moneyFromCents(cents) { return `$${((Number(cents) || 0) / 100).toFixed(2)}`; }
function centsFromPrice(value) { return Math.round(parseMoney(value) * 100); }

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
    .select("id, display_name, email, role, revoked, store_credit_cents, created_at")
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

  if (navCreditBalance) {
    const amount = currentProfile ? moneyFromCents(currentProfile.store_credit_cents || 0) : "$0.00";
    const value = navCreditBalance.querySelector("strong");
    if (value) value.textContent = amount;
    navCreditBalance.title = currentProfile
      ? `Your UFK store-credit balance is ${amount}`
      : "Sign in to view and top up your UFK store-credit balance";
  }
}

async function renderClientArea() {
  await loadCurrentProfile();
  hideAllAccountViews();

  if (!currentUser || !currentProfile) {
    accountAuthView.classList.remove("is-hidden");
    setAccountTab("login");
    updateAccountNav();
    updateSupportChatVisibility();
    return;
  }

  accountDashboard.classList.remove("is-hidden");
  updateSupportChatVisibility();
  await initialiseClientSupport();
  document.querySelector("#account-client-name").textContent = currentProfile.display_name || "UFK Client";
  document.querySelector("#account-client-email").textContent = currentProfile.email || currentUser.email || "";
  if (accountCreditBalance) accountCreditBalance.textContent = moneyFromCents(currentProfile.store_credit_cents || 0);
  updateAccountNav();
  await loadClientTopupRequests();

  const { data: orders, error } = await ufkSupabase
    .from("orders")
    .select("id, invoice_id, item_name, price, order_type, status, payment_method, source, public_log, approved_at, delivery_path, delivery_filename, created_at")
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
        <span class="account-order-status">${escapeAccountHtml(order.status)}</span><span>${escapeAccountHtml(order.payment_method || "Stripe")}</span>
        ${order.public_log ? `<a class="account-public-approval" href="#order-${escapeAccountHtml(order.id)}">View public approval</a>` : ""}
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



async function loadPublicOrderLog() {
  if (!publicOrderLog) return;
  const { data, error } = await ufkSupabase
    .from("orders")
    .select("id, item_name, status, payment_method, approved_at, created_at")
    .eq("public_log", true)
    .order("approved_at", { ascending: false, nullsFirst: false })
    .limit(30);

  if (error) {
    console.error("Public order log failed:", error);
    publicOrderLog.innerHTML = '<div class="public-order-empty">Approved orders could not be loaded.</div>';
    return;
  }

  const orders = data || [];
  publicOrderLog.innerHTML = orders.length ? orders.map(order => `
    <article class="public-order-entry" id="order-${escapeAccountHtml(order.id)}">
      <div>
        <strong>Admin has approved this purchase</strong>
        <p>${escapeAccountHtml(order.item_name)} · ${escapeAccountHtml(order.payment_method || "Other payment")}</p>
        <a class="public-order-link" href="#order-${escapeAccountHtml(order.id)}">Public approval link</a>
      </div>
      <span class="public-order-time">${new Date(order.approved_at || order.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
    </article>`).join("") : '<div class="public-order-empty">No approved purchases have been posted yet.</div>';
}

function updateSupportChatVisibility() {
  if (!supportChatWidget) return;
  supportChatWidget.classList.remove("is-hidden");
  const label = supportChatLauncher?.querySelector(".support-chat-launcher-label");
  if (label) label.textContent = currentProfile?.role === "admin" ? "Support inbox" : "Live support";
}

function setSupportChatOpen(open) {
  if (!supportChatWindow || !supportChatLauncher) return;
  supportChatIsOpen = Boolean(open);
  supportChatWindow.classList.toggle("is-open", supportChatIsOpen);
  supportChatWindow.setAttribute("aria-hidden", String(!supportChatIsOpen));
  supportChatLauncher.setAttribute("aria-expanded", String(supportChatIsOpen));
  if (supportChatIsOpen) {
    supportChatUnreadCount = 0;
    updateSupportUnreadBadge();
    setTimeout(() => document.querySelector("#client-support-input")?.focus(), 80);
    if (clientSupportMessages) clientSupportMessages.scrollTop = clientSupportMessages.scrollHeight;
  }
}

function updateSupportUnreadBadge() {
  if (!supportChatUnread) return;
  supportChatUnread.textContent = String(Math.min(supportChatUnreadCount, 99));
  supportChatUnread.classList.toggle("is-hidden", supportChatUnreadCount < 1);
}

if (supportChatLauncher) supportChatLauncher.addEventListener("click", async () => {
  await loadCurrentProfile();
  if (!currentUser || !currentProfile) {
    showToast("Log in to chat with UFK support.");
    openAccountModal();
    return;
  }
  if (currentProfile.role === "admin") {
    await openAdminArea();
    return;
  }
  if (!currentSupportThread) await initialiseClientSupport();
  setSupportChatOpen(!supportChatIsOpen);
});
if (supportChatClose) supportChatClose.addEventListener("click", () => setSupportChatOpen(false));

function renderSupportMessages(container, messages, viewerId) {
  if (!container) return;
  container.innerHTML = messages.length ? messages.map(message => `
    <article class="support-message ${message.sender_id === viewerId ? "is-mine" : ""}">
      <div class="support-message-head">
        <strong>${escapeAccountHtml(message.sender_role === "admin" ? "UFK Admin" : "Client")}</strong>
        <span>${new Date(message.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span>
      </div>
      <p>${escapeAccountHtml(message.message)}</p>
    </article>`).join("") : '<div class="support-empty">No messages yet.</div>';
  container.scrollTop = container.scrollHeight;
}

async function getOrCreateClientThread() {
  if (!currentUser) return null;
  const { data: existing, error: selectError } = await ufkSupabase
    .from("support_threads")
    .select("id, user_id, subject, status, updated_at")
    .eq("user_id", currentUser.id)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing;

  const { data: created, error: insertError } = await ufkSupabase
    .from("support_threads")
    .insert({ user_id: currentUser.id, subject: "Kit discussion", status: "open" })
    .select("id, user_id, subject, status, updated_at")
    .single();
  if (insertError) throw insertError;
  return created;
}

async function loadClientSupportMessages() {
  if (!currentSupportThread || !currentUser) return;
  const { data, error } = await ufkSupabase
    .from("support_messages")
    .select("id, thread_id, sender_id, sender_role, message, created_at")
    .eq("thread_id", currentSupportThread.id)
    .order("created_at", { ascending: true });
  if (error) {
    console.error(error);
    clientSupportMessages.innerHTML = '<div class="support-empty">Support messages could not be loaded.</div>';
    return;
  }
  renderSupportMessages(clientSupportMessages, data || [], currentUser.id);
}

async function initialiseClientSupport() {
  if (!clientSupportMessages || !currentUser) return;
  try {
    currentSupportThread = await getOrCreateClientThread();
    await loadClientSupportMessages();
    if (supportChannel) await ufkSupabase.removeChannel(supportChannel);
    supportChannel = ufkSupabase
      .channel(`ufk-client-support-${currentSupportThread.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `thread_id=eq.${currentSupportThread.id}`
      }, async payload => {
        await loadClientSupportMessages();
        if (payload.new?.sender_role === "admin" && !supportChatIsOpen) {
          supportChatUnreadCount += 1;
          updateSupportUnreadBadge();
          showToast("New reply from UFK support.");
        }
      })
      .subscribe();
  } catch (error) {
    console.error("Client support setup failed:", error);
    clientSupportMessages.innerHTML = '<div class="support-empty">Live support is unavailable until the new Supabase SQL is installed.</div>';
  }
}

if (clientSupportForm) clientSupportForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!currentUser || !currentSupportThread) return;
  const input = document.querySelector("#client-support-input");
  const message = input.value.trim();
  if (!message) return;
  const button = clientSupportForm.querySelector("button");
  button.disabled = true;
  const { error } = await ufkSupabase.from("support_messages").insert({
    thread_id: currentSupportThread.id,
    sender_id: currentUser.id,
    sender_role: "client",
    message
  });
  button.disabled = false;
  if (error) {
    console.error(error);
    showToast("Message could not be sent.");
    return;
  }
  input.value = "";
  await loadClientSupportMessages();
});

async function renderAdminSupportInbox(profiles = window.__ufkAdminProfiles || []) {
  if (!adminSupportThreads) return;
  const { data: threads, error } = await ufkSupabase
    .from("support_threads")
    .select("id, user_id, subject, status, updated_at")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error(error);
    adminSupportThreads.innerHTML = '<div class="support-empty">Support inbox unavailable.</div>';
    return;
  }
  const profileMap = new Map(profiles.map(profile => [profile.id, profile]));
  const safeThreads = threads || [];
  adminSupportThreads.innerHTML = safeThreads.length ? safeThreads.map(thread => {
    const profile = profileMap.get(thread.user_id) || {};
    return `<button class="support-thread-button ${selectedAdminThreadId === thread.id ? "is-active" : ""}" type="button" data-thread-id="${thread.id}" data-user-id="${thread.user_id}">
      ${escapeAccountHtml(profile.display_name || profile.email || "UFK Client")}
      <span>${escapeAccountHtml(profile.email || "")}</span>
      <span>${escapeAccountHtml(thread.status)} · ${new Date(thread.updated_at).toLocaleString("en-GB")}</span>
    </button>`;
  }).join("") : '<div class="support-empty">No client conversations yet.</div>';

  if (!selectedAdminThreadId && safeThreads[0]) {
    selectedAdminThreadId = safeThreads[0].id;
    await loadAdminSupportMessages();
    await renderAdminSupportInbox(profiles);
  await renderAdminTopupRequests();
  }
}

async function loadAdminSupportMessages() {
  if (!selectedAdminThreadId || !currentUser) {
    adminSupportMessages.innerHTML = '<div class="support-empty">Select a client conversation.</div>';
    return;
  }
  const { data, error } = await ufkSupabase
    .from("support_messages")
    .select("id, thread_id, sender_id, sender_role, message, created_at")
    .eq("thread_id", selectedAdminThreadId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error(error);
    adminSupportMessages.innerHTML = '<div class="support-empty">Messages could not be loaded.</div>';
    return;
  }
  renderSupportMessages(adminSupportMessages, data || [], currentUser.id);
}

if (adminSupportThreads) adminSupportThreads.addEventListener("click", async event => {
  const button = event.target.closest(".support-thread-button");
  if (!button) return;
  selectedAdminThreadId = button.dataset.threadId;
  await renderAdminSupportInbox();
  await loadAdminSupportMessages();
});

if (adminSupportForm) adminSupportForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!selectedAdminThreadId || !currentUser) return;
  const input = document.querySelector("#admin-support-input");
  const message = input.value.trim();
  if (!message) return;
  const button = adminSupportForm.querySelector("button");
  button.disabled = true;
  const { error } = await ufkSupabase.from("support_messages").insert({
    thread_id: selectedAdminThreadId,
    sender_id: currentUser.id,
    sender_role: "admin",
    message
  });
  button.disabled = false;
  if (error) {
    console.error(error);
    showToast("Reply could not be sent.");
    return;
  }
  input.value = "";
  await loadAdminSupportMessages();
});

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

async function sendSupportMessageForUser(userId, senderRole, message) {
  let { data: thread, error } = await ufkSupabase
    .from("support_threads")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!thread) {
    const created = await ufkSupabase
      .from("support_threads")
      .insert({ user_id: userId, subject: "Purchase approval", status: "open" })
      .select("id")
      .single();
    if (created.error) throw created.error;
    thread = created.data;
  }
  const inserted = await ufkSupabase.from("support_messages").insert({
    thread_id: thread.id,
    sender_id: currentUser.id,
    sender_role: senderRole,
    message
  });
  if (inserted.error) throw inserted.error;
  return thread.id;
}

function publicApprovalUrl(orderId) {
  return `${window.location.origin}${window.location.pathname}#order-${orderId}`;
}

function showPaymentApproved(order) {
  if (!paymentWaiting) return;
  paymentWaiting.innerHTML = `<span class="payment-approved-mark">✓</span><div><strong>The admin has approved this purchase</strong><p>${escapeAccountHtml(order.item_name || currentCheckoutItem.item)} is approved and saved to your account.</p><a class="public-order-link" href="#order-${escapeAccountHtml(order.id)}" data-close-payment>View the public approval</a></div>`;
  paymentWaiting.classList.remove("is-hidden");
  paymentChoiceActions?.classList.add("is-hidden");
  otherPaymentConfirm?.classList.add("is-hidden");
  paymentWaiting.querySelector("[data-close-payment]")?.addEventListener("click", closePaymentModal);
}

async function watchPendingPayment(orderId) {
  pendingOtherPaymentOrderId = orderId;
  if (pendingPaymentChannel) await ufkSupabase.removeChannel(pendingPaymentChannel);
  pendingPaymentChannel = ufkSupabase.channel(`ufk-payment-approval-${orderId}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, async payload => {
      if (payload.new?.status === "Admin approved" || payload.new?.public_log) {
        showPaymentApproved(payload.new);
        await Promise.all([renderClientArea(), loadPublicOrderLog()]);
        showToast("The admin has approved your purchase.");
      }
    }).subscribe();
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
        { name: "Order Type", value: order.order_type === "free" ? "Free download" : (order.payment_method || "Website payment"), inline: true },
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


async function loadClientTopupRequests() {
  if (!creditTopupStatus || !currentUser) return;
  const { data, error } = await ufkSupabase.from("credit_topup_requests")
    .select("id, amount_cents, payment_method, status, created_at")
    .eq("user_id", currentUser.id).order("created_at", { ascending: false }).limit(5);
  if (error) { creditTopupStatus.textContent = "Top-up history could not be loaded."; return; }
  creditTopupStatus.innerHTML = (data || []).length ? (data || []).map(r =>
    `<div class="credit-request-row"><strong>${moneyFromCents(r.amount_cents)}</strong><span>${escapeAccountHtml(r.payment_method)}</span><span class="credit-status ${escapeAccountHtml(r.status.toLowerCase())}">${escapeAccountHtml(r.status)}</span></div>`
  ).join("") : '<span>No top-up requests yet.</span>';
}

creditTopupForm?.addEventListener("submit", async event => {
  event.preventDefault();
  if (!await ensureSignedIn()) return;
  const amount = Number(document.querySelector("#credit-topup-amount").value);
  const amountCents = Math.round(amount * 100);
  if (!Number.isFinite(amountCents) || amountCents < 100) { showToast("Enter a top-up amount of at least $1."); return; }
  const payload = {
    user_id: currentUser.id,
    customer_email: currentProfile.email || currentUser.email,
    amount_cents: amountCents,
    payment_method: document.querySelector("#credit-topup-method").value,
    payment_reference: document.querySelector("#credit-topup-reference").value.trim(),
    status: "Waiting for admin approval"
  };
  const button = creditTopupForm.querySelector("button"); button.disabled = true;
  const { data, error } = await ufkSupabase.from("credit_topup_requests").insert(payload).select("id").single();
  button.disabled = false;
  if (error) { console.error(error); showToast("Top-up request could not be sent."); return; }
  try {
    currentSupportThread = await getOrCreateClientThread();
    await ufkSupabase.from("support_messages").insert({
      thread_id: currentSupportThread.id, sender_id: currentUser.id, sender_role: "client",
      message: `STORE CREDIT TOP-UP REQUEST\nAmount: ${moneyFromCents(amountCents)}\nMethod: ${payload.payment_method}\nReference: ${payload.payment_reference || "Not supplied"}\nStatus: Waiting for admin approval`
    });
  } catch (e) { console.error(e); }
  creditTopupForm.reset(); await loadClientTopupRequests(); setSupportChatOpen(true);
  showToast("Top-up request sent. Waiting for admin approval.");
});

async function payWithStoreCredit() {
  if (!await ensureSignedIn()) return;
  const priceCents = centsFromPrice(currentCheckoutItem.price);
  if (priceCents <= 0) { showToast("This item does not have a valid store-credit price."); return; }
  payWithCreditButton.disabled = true;
  const { data, error } = await ufkSupabase.rpc("purchase_with_store_credit", {
    p_item_name: currentCheckoutItem.item,
    p_price_cents: priceCents,
    p_price_label: currentCheckoutItem.price
  });
  payWithCreditButton.disabled = false;
  if (error) {
    console.error(error);
    showToast(error.message?.includes("Insufficient") ? "You do not have enough store credit." : "Store-credit payment could not be completed.");
    return;
  }
  const order = Array.isArray(data) ? data[0] : data;
  creditPaymentResult.innerHTML = `<span class="payment-approved-mark">✓</span><div><strong>Paid with store credit</strong><p>Your purchase was approved instantly and added to your account.</p><a class="public-order-link" href="#order-${escapeAccountHtml(order?.id || "")}" data-close-payment>View the public approval</a></div>`;
  creditPaymentResult.classList.remove("is-hidden"); paymentChoiceActions.classList.add("is-hidden");
  creditPaymentResult.querySelector("[data-close-payment]")?.addEventListener("click", closePaymentModal);
  await Promise.all([loadCurrentProfile(), renderClientArea(), loadPublicOrderLog()]);
  showToast("Purchase paid with store credit and approved instantly.");
}
payWithCreditButton?.addEventListener("click", payWithStoreCredit);

async function requestOtherPaymentApproval() {
  if (!await ensureSignedIn()) return null;
  const method = otherPaymentMethod?.value || "Other";
  const order = {
    invoice_id: createInvoiceId(),
    user_id: currentUser.id,
    customer_email: currentProfile.email || currentUser.email,
    item_name: currentCheckoutItem.item,
    price: currentCheckoutItem.price,
    order_type: "paid",
    status: "Waiting for admin approval",
    payment_method: method,
    source: "customer_other_payment",
    public_log: false
  };
  confirmOtherPayment.disabled = true;
  const { data, error } = await ufkSupabase.from("orders").insert(order)
    .select("id, invoice_id, user_id, item_name, price, order_type, status, payment_method, created_at")
    .single();
  confirmOtherPayment.disabled = false;
  if (error) {
    console.error(error);
    showToast("Your approval request could not be sent.");
    return null;
  }
  try {
    currentSupportThread = await getOrCreateClientThread();
    await ufkSupabase.from("support_messages").insert({
      thread_id: currentSupportThread.id,
      sender_id: currentUser.id,
      sender_role: "client",
      message: `PURCHASE APPROVAL REQUEST\nItem: ${data.item_name}\nPrice: ${data.price}\nPaid via: ${data.payment_method}\nInvoice: ${data.invoice_id}\nStatus: Waiting for admin approval`
    });
  } catch (chatError) { console.error("Approval chat message failed:", chatError); }
  await sendOrderToDiscord(data);
  await watchPendingPayment(data.id);
  otherPaymentConfirm?.classList.add("is-hidden");
  paymentWaiting?.classList.remove("is-hidden");
  await renderClientArea();
  setSupportChatOpen(true);
  showToast("Waiting for admin approval. Your request was sent.");
  return data;
}

confirmOtherPayment?.addEventListener("click", requestOtherPaymentApproval);

async function saveCurrentCheckout() {
  return recordOrder({
    item: currentCheckoutItem.item,
    price: currentCheckoutItem.price,
    type: "paid",
    status: "Stripe checkout opened"
  });
}

accountNavButton.addEventListener("click", openAccountModal);
if (navCreditBalance) navCreditBalance.addEventListener("click", openAccountModal);
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
  const remember = document.querySelector("#login-remember")?.checked !== false;
  if (remember) localStorage.setItem("ufk-remembered-email", email);
  else localStorage.removeItem("ufk-remembered-email");

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
      .select("id, display_name, email, role, revoked, store_credit_cents, created_at")
      .order("created_at", { ascending: false }),
    ufkSupabase
      .from("orders")
      .select("id, invoice_id, user_id, customer_email, item_name, price, order_type, status, payment_method, source, public_log, approved_at, delivery_path, delivery_filename, created_at")
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

  window.__ufkAdminProfiles = profiles;
  await renderAdminSupportInbox(profiles);

  adminClients.innerHTML = profiles.map(client => {
    const clientOrders = orders.filter(order => order.user_id === client.id);
    const orderHtml = clientOrders.length ? clientOrders.map(order => `
      <article class="admin-order-row">
        <div>
          <h4>${escapeAccountHtml(order.item_name)}</h4>
          <div class="admin-order-meta">
            <span>Invoice ${escapeAccountHtml(order.invoice_id)}</span>
            <span>${escapeAccountHtml(order.price || "—")}</span>
            <span>${new Date(order.created_at).toLocaleString("en-GB")}</span><span>${escapeAccountHtml(order.payment_method || "Stripe")}</span>${order.source === "admin_override" ? `<span class="admin-order-source">Admin override</span>` : ""}
          </div>
        </div>
        <div class="admin-order-controls">
          <select class="admin-status-select" data-order-id="${escapeAccountHtml(order.id)}" aria-label="Order status">
            ${["Waiting for admin approval","Order created","Stripe checkout opened","Admin approved","Payment received","In progress","Delivered","Free download issued","Cancelled"].map(status =>
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
          ${order.status === "Waiting for admin approval" ? `<button class="admin-approve-purchase" type="button" data-order-id="${escapeAccountHtml(order.id)}" data-user-id="${escapeAccountHtml(order.user_id)}" data-item="${escapeAccountHtml(order.item_name)}" data-invoice="${escapeAccountHtml(order.invoice_id)}">Approve this purchase</button>` : ""}
          <button class="admin-log-button ${order.public_log ? "is-published" : ""}" type="button" data-order-id="${escapeAccountHtml(order.id)}" data-public="${order.public_log}">${order.public_log ? "Published in log" : "Approve & publish"}</button>
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
              <span>Credit: ${moneyFromCents(client.store_credit_cents || 0)}</span>
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
        <form class="admin-credit-adjust" data-user-id="${escapeAccountHtml(client.id)}">
          <h4>Adjust store credit</h4>
          <div class="manual-order-grid"><input name="amount" type="number" step="0.01" required placeholder="Amount, e.g. 10 or -5"><input name="note" required placeholder="Reason / payment reference"><button class="button secondary" type="submit">Update balance</button></div>
        </form>
        <form class="admin-manual-order" data-user-id="${escapeAccountHtml(client.id)}" data-email="${escapeAccountHtml(client.email)}">
          <h4>Add purchase manually</h4>
          <div class="manual-order-grid">
            <input name="item" required placeholder="Kit or service name">
            <input name="price" required placeholder="$10">
            <select name="payment"><option>PayPal</option><option>Cash App</option><option>Bank transfer</option><option>Discord payment</option><option>Gift</option><option>Other</option></select>
            <select name="status"><option>Admin approved</option><option>Payment received</option><option>In progress</option><option>Delivered</option></select>
          </div>
          <div class="manual-order-actions"><label><input type="checkbox" name="publicLog" checked> Post to public approved-order log</label><button class="button primary" type="submit">Add to client account</button></div>
        </form>
      </article>`;
  }).join("");
}


async function renderAdminTopupRequests() {
  if (!adminTopupRequests || currentProfile?.role !== "admin") return;
  const { data, error } = await ufkSupabase.from("credit_topup_requests")
    .select("id, user_id, customer_email, amount_cents, payment_method, payment_reference, status, created_at")
    .order("created_at", { ascending: false }).limit(50);
  if (error) { console.error(error); adminTopupRequests.innerHTML = '<div class="support-empty">Top-up requests unavailable.</div>'; return; }
  adminTopupRequests.innerHTML = (data || []).length ? (data || []).map(r => `<article class="admin-topup-card">
    <div><strong>${escapeAccountHtml(r.customer_email)}</strong><p>${moneyFromCents(r.amount_cents)} via ${escapeAccountHtml(r.payment_method)} · ${escapeAccountHtml(r.payment_reference || "No reference")}</p><small>${new Date(r.created_at).toLocaleString("en-GB")}</small></div>
    <div><span class="credit-status">${escapeAccountHtml(r.status)}</span>${r.status === "Waiting for admin approval" ? `<button class="button primary admin-approve-topup" type="button" data-request-id="${r.id}" data-user-id="${r.user_id}" data-amount="${r.amount_cents}">Approve credit</button>` : ""}</div>
  </article>`).join("") : '<div class="support-empty">No top-up requests.</div>';
}

adminTopupRequests?.addEventListener("click", async event => {
  const button = event.target.closest(".admin-approve-topup"); if (!button) return;
  button.disabled = true;
  const { error } = await ufkSupabase.rpc("approve_credit_topup", { p_request_id: button.dataset.requestId });
  if (error) { console.error(error); button.disabled = false; showToast("Top-up could not be approved."); return; }
  try { await sendSupportMessageForUser(button.dataset.userId, "admin", `Your store-credit top-up of ${moneyFromCents(button.dataset.amount)} has been approved and added to your account balance.`); } catch(e) { console.error(e); }
  await renderAdminDashboard(); showToast("Store credit approved and added.");
});

adminNavButton.addEventListener("click", openAdminArea);

adminLoginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const email = document.querySelector("#admin-login-email").value.trim().toLowerCase();
  const password = document.querySelector("#admin-login-password").value;
  const remember = document.querySelector("#admin-login-remember")?.checked !== false;
  if (remember) localStorage.setItem("ufk-remembered-admin-email", email);
  else localStorage.removeItem("ufk-remembered-admin-email");

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
  const approveButton = event.target.closest(".admin-approve-purchase");
  if (approveButton) {
    approveButton.disabled = true;
    const approvedAt = new Date().toISOString();
    const { error } = await ufkSupabase.from("orders").update({
      status: "Admin approved",
      public_log: true,
      approved_at: approvedAt,
      admin_note: "Admin approved this purchase"
    }).eq("id", approveButton.dataset.orderId);
    if (error) {
      console.error(error);
      approveButton.disabled = false;
      showToast("Purchase could not be approved.");
      return;
    }
    const approvalLink = publicApprovalUrl(approveButton.dataset.orderId);
    try {
      await sendSupportMessageForUser(
        approveButton.dataset.userId,
        "admin",
        `The admin has approved this purchase.\nItem: ${approveButton.dataset.item}\nInvoice: ${approveButton.dataset.invoice}\nPublic approval: ${approvalLink}`
      );
    } catch (chatError) { console.error("Approval reply failed:", chatError); }
    await Promise.all([renderAdminDashboard(), loadPublicOrderLog()]);
    showToast("Purchase approved, sent to the client, and published publicly.");
    return;
  }

  const logButton = event.target.closest(".admin-log-button");
  if (logButton) {
    const currentlyPublic = logButton.dataset.public === "true";
    const { error } = await ufkSupabase
      .from("orders")
      .update({
        public_log: !currentlyPublic,
        approved_at: !currentlyPublic ? new Date().toISOString() : null,
        status: !currentlyPublic ? "Admin approved" : undefined
      })
      .eq("id", logButton.dataset.orderId);
    if (error) {
      console.error(error);
      showToast("Public order log could not be updated.");
      return;
    }
    await Promise.all([renderAdminDashboard(), loadPublicOrderLog()]);
    showToast(currentlyPublic ? "Purchase removed from public log." : "Purchase approved and published.");
    return;
  }

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


adminClients.addEventListener("submit", async event => {
  const creditForm = event.target.closest(".admin-credit-adjust");
  if (creditForm) {
    event.preventDefault();
    const fields = new FormData(creditForm);
    const amountCents = Math.round(Number(fields.get("amount")) * 100);
    if (!Number.isFinite(amountCents) || amountCents === 0) { showToast("Enter a valid credit adjustment."); return; }
    const submit = creditForm.querySelector('button[type="submit"]'); submit.disabled = true;
    const { error } = await ufkSupabase.rpc("admin_adjust_store_credit", { p_user_id: creditForm.dataset.userId, p_amount_cents: amountCents, p_note: String(fields.get("note") || "Admin adjustment") });
    submit.disabled = false;
    if (error) { console.error(error); showToast("Balance could not be updated."); return; }
    creditForm.reset(); await renderAdminDashboard(); showToast("Store-credit balance updated."); return;
  }
  const form = event.target.closest(".admin-manual-order");
  if (!form) return;
  event.preventDefault();
  const fields = new FormData(form);
  const shouldPublish = fields.get("publicLog") === "on";
  const status = String(fields.get("status") || "Admin approved");
  const order = {
    invoice_id: createInvoiceId(),
    user_id: form.dataset.userId,
    customer_email: form.dataset.email,
    item_name: String(fields.get("item") || "").trim(),
    price: String(fields.get("price") || "").trim(),
    order_type: "paid",
    status,
    payment_method: String(fields.get("payment") || "Other"),
    source: "admin_override",
    public_log: shouldPublish,
    approved_at: shouldPublish ? new Date().toISOString() : null
  };
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  const { error } = await ufkSupabase.from("orders").insert(order);
  submit.disabled = false;
  if (error) {
    console.error(error);
    showToast("Manual purchase could not be added.");
    return;
  }
  form.reset();
  await Promise.all([renderAdminDashboard(), loadPublicOrderLog()]);
  showToast("Purchase added to the client account.");
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
  updateSupportChatVisibility();
  if (currentUser && currentProfile?.role !== "admin") await initialiseClientSupport();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeAccountModal();
    setSupportChatOpen(false);
  }
});

(async function initialiseSharedAccounts() {
  const rememberedEmail = localStorage.getItem("ufk-remembered-email");
  const rememberedAdminEmail = localStorage.getItem("ufk-remembered-admin-email");
  if (rememberedEmail) document.querySelector("#login-email").value = rememberedEmail;
  if (rememberedAdminEmail) document.querySelector("#admin-login-email").value = rememberedAdminEmail;
  await loadCurrentProfile();
  updateAccountNav();
  updateSupportChatVisibility();
  if (currentUser && currentProfile?.role !== "admin") await initialiseClientSupport();
  await loadPublicOrderLog();
  ufkSupabase
    .channel("ufk-public-order-log")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, loadPublicOrderLog)
    .subscribe();
})();
