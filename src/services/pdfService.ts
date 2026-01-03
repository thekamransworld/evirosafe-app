import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePdf = async (elementId: string, fileName: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    // 1. Capture the element as a high-res canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Increases resolution for crisp text
      useCORS: true, // Allows loading cross-origin images (like avatars)
      logging: false,
      backgroundColor: '#fdfbf7', // Match certificate background
      windowWidth: 1920 // Force desktop rendering width
    });

    // 2. Convert to PDF
    const imgData = canvas.toDataURL('image/png');
    
    // A4 Landscape dimensions in mm
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = 297;
    const pdfHeight = 210;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${fileName}.pdf`);

  } catch (error) {
    console.error("PDF Generation Error:", error);
    alert("Failed to generate PDF. Please try again.");
  }
};