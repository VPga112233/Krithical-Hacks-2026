/**
 * Configuration for VouchAI professions, filter criteria, and LLM constants.
 */

export const OCCUPATION_GROUPS = {
  "Finance & Accounting": [
    "Chartered Accountant (CA)", "Accountant", "Auditor", "Financial Analyst",
    "Tax Consultant", "Company Secretary (CS)", "Cost Accountant",
  ],
  "IT & Data": [
    "Software Developer", "Web Developer", "Data Analyst", "Data Scientist",
    "AI/ML Engineer", "Cybersecurity Analyst",
  ],
  "Engineering": [
    "Civil Engineer", "Mechanical Engineer", "Electrical Engineer",
    "Electronics Engineer", "Chemical Engineer",
  ],
  "Business & Operations": [
    "Business Analyst", "Project Manager", "Operations Manager", "Management Consultant",
  ],
  "Marketing & Sales": [
    "Digital Marketer", "SEO Specialist", "Sales Executive", "Marketing Analyst",
  ],
  "Human Resources": ["HR Manager", "Recruiter", "Talent Acquisition Specialist"],
  "Legal & Compliance": ["Lawyer", "Legal Associate", "Compliance Analyst"],
  "Healthcare": ["Doctor", "Pharmacist", "Physiotherapist", "Clinical Research Associate"],
  "Education & Research": ["Teacher", "Lecturer", "Tutor", "Research Assistant"],
  "Design & Media": ["UI/UX Designer", "Graphic Designer", "Video Editor", "Content Writer"],
  "Supply Chain": ["Logistics Coordinator", "Procurement Specialist", "Supply Chain Analyst"],
};

export const OCCUPATIONS = Object.values(OCCUPATION_GROUPS).flat();

export const EXPERIENCE = {
  "1+ years": 1,
  "3+ years": 3,
  "5+ years": 5,
  "7+ years": 7,
  "10+ years": 10,
};

export const FILTERS = {
  "Finance & Accounting": {
    quals: [
      "CA / CPA / CMA", "CFA", "Company Secretary (CS)", "CFE", "DISA / IT Audit",
      "IFRS / Ind-AS Certification", "Taxation / GST Certification", "Power BI / Data Analytics",
    ],
    areas: [
      "Taxation", "GST", "Statutory Audit", "Internal Audit", "Accounting & Bookkeeping",
      "Corporate Finance", "Forensic Accounting", "Company Law / Compliance",
      "International Taxation", "Startup Advisory", "Banking & Finance", "Valuation",
    ],
  },
  "IT & Data": {
    quals: [
      "Computer Science / IT Degree", "Cloud Certification", "AWS / Azure / GCP Certification",
      "Cybersecurity Certification", "Data Analytics Certification", "Machine Learning Certification",
      "Relevant Professional Certification",
    ],
    areas: [
      "Web Development", "Backend Development", "Frontend Development", "Mobile Apps",
      "Data Analytics", "Machine Learning / AI", "Cloud Computing", "Cybersecurity",
      "DevOps", "Database Administration", "IT Support", "Software Testing",
    ],
  },
  "Engineering": {
    quals: [
      "Relevant Engineering Degree", "Professional Engineer License", "PMP Certification",
      "AutoCAD / CAD Certification", "Safety Certification", "Quality Certification",
    ],
    areas: [
      "Design", "Construction", "Maintenance", "Manufacturing", "Quality Control",
      "Project Engineering", "Structural Engineering", "Electrical Systems", "Process Engineering",
    ],
  },
  "Business & Operations": {
    quals: [
      "MBA / Management Degree", "PMP Certification", "Lean Six Sigma", "Agile / Scrum Certification",
      "Business Analysis Certification", "Relevant Professional Certification",
    ],
    areas: [
      "Business Strategy", "Project Management", "Operations", "Process Improvement",
      "Business Analysis", "Risk Management", "Change Management", "Management Consulting",
    ],
  },
  "Marketing & Sales": {
    quals: [
      "Google Ads Certification", "Google Analytics Certification", "HubSpot Certification",
      "SEO Certification", "Marketing Degree", "Relevant Professional Certification",
    ],
    areas: [
      "SEO", "Paid Advertising", "Content Marketing", "Social Media", "Email Marketing",
      "Lead Generation", "Market Research", "Brand Strategy", "Sales Strategy", "Analytics",
    ],
  },
  "Human Resources": {
    quals: [
      "HR / Business Degree", "SHRM / HRCI Certification", "Recruitment Certification",
      "Payroll Certification", "Relevant Professional Certification",
    ],
    areas: [
      "Recruitment", "Talent Acquisition", "Employee Relations", "Payroll",
      "Learning & Development", "HR Operations", "Performance Management",
    ],
  },
  "Legal & Compliance": {
    quals: [
      "LLB / Law Degree", "Bar Admission / License", "LLM", "Compliance Certification",
      "Mediation Certification", "Relevant Professional Certification",
    ],
    areas: [
      "Corporate Law", "Contract Law", "Litigation", "Employment Law", "Intellectual Property",
      "Regulatory Compliance", "Privacy / Data Protection", "Dispute Resolution",
    ],
  },
  "Healthcare": {
    quals: [
      "Relevant Professional Degree", "Professional Registration / License", "Specialty Certification",
      "Clinical Research Certification", "First Aid / BLS Certification",
    ],
    areas: [
      "Primary Care", "Clinical Practice", "Pharmacy", "Rehabilitation", "Physiotherapy",
      "Clinical Research", "Public Health", "Patient Education",
    ],
  },
  "Education & Research": {
    quals: [
      "Teaching Qualification / License", "PhD / Research Degree", "NET / SET Qualification",
      "Subject-Specific Certification", "Relevant Professional Certification",
    ],
    areas: [
      "School Education", "Higher Education", "Tutoring", "Curriculum Development",
      "Academic Research", "STEM Education", "Language Teaching", "Special Education",
    ],
  },
  "Design & Media": {
    quals: [
      "Design / Media Degree", "UI/UX Certification", "Adobe Certification",
      "Video Editing Certification", "Portfolio / Professional Certification",
    ],
    areas: [
      "UI/UX Design", "Graphic Design", "Branding", "Video Editing", "Motion Graphics",
      "Content Writing", "Copywriting", "Illustration", "Product Design",
    ],
  },
  "Supply Chain": {
    quals: [
      "Supply Chain / Logistics Degree", "APICS / ASCM Certification", "Procurement Certification",
      "Lean Six Sigma", "Relevant Professional Certification",
    ],
    areas: [
      "Logistics", "Procurement", "Inventory Management", "Warehouse Operations",
      "Demand Planning", "Supplier Management", "Distribution", "Supply Chain Analytics",
    ],
  },
};

export const QUAL_NAMES = {
  "DISA": "DISA (Diploma in Information Systems Audit)",
  "CFA": "CFA (Chartered Financial Analyst)",
  "CPA": "CPA (Certified Public Accountant)",
  "CMA": "CMA (Cost / Management Accountant)",
  "CS": "CS (Company Secretary)",
  "LLB": "LLB (Bachelor of Laws)",
  "CFE": "CFE (Certified Fraud Examiner)",
};

export const JUNK = [
  "facebook.com", "instagram.com", "twitter.com", "x.com", "youtube.com",
  "pinterest.com", "reddit.com", "quora.com", "wikipedia.org", "tiktok.com"
];

export const FAST_MODEL = process.env.GROQ_FAST_MODEL || "openai/gpt-oss-20b";
export const SMART_MODEL = process.env.GROQ_SMART_MODEL || "openai/gpt-oss-120b";
export const MAX_CHARS = 7000;
export const CACHE_FILE = "cache.json";

export function occupationGroup(occupation) {
  for (const [group, occupations] of Object.entries(OCCUPATION_GROUPS)) {
    if (occupations.includes(occupation)) return group;
  }
  return "Business & Operations";
}
