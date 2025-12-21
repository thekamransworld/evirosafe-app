import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePdf = async (elementId: string, fileName: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  // Visual feedback that download is starting
  const originalCursor = document.body.style.cursor;
  document.body.style.cursor = 'wait';

  try {
    // 1. Capture the element as a high-res canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true, // Allow loading cross-origin images (like signatures/logos)
      logging: false,
      backgroundColor: '#ffffff', // Force white background for print
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });

    // 2. Calculate PDF dimensions (A4)
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // 3. Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // 4. Add extra pages if content is long
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // 5. Save
    pdf.save(`${fileName}.pdf`);

  } catch (error) {
    console.error('PDF Generation failed:', error);
    alert('Failed to generate PDF. Please try again.');
  } finally {
    document.body.style.cursor = originalCursor;
  }
};