import jsPDF from "jspdf";
import { StructuredResume } from "@/context/AnalysisContext";

export const generatePDF = async (resume: NonNullable<StructuredResume>): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = margin;

  // Helper to add text and update Y
  const addText = (text: string, fontSize: number, isBold: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setTextColor(color[0], color[1], color[2]);
    
    const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
    doc.text(lines, margin, y);
    y += (lines.length * fontSize * 0.5) + 2;
  };

  const addLine = () => {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  // Header
  addText(resume.personal_info.name, 20, true, [0, 51, 102]);
  y += 2;
  const contactInfo = `${resume.personal_info.email} | ${resume.personal_info.phone} | ${resume.personal_info.location}`;
  addText(contactInfo, 10, false, [100, 100, 100]);
  if (resume.personal_info.linkedin) {
    addText(resume.personal_info.linkedin, 10, false, [0, 102, 204]);
  }
  y += 5;
  addLine();

  // Summary
  addText("PROFESSIONAL SUMMARY", 12, true, [0, 51, 102]);
  addText(resume.summary, 10);
  y += 5;

  // Experience
  addText("PROFESSIONAL EXPERIENCE", 12, true, [0, 51, 102]);
  resume.experience.forEach((exp) => {
    const title = `${exp.role} | ${exp.company}`;
    const dateLoc = `${exp.duration} | ${exp.location}`;
    addText(title, 11, true);
    addText(dateLoc, 9, false, [100, 100, 100]);
    exp.bullets.forEach((bullet) => {
      addText(`• ${bullet}`, 10);
    });
    y += 3;
    
    // Check if we need a new page
    if (y > 270) {
      doc.addPage();
      y = margin;
    }
  });
  y += 5;

  // Projects
  if (resume.projects && resume.projects.length > 0) {
    addText("KEY PROJECTS", 12, true, [0, 51, 102]);
    resume.projects.forEach((proj) => {
      addText(proj.title, 11, true);
      if (proj.description) addText(proj.description, 10, false, [50, 50, 50]);
      if (proj.technologies.length > 0) {
        addText(`Technologies: ${proj.technologies.join(", ")}`, 9, true, [100, 100, 100]);
      }
      proj.bullets.forEach((bullet) => {
        addText(`• ${bullet}`, 10);
      });
      y += 3;

      if (y > 270) {
        doc.addPage();
        y = margin;
      }
    });
    y += 5;
  }

  // Skills
  addText("TECHNICAL SKILLS", 12, true, [0, 51, 102]);
  resume.skills.forEach((skill) => {
    const skillText = `${skill.category}: ${skill.items.join(", ")}`;
    addText(skillText, 10);
  });
  y += 5;

  // Certifications & Achievements
  if ((resume.certifications && resume.certifications.length > 0) || (resume.achievements && resume.achievements.length > 0)) {
    if (resume.certifications && resume.certifications.length > 0) {
      addText("CERTIFICATIONS", 12, true, [0, 51, 102]);
      resume.certifications.forEach((cert) => {
        addText(`${cert.name} - ${cert.issuer} (${cert.date})`, 10);
      });
      y += 5;
    }

    if (resume.achievements && resume.achievements.length > 0) {
      addText("ACHIEVEMENTS", 12, true, [0, 51, 102]);
      resume.achievements.forEach((ach) => {
        addText(`• ${ach}`, 10);
      });
      y += 5;
    }
  }

  // Education
  addText("EDUCATION", 12, true, [0, 51, 102]);
  resume.education.forEach((edu) => {
    const degree = `${edu.degree}, ${edu.institution}`;
    addText(degree, 11, true);
    addText(edu.year, 10, false, [100, 100, 100]);
    y += 2;
  });

  return doc.output("blob");
};

