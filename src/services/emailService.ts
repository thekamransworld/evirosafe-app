import emailjs from '@emailjs/browser';

// --- CONFIGURATION ---
const SERVICE_ID = "service_eqrbs0v"; 
const TEMPLATE_ID_INVITE = "template_usz6c6u"; 
const TEMPLATE_ID_DOC = "template_usz6c6u"; 
const TEMPLATE_ID_ALERT = "template_usz6c6u"; // Reusing for demo, ideally create a specific alert template
const PUBLIC_KEY = "W0kvh4Mc_PKDX4AQf"; 

export const sendInviteEmail = async (
  toEmail: string,
  toName: string,
  role: string,
  orgName: string,
  inviterName: string
) => {
  try {
    const templateParams = {
      to_email: toEmail,
      to_name: toName,
      role: role,
      org_name: orgName,
      inviter_name: inviterName,
      invite_link: window.location.origin,
      message: `You have been invited to join ${orgName} as a ${role}.`
    };

    await emailjs.send(SERVICE_ID, TEMPLATE_ID_INVITE, templateParams, PUBLIC_KEY);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
};

export const sendDocumentEmail = async (
  toEmail: string,
  documentTitle: string,
  documentLink: string,
  message: string
) => {
  try {
    const templateParams = {
      to_email: toEmail,
      to_name: "User", 
      org_name: documentTitle, 
      inviter_name: "EviroSafe System",
      role: "Viewer",
      invite_link: documentLink,
      message: message
    };

    await emailjs.send(SERVICE_ID, TEMPLATE_ID_DOC, templateParams, PUBLIC_KEY);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
};

// --- NEW: RISK ESCALATION ALERT ---
export const sendRiskAlert = async (
  recipients: string[],
  reportType: string,
  riskLevel: string,
  description: string,
  reportId: string
) => {
  if (recipients.length === 0) return;

  try {
    // Send to all recipients (in parallel)
    const promises = recipients.map(email => {
      const templateParams = {
        to_email: email,
        to_name: "Safety Stakeholder",
        org_name: "EviroSafe Alert System",
        inviter_name: "Automated Bot",
        role: "Responder",
        invite_link: `${window.location.origin}?report=${reportId}`,
        message: `URGENT: A ${riskLevel} Risk ${reportType} has been reported.\n\nDescription: ${description}\n\nImmediate action required.`
      };
      return emailjs.send(SERVICE_ID, TEMPLATE_ID_ALERT, templateParams, PUBLIC_KEY);
    });

    await Promise.all(promises);
    console.log(`Risk alert sent to ${recipients.length} recipients.`);
    return true;
  } catch (error) {
    console.error("Failed to send risk alert:", error);
    // Don't throw, just log, so the report still saves
    return false;
  }
};