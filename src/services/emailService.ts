import emailjs from '@emailjs/browser';

// --- CONFIGURATION FROM YOUR SCREENSHOTS ---
const SERVICE_ID = "service_eqrbs0v";       // From Email Services screen
const TEMPLATE_ID_INVITE = "template_usz6c6u"; // From Email Templates screen
const TEMPLATE_ID_DOC = "template_usz6c6u";    // Using the same template for now
const PUBLIC_KEY = "W0kvh4Mc_PKDX4AQf";     // From Account screen

export const sendInviteEmail = async (
  toEmail: string,
  toName: string,
  role: string,
  orgName: string,
  inviterName: string
) => {
  try {
    console.log(`Attempting to send invite to ${toEmail}...`);

    const templateParams = {
      to_email: toEmail,
      to_name: toName,
      role: role,
      org_name: orgName,
      inviter_name: inviterName,
      invite_link: window.location.origin, 
    };

    const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID_INVITE, templateParams, PUBLIC_KEY);
    
    console.log("✅ Email sent successfully!", response.status, response.text);
    return true;
  } catch (error) {
    console.error("❌ FAILED to send email.", error);
    throw error;
  }
};

export const sendDocumentEmail = async (
  toEmail: string,
  documentTitle: string,
  documentLink: string,
  _message: string
) => {
  try {
    console.log(`Attempting to send document to ${toEmail}...`);

    const templateParams = {
      to_email: toEmail,
      to_name: "User", 
      org_name: documentTitle, 
      inviter_name: "EviroSafe System",
      role: "Viewer",
      invite_link: documentLink, 
    };

    await emailjs.send(SERVICE_ID, TEMPLATE_ID_DOC, templateParams, PUBLIC_KEY);
    console.log("✅ Document email sent successfully!");
    return true;
  } catch (error) {
    console.error("❌ FAILED to send document email.", error);
    throw error;
  }
};