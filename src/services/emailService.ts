import emailjs from '@emailjs/browser';

// --- CONFIGURATION ---
const SERVICE_ID = "service_eqrbs0v"; 
const TEMPLATE_ID_INVITE = "template_usz6c6u"; 
const TEMPLATE_ID_DOC = "template_usz6c6u"; // Using the same template for docs for now
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
      invite_link: window.location.origin, // The URL of your app
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
      // We map these to the variables available in your 'Welcome' template
      // Since we are reusing the invite template, we map title -> org_name for now
      // Ideally, you create a specific 'Document' template later.
      to_name: "User", 
      org_name: documentTitle, 
      inviter_name: "EviroSafe System",
      role: "Viewer",
      invite_link: documentLink,
    };

    await emailjs.send(SERVICE_ID, TEMPLATE_ID_DOC, templateParams, PUBLIC_KEY);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
};