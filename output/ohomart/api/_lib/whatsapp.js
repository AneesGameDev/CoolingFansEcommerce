// Twilio WhatsApp helpers. No-op when credentials are missing.
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || "";
const ADMIN_WHATSAPP_NOTIFY = process.env.ADMIN_WHATSAPP_NOTIFY || "";
const WHATSAPP_AUTO_REPLY =
  process.env.WHATSAPP_AUTO_REPLY ||
  "Hello! Thank you for contacting OHo Mart. We received your message and will reply shortly.";

let _twilio = null;
function getTwilio() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null;
  if (!_twilio) {
    const twilio = require("twilio");
    _twilio = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return _twilio;
}

function withPrefix(num) {
  if (!num) return "";
  return num.startsWith("whatsapp:") ? num : `whatsapp:${num}`;
}

async function sendWhatsApp(to, body) {
  const client = getTwilio();
  if (!client || !to || !TWILIO_WHATSAPP_FROM) return null;
  try {
    const msg = await client.messages.create({
      body,
      from: withPrefix(TWILIO_WHATSAPP_FROM),
      to: withPrefix(to),
    });
    return msg.sid;
  } catch (err) {
    console.error("WhatsApp send failed:", err && err.message);
    return null;
  }
}

async function notifyAdminNewOrder(order) {
  if (!ADMIN_WHATSAPP_NOTIFY) return;
  const items = (order.items || [])
    .map((it) => {
      const color = it.selected_color ? ` [${it.selected_color}]` : "";
      const size = it.selected_size ? ` [${it.selected_size}]` : "";
      return `  • ${it.product_name} x${it.quantity}${color}${size} — Rs.${Math.round(it.line_total).toLocaleString()}`;
    })
    .join("\n");

  const lines = [
    "*NEW ORDER — OHo Mart*",
    `Order: ${order.order_number}`,
    `Customer: ${order.customer_name}`,
    `Phone: ${order.phone}`,
    `City: ${order.city}${order.province ? ", " + order.province : ""}`,
    `Address: ${order.address}`,
    "",
    "Items:",
    items,
    `*Total: Rs.${Math.round(order.total_price).toLocaleString()}*`,
    "Payment: Cash on Delivery",
    `Time: ${new Date().toUTCString()}`,
  ];
  if (order.notes) lines.push(`Notes: ${order.notes}`);

  return sendWhatsApp(ADMIN_WHATSAPP_NOTIFY, lines.join("\n"));
}

module.exports = {
  sendWhatsApp,
  notifyAdminNewOrder,
  WHATSAPP_AUTO_REPLY,
};
