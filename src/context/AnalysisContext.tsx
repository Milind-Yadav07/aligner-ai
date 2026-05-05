"use client";

import React, { createContext, useContext, useState } from 'react';

export type StructuredResume = {
  personal_info: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
  };
  summary: string;
  experience: {
    company: string;
    role: string;
    duration: string;
    location: string;
    bullets: string[];
  }[];
  projects: {
    title: string;
    description: string;
    technologies: string[];
    link?: string;
    bullets: string[];
  }[];
  skills: {
    category: string;
    items: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    year: string;
  }[];
  certifications: {
    name: string;
    issuer: string;
    date: string;
  }[];
  achievements: string[];
} | null;

type AnalysisContextType = {
  file: File | null;
  setFile: (file: File | null) => void;
  jobDescription: string;
  setJobDescription: (jd: string) => void;
  optimizedResume: StructuredResume;
  setOptimizedResume: (resume: StructuredResume) => void;
};

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [optimizedResume, setOptimizedResume] = useState<StructuredResume>(null);

  return (
    <AnalysisContext.Provider value={{ 
      file, setFile, 
      jobDescription, setJobDescription, 
      optimizedResume, setOptimizedResume 
    }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error("useAnalysis must be used within an AnalysisProvider");
  }
  return context;
}
