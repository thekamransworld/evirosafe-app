import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePdf = async (elementId: string, fileName: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    alert("Could not find content to print.");
    return;
  }

  try {
    // 1. Create a clone of the element to render the FULL height (not just visible part)
    const clone = element.cloneNode(true) as HTMLElement;
    
    // 2. Style the clone to ensure it renders correctly off-screen
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '0';
    clone.style.width = '1000px'; // Fixed A4-like width
    clone.style.height = 'auto';
    clone.style.overflow = 'visible';
    clone.style.background = '#ffffff';
    clone.style.color = '#000000'; // Force black text
    document.body.appendChild(clone);

    // 3. Capture the clone
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1000
    });

    // 4. Clean up
    document.body.removeChild(clone);

    // 5. Generate PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    // Calculate ratio to fit width
    const ratio = pdfWidth / imgWidth;
    const finalHeight = imgHeight * ratio;

    // If content is longer than one page, we might need multiple pages, 
    // but for now, let's fit to width and allow it to stretch or cut (basic implementation)
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, finalHeight);
    
    pdf.save(`${fileName}.pdf`);

  } catch (error) {
    console.error("PDF Generation Error:", error);
    alert("Failed to generate PDF.");
  }
};