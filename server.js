const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const { Resend } = require("resend");

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
app.use(express.static(path.join(__dirname)));

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post("/api/notify", async (req, res) => {
  const email = (req.body && req.body.email ? String(req.body.email) : "").trim().toLowerCase();

  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: "Invalid email address." });
  }

  if (!resend || !fromEmail) {
    return res.status(500).json({ error: "Email service is not configured." });
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "KAO Global | You're on the Notify List",
      html: `
        <div style="font-family: Helvetica, Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin: 0 0 12px;">Thanks for subscribing</h2>
          <p style="margin: 0 0 12px;">
            You are now on the KAO Global notify list.
          </p>
          <p style="margin: 0 0 12px;">
            We will contact you with updates on our infrastructure, networking, and secure deployment solutions.
          </p>
          <p style="margin: 20px 0 0; color: #6b7280;">KAO Global Consulting Private Limited</p>
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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
