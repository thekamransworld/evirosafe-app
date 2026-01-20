import emailjs from '@emailjs/browser';

// --- REPLACE THESE WITH YOUR KEYS FROM EMAILJS.COM ---
const SERVICE_ID = "service_eqrbs0v";       // e.g. service_m9p...
const TEMPLATE_ID_INVITE = "template_usz6c6u"; // e.g. template_8s...
const TEMPLATE_ID_DOC = "YOUR_TEMPLATE_ID";    // You can use the same template ID for now
const PUBLIC_KEY = "YOUR_PUBLIC_KEY";       // e.g. user_Kj8...

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
      invite_link: window.location.origin, // This sends the link to your app
    };

    await emailjs.send(SERVICE_ID, TEMPLATE_ID_INVITE, templateParams, PUBLIC_KEY);
    console.log("Email sent successfully to:", toEmail);
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
  _message: string
) => {
  try {
    const templateParams = {
      to_email: toEmail,
      to_name: "User", 
      org_name: documentTitle, // Reusing the 'org_name' variable for document title
      inviter_name: "EviroSafe System",
      role: "Viewer",
      invite_link: documentLink, // Reusing 'invite_link' for document link
    };

    await emailjs.send(SERVICE_ID, TEMPLATE_ID_DOC, templateParams, PUBLIC_KEY);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
};