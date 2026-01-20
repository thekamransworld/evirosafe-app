import emailjs from '@emailjs/browser';

// --- CONFIGURATION ---

// 1. Service ID (From your screenshot)
const SERVICE_ID = "service_eqrbs0v"; 

// 2. Template ID (From your previous screenshot)
// You had "uhdeh92" open in the editor previously.
const TEMPLATE_ID_INVITE = "uhdeh92"; 
const TEMPLATE_ID_DOC = "uhdeh92"; 

// 3. Public Key (YOU NEED TO PASTE THIS)
// Go to EmailJS Dashboard -> Account -> Public Key
const PUBLIC_KEY = "W0kvh4Mc_PKDX4AQf"; 


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
    alert("Email failed to send. Please check the console for the specific error.");
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