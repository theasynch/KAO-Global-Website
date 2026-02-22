const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const cors = require("cors");
const { Resend } = require("resend");
console.log("BOOT_KAO_API_v1");


dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.FROM_EMAIL;

let resend = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
}

app.use(express.json());

const allowOrigin = (origin) => {
  if (!origin) return true;

  if (/^https:\/\/([a-z0-9-]+\.)*kaoglobal\.in$/i.test(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;

  return false;
};

const corsOptions = {
  origin(origin, callback) {
    if (allowOrigin(origin)) return callback(null, true);
    return callback(new Error("CORS blocked for this origin."));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.static(path.join(__dirname)));

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "kao-notify-api" });
});

app.get("/api/notify", (_req, res) => {
  res.status(405).json({ error: "Use POST /api/notify" });
});

function toDisplayName(email) {
  const localPart = email.split("@")[0] || "";
  const cleaned = localPart.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return "there";
  return cleaned
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getFormattedDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

app.post("/api/notify", async (req, res) => {
  const email = (req.body && req.body.email ? String(req.body.email) : "").trim().toLowerCase();

  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: "Invalid email address." });
  }

  if (!resend || !fromEmail) {
    return res.status(500).json({ error: "Email service is not configured." });
  }

  try {
    const displayName = toDisplayName(email);
    const today = getFormattedDate();

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Welcome to KAO Global, ${displayName}`,
      html: `
        <div style="margin:0;padding:24px;background:#f3f4f6;font-family:Helvetica,Arial,sans-serif;color:#111827;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:24px 28px;background:linear-gradient(135deg,#fff5f5,#ffffff);border-bottom:1px solid #fee2e2;">
                <h1 style="margin:0;font-size:26px;line-height:1.2;color:#111827;">KAO Global Consulting</h1>
                <p style="margin:8px 0 0;font-size:13px;letter-spacing:0.06em;color:#cc1717;text-transform:uppercase;">Subscription Confirmed</p>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 18px;">
                <p style="margin:0 0 12px;font-size:16px;line-height:1.6;">Hi ${displayName},</p>
                <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#374151;">
                  You are now subscribed to KAO Global updates as of <strong>${today}</strong>.
                </p>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#374151;">
                  We will keep you informed about infrastructure strategy, advanced networking, and secure deployment solutions.
                </p>
                <a href="https://kaoglobal.in" style="display:inline-block;padding:12px 18px;background:#0b0f19;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;">Visit KAO Global</a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 24px;border-top:1px solid #f3f4f6;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
                  KAO Global Consulting Private Limited<br />
                  This is an automated confirmation email.
                </p>
              </td>
            </tr>
          </table>
        </div>
      `
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("Email send error:", error);
    const providerMessage =
      (error && error.message) ||
      (error && error.error && error.error.message) ||
      "Failed to send notification email.";
    return res.status(500).json({ error: providerMessage });
  }
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled server error:", err);
  const status = err && err.message === "CORS blocked for this origin." ? 403 : 500;
  return res.status(status).json({ error: err.message || "Internal server error." });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
