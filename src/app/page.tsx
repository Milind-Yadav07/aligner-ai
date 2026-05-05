"use client";

import { useState, useRef } from "react";
import { FileUp, Sparkles, File as FileIcon, X, Mail, Phone, MapPin, Briefcase, GraduationCap, Code, Terminal, Award, Trophy } from "lucide-react";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { Document } from "@langchain/core/documents";
import { z } from "zod";
import { useAnalysis } from "@/context/AnalysisContext";
import { generatePDF } from "@/utils/pdfGenerator";
import { addToHistory } from "@/lib/db";

// Define the schema for structured resume output
const resumeSchema = z.object({
  personal_info: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    linkedin: z.string().optional(),
  }),
  summary: z.string().describe("A professional summary optimized for the job description using semantic matching."),
  experience: z.array(z.object({
    company: z.string(),
    role: z.string(),
    duration: z.string(),
    location: z.string(),
    bullets: z.array(z.string().describe("Achievement-oriented bullet points aligned semantically with JD requirements.")),
  })).describe("Professional work history. Do not include personal projects here."),
  projects: z.array(z.object({
    title: z.string(),
    description: z.string(),
    technologies: z.array(z.string()),
    link: z.string().optional(),
    bullets: z.array(z.string().describe("Specific contributions and impact of the project.")),
  })).describe("Personal, academic, or open-source projects."),
  skills: z.array(z.object({
    category: z.string(),
    items: z.array(z.string()),
  })),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    year: z.string(),
  })),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string(),
    date: z.string(),
  })).describe("Professional certifications and licenses."),
  achievements: z.array(z.string()).describe("Standalone awards, honors, or significant accomplishments."),
});

const parser = StructuredOutputParser.fromZodSchema(resumeSchema);

export default function Home() {
  const {
    file, setFile,
    jobDescription, setJobDescription,
    optimizedResume, setOptimizedResume
  } = useAnalysis();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!file || !jobDescription) {
      alert("Please upload a resume and paste a job description.");
      return;
    }

    setIsAnalyzing(true);
    setOptimizedResume(null);

    try {
      let docs: Document[] = [];
      const fileType = file.name.split('.').pop()?.toLowerCase();

      // 1. Document Intelligence (Parsing & Loading)
      if (fileType === 'pdf') {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + "\n";
        }
        docs = [new Document({ pageContent: fullText, metadata: { source: file.name } })];
      } else if (fileType === 'docx' || fileType === 'doc') {
        const mammoth = (await import('mammoth')).default;
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        docs = [new Document({ pageContent: result.value, metadata: { source: file.name } })];
      } else {
        alert("Unsupported file format. Please upload PDF or DOCX.");
        setIsAnalyzing(false);
        return;
      }

      const resumeText = docs.map(d => d.pageContent).join("\n");

      // 2. Prompt Orchestration & 4. Semantic Matching
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        alert("API key not found. Please add NEXT_PUBLIC_GEMINI_API_KEY to your .env file.");
        setIsAnalyzing(false);
        return;
      }

      const model = new ChatGoogleGenerativeAI({
        model: "gemini-3-flash-preview", // Use the requested preview version
        apiKey: apiKey,
        temperature: 0.1,
      });

      const promptTemplate = new PromptTemplate({
        template: `You are an elite ATS (Applicant Tracking System) algorithm expert and master professional resume writer. 
        Your absolute goal is to rewrite the provided resume so that it achieves a 100% compatibility score when matched against the provided Job Description.

        SECTION DIFFERENTIATION (CRITICAL):
        - EXPERIENCE: This section is for professional work history with companies.
        - PROJECTS: This section is for personal, academic, or independent projects. DO NOT mix these with work experience.
        - ACHIEVEMENTS & CERTIFICATIONS: You must extract and optimize any standalone awards, honors, or professional certifications mentioned in the source resume.

        SEMANTIC MATCHING STRATEGY:
        - DEEP ALIGNMENT: Identify core responsibilities and technical/soft skills from the JD.
        - TERMINOLOGY MAPPING: Use the JD's exact phrasing where applicable, weaving in related concepts naturally.
        - BRIDGE THE GAP: Reframe existing skills using the JD's vocabulary.

        ATS OPTIMIZATION RULES:
        1. QUANTIFIABLE IMPACT: Use the STAR method (Situation, Task, Action, Result) with metrics.
        2. KEYWORD INTEGRATION: Naturally weave high-priority keywords throughout all sections.
        3. AGGRESSIVE REFRAMING: Rephrase existing facts to mirror JD requirements while staying truthful.
        4. ACTION VERBS: Start every bullet point with strong, industry-standard action verbs.

        CRITICAL INSTRUCTIONS:
        - REFRAME & ADAPT: Heavily adapt the source data to be the perfect match.
        - NO FAKE HISTORY: DO NOT invent facts.
        - STRUCTURED DATA: Return data ONLY in the clean, parseable JSON format requested.

        Job Description:
        {jobDescription}

        Current Resume Text:
        {resumeText}

        {format_instructions}`,
        inputVariables: ["jobDescription", "resumeText"],
        partialVariables: { format_instructions: parser.getFormatInstructions() },
      });

      // 3. Structured Output (JSON Guarantee)
      const chain = promptTemplate.pipe(model).pipe(parser);

      const response = await chain.invoke({
        jobDescription,
        resumeText,
      });

      setOptimizedResume(response);

    } catch (error) {
      console.error("Analysis failed:", error);
      alert("An error occurred during analysis. Check the console for details.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-12 flex-1 flex flex-col lg:flex-row gap-8">
      {/* Left Column: Input Forms */}
      <div className="flex-1 flex flex-col space-y-8 lg:max-w-md xl:max-w-lg">
        <div>
          <h1 className="text-xl font-semibold text-white mb-2">Optimize Your Career</h1>
          <p className="text-slate-400 text-sm">
            Upload your resume and the job description for instant AI-powered alignment.
          </p>
        </div>

        {/* Upload Box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border border-dashed border-slate-700/80 bg-slate-800/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-800/40 transition-colors"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx"
            className="hidden"
          />

          {file ? (
            <div className="flex flex-col items-center">
              <div className="bg-blue-500/10 p-4 rounded-xl mb-4 text-blue-400 relative">
                <FileIcon className="w-8 h-8" />
                <button
                  onClick={clearFile}
                  className="absolute -top-2 -right-2 bg-slate-800 text-slate-300 rounded-full p-1 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-slate-200 font-medium mb-1 truncate max-w-[200px]" title={file.name}>{file.name}</h3>
              <p className="text-slate-500 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <>
              <div className="bg-slate-800 p-3 rounded-xl mb-4 text-slate-300">
                <FileUp className="w-6 h-6" />
              </div>
              <h3 className="text-slate-200 font-medium mb-1">Current Resume</h3>
              <p className="text-slate-400 text-sm mb-4">
                Drag and drop or <span className="text-blue-400 font-medium">browse files</span>
              </p>
              <div className="bg-slate-900/50 px-4 py-1.5 rounded-full text-xs font-medium text-slate-500 uppercase tracking-wider">
                PDF, DOCX (MAX 5MB)
              </div>
            </>
          )}
        </div>

        {/* Job Description Box */}
        <div className="flex flex-col space-y-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full h-48 bg-[#0F172A] border border-slate-800 rounded-xl p-4 text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
            placeholder="Paste the full job description here to identify key skills and missing requirements..."
          ></textarea>
        </div>

        {/* Action Button */}
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-[#A7C8FF] to-[#C4D7FF] text-[#0B1120] font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Sparkles className="w-5 h-5" />
          {isAnalyzing ? "Analyzing..." : "Analyze & Optimize"}
        </button>
      </div>

      {/* Right Column: Results Preview */}
      <div className={`flex-1 bg-[#131C2F] rounded-3xl p-8 border border-white/5 relative overflow-hidden h-auto lg:h-[670px] ${optimizedResume ? 'overflow-y-auto scrollbar-thin scrollbar-thumb-slate-670' : 'flex flex-col items-center justify-center text-center'}`}>

        {isAnalyzing ? (
          <div className="relative z-10 flex flex-col items-center max-w-sm mx-auto">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-6"></div>
            <h2 className="text-lg font-medium text-white mb-2">Analyzing Resume...</h2>
            <p className="text-slate-400 text-sm leading-relaxed text-center">Our AI is extracting keywords and optimizing your profile to be 100% ATS friendly using semantic matching.</p>
          </div>
        ) : optimizedResume ? (
          <div className="text-left w-full h-full text-slate-300 relative z-10 space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-700/50 pb-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">{optimizedResume.personal_info.name}</h2>
                <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {optimizedResume.personal_info.email}</span>
                  <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {optimizedResume.personal_info.phone}</span>
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {optimizedResume.personal_info.location}</span>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!optimizedResume) return;
                  const blob = await generatePDF(optimizedResume);
                  const fileName = `${optimizedResume.personal_info.name.replace(/\s+/g, '_')}_Resume.pdf`;

                  // Save to History
                  await addToHistory({
                    jobTitle: optimizedResume.experience[0]?.role || "Optimized Resume",
                    fileName: fileName,
                    timestamp: Date.now(),
                    fileBlob: blob
                  });

                  // Trigger download
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = fileName;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2"
              >
                <FileUp className="w-4 h-4 rotate-180" />
                Download PDF
              </button>
            </div>

            {/* Summary */}
            <section>
              <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Professional Summary
              </h3>
              <p className="text-slate-300 leading-relaxed italic border-l-2 border-blue-500/30 pl-4">
                {optimizedResume.summary}
              </p>
            </section>

            {/* Experience */}
            <section className="space-y-6">
              <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Professional Experience
              </h3>
              {optimizedResume.experience.map((exp, i) => (
                <div key={i} className="relative pl-6 border-l border-slate-800 pb-2">
                  <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                    <h4 className="text-white font-bold">{exp.role}</h4>
                    <span className="text-xs text-slate-500 font-mono bg-slate-900 px-2 py-1 rounded">{exp.duration}</span>
                  </div>
                  <div className="text-sm text-slate-400 mb-3 flex items-center gap-2">
                    <span className="text-blue-300/80 font-medium">{exp.company}</span>
                    <span>•</span>
                    <span>{exp.location}</span>
                  </div>
                  <ul className="space-y-2">
                    {exp.bullets.map((bullet, j) => (
                      <li key={j} className="text-sm text-slate-300 leading-relaxed flex items-start gap-2">
                        <span className="text-blue-500 mt-1.5">•</span>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            {/* Projects */}
            {optimizedResume.projects && optimizedResume.projects.length > 0 && (
              <section className="space-y-6">
                <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> Key Projects
                </h3>
                <div className="grid grid-cols-1 gap-6">
                  {optimizedResume.projects.map((proj, i) => (
                    <div key={i} className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/50">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-white font-bold">{proj.title}</h4>
                        {proj.link && <span className="text-xs text-blue-400 font-mono">{proj.link}</span>}
                      </div>
                      <p className="text-sm text-slate-400 mb-4">{proj.description}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {proj.technologies.map((tech, j) => (
                          <span key={j} className="text-[10px] bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20">
                            {tech}
                          </span>
                        ))}
                      </div>
                      <ul className="space-y-2">
                        {proj.bullets.map((bullet, j) => (
                          <li key={j} className="text-sm text-slate-300 leading-relaxed flex items-start gap-2">
                            <span className="text-blue-500/50 mt-1.5">•</span>
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Skills */}
            <section>
              <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <Code className="w-4 h-4" /> Technical Skills
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {optimizedResume.skills.map((skillGroup, i) => (
                  <div key={i} className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{skillGroup.category}</h4>
                    <div className="flex flex-wrap gap-2">
                      {skillGroup.items.map((item, j) => (
                        <span key={j} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-md border border-slate-700/50">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Achievements & Certifications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Certifications */}
              {optimizedResume.certifications && optimizedResume.certifications.length > 0 && (
                <section>
                  <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Award className="w-4 h-4" /> Certifications
                  </h3>
                  <div className="space-y-4">
                    {optimizedResume.certifications.map((cert, i) => (
                      <div key={i} className="flex justify-between items-start bg-slate-900/30 p-3 rounded-lg border border-slate-800/30">
                        <div>
                          <h4 className="text-white font-bold text-sm">{cert.name}</h4>
                          <p className="text-xs text-slate-500">{cert.issuer}</p>
                        </div>
                        <span className="text-[10px] text-slate-600 font-mono whitespace-nowrap">{cert.date}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Achievements */}
              {optimizedResume.achievements && optimizedResume.achievements.length > 0 && (
                <section>
                  <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Trophy className="w-4 h-4" /> Honors & Awards
                  </h3>
                  <ul className="space-y-3">
                    {optimizedResume.achievements.map((ach, i) => (
                      <li key={i} className="text-sm text-slate-300 leading-relaxed flex items-start gap-2 italic">
                        <span className="text-yellow-500/50 mt-1.5">★</span>
                        {ach}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* Education */}
            <section>
              <h3 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" /> Education
              </h3>
              <div className="space-y-4">
                {optimizedResume.education.map((edu, i) => (
                  <div key={i} className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-bold text-sm">{edu.institution}</h4>
                      <p className="text-xs text-slate-400">{edu.degree}</p>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">{edu.year}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center max-w-sm mx-auto">
            <div className="mb-6 relative">
              <div className="w-32 h-32 rounded-full overflow-hidden border border-white/10 shadow-2xl bg-slate-800/50">
                <video 
                  src="/Ai Bot.mp4" 
                  autoPlay 
                  loop 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/10 blur-3xl -z-10 rounded-full"></div>
            </div>

            <h2 className="text-lg font-medium text-white mb-3">Ready to Analyze</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-12 text-center">
              Upload your resume and paste a job description to start the semantic analysis
            </p>

            <div className="w-full max-w-[200px] flex flex-col items-center space-y-3">
              <div className="w-full h-2 bg-slate-800 rounded-full"></div>
              <div className="w-4/5 h-2 bg-slate-800 rounded-full"></div>
              <div className="w-full h-2 bg-slate-800 rounded-full"></div>
            </div>
          </div>
        )}

        {!optimizedResume && !isAnalyzing && (
          <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-[#0B1120]/50 to-transparent pointer-events-none"></div>
        )}
      </div>
    </div>
  );
}
