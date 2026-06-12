const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Compliance = require('../models/Compliance');
const AlertLog = require('../models/AlertLog');
const User = require('../models/User');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"CompliTrack JPL Mines" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error(`Email failed to ${to}:`, err.message);
  }
};

const getReminderHTML = (compliance, type) => {
  const color = type === 'overdue' ? '#E24B4A' : type === 'escalation' ? '#EF9F27' : '#639922';
  const label = type === 'overdue' ? '🔴 OVERDUE' : type === 'escalation' ? '🟡 ESCALATION' : '🟢 REMINDER';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background: #1a1a2e; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0;">CompliTrack — JPL Mines</h2>
        <p style="color: #aaa; margin: 4px 0 0;">Compliance Alert System</p>
      </div>
      <div style="padding: 24px;">
        <div style="background: ${color}22; border-left: 4px solid ${color}; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
          <strong style="color: ${color}; font-size: 16px;">${label}</strong>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; color: #666; width: 40%;">Compliance ID</td>
            <td style="padding: 10px; font-weight: bold;">${compliance.complianceId}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; color: #666;">Title</td>
            <td style="padding: 10px;">${compliance.title}</td>
          </tr>
       
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; color: #666;">Due Date</td>
            <td style="padding: 10px; color: ${color}; font-weight: bold;">${compliance.dueDate}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; color: #666;">Authority</td>
            <td style="padding: 10px;">${compliance.Submission_Authority}</td>
          </tr>
    
        </table>
        <div style="margin-top: 24px; padding: 16px; background: #f9f9f9; border-radius: 4px;">
          <p style="margin: 0; font-size: 13px; color: #666;">Please log in to CompliTrack to update the status and upload completion proof.</p>
        </div>
      </div>
      <div style="background: #f1f1f1; padding: 12px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #999;">This is an automated alert from CompliTrack | JPL Mines</p>
      </div>
    </div>
  `;
};

const isSameDay = (date1, date2) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const runAlertJob = async () => {
  console.log('Running compliance alert job:', new Date().toISOString());

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const admins = await User.find({ role: 'admin' }).select('email name');
    const adminEmails = admins.map(a => a.email).join(',');

    const compliances = await Compliance.find({
      status: { $ne: 'Completed' },
      type: 'recurring'
    }).populate('Signing_Authority', 'email name');

    let sentCount = 0;

    for (const compliance of compliances) {

      // skip if already emailed today
      const alreadyAlerted = await AlertLog.findOne({
        complianceId: compliance.complianceId,
        sentAt: { $gte: today }
      });
      if (alreadyAlerted) continue;

      const assignedEmail = compliance.Signing_Authority?.email;
      const recipients = assignedEmail || adminEmails;

      const dueDate = new Date(compliance.dueDate);
      const alertDate = new Date(compliance.alertDate);
      const isValidDue = !isNaN(dueDate.getTime());
      const isValidAlert = !isNaN(alertDate.getTime());

      // CASE 1 — today is exactly the due date → send DUE TODAY email
      if (isValidDue && isSameDay(today, dueDate)) {
        await sendEmail(
          [adminEmails, assignedEmail].filter(Boolean).join(','),
          `📅 DUE TODAY: ${compliance.complianceId} — ${compliance.title}`,
          getReminderHTML(compliance, 'escalation')
        );
        await AlertLog.create({
          complianceId: compliance.complianceId,
          complianceTitle: compliance.title,
          sentTo: [adminEmails, assignedEmail].filter(Boolean).join(','),
          type: 'escalation'
        });
        sentCount++;
        continue;
      }

      // CASE 2 — today is past due date → send OVERDUE email
      if (isValidDue && today > dueDate) {
        await sendEmail(
          [adminEmails, assignedEmail].filter(Boolean).join(','),
          `🔴 OVERDUE: ${compliance.complianceId} — ${compliance.title}`,
          getReminderHTML(compliance, 'overdue')
        );
        await AlertLog.create({
          complianceId: compliance.complianceId,
          complianceTitle: compliance.title,
          sentTo: [adminEmails, assignedEmail].filter(Boolean).join(','),
          type: 'overdue'
        });
        sentCount++;
        continue;
      }

      // CASE 3 — today is exactly the alert date → send REMINDER email
      if (isValidAlert && isSameDay(today, alertDate)) {
        await sendEmail(
          recipients,
          `🟢 REMINDER: ${compliance.complianceId} — ${compliance.title}`,
          getReminderHTML(compliance, 'reminder')
        );
        await AlertLog.create({
          complianceId: compliance.complianceId,
          complianceTitle: compliance.title,
          sentTo: recipients,
          type: 'reminder'
        });
        sentCount++;
        continue;
      }
    }

    console.log(`Alert job done — Emails sent: ${sentCount}`);
  } catch (err) {
    console.error('Alert job error:', err.message);
  }
};

// Runs every day at 10:00 AM IST
cron.schedule('30 14 * * *', runAlertJob, {
  timezone: 'Asia/Kolkata'
});

module.exports = { runAlertJob };