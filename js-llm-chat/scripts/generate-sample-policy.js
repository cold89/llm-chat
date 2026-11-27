// scripts/generate-sample-policy.js
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

fs.mkdirSync('./docs', { recursive: true });
const outPath = path.resolve('./docs/sample-healthcare-policy.pdf');

const doc = new PDFDocument({ margin: 50 });
doc.pipe(fs.createWriteStream(outPath));

const sections = [
  {
    heading: 'Section 1: Policy Overview & Eligibility',
    body: `Policy Number: HC-2026-8841
Effective Date: January 1, 2026
Plan Name: ClearCare Comprehensive Health Plan

This policy provides inpatient hospitalization, day-care procedures, emergency care, and select outpatient benefits for enrolled primary members and eligible dependents (legal spouse and dependent children up to age 25). Coverage requires active enrollment and timely premium payments. In-network providers offer cashless settlement upon pre-authorization; out-of-network claims require reimbursement submission within 30 days of discharge.`,
  },
  {
    heading: 'Section 2: Deductibles, Copays & Out-of-Pocket Maximums',
    body: `Annual Deductible: $500 per individual per policy year, or $1,500 per family per policy year. The deductible applies to covered inpatient and outpatient services unless explicitly waived.
Coinsurance & Copays: After meeting the annual deductible, the plan covers 80% of eligible in-network costs and 60% of eligible out-of-network costs. Standard primary care visits carry a $25 copay; urgent care visits carry a $50 copay; emergency room visits carry a $150 copay (waived if admitted inpatient).
Out-of-Pocket Maximum: $4,000 per individual or $8,000 per family per policy year. Once reached, eligible in-network covered expenses are paid at 100% for the remainder of the policy year.`,
  },
  {
    heading: 'Section 3: Waiting Periods & Pre-Existing Conditions',
    body: `Initial Waiting Period: A 30-day waiting period applies from the policy start date for all non-accidental illnesses. Accidental injuries are covered from day one of active coverage.
Pre-Existing Diseases (PED): Conditions diagnosed or treated within 36 months prior to the policy start date are subject to a 24-month waiting period before inpatient or specialized care related to that condition is covered.
Specific Procedure Waiting Period: Cataract surgery, joint replacement, and hernia repair are subject to a 12-month waiting period unless required due to an acute accident.`,
  },
  {
    heading: 'Section 4: Inpatient Hospitalization, Surgery & Physiotherapy',
    body: `Inpatient Hospitalization: Covers room rent, nursing care, surgeon fees, anesthesia, diagnostic tests, and prescribed in-hospital medications for medically necessary stays of 24 hours or more.
Post-Hospitalization & Physiotherapy: Out-of-hospital physiotherapy and rehabilitation are covered up to 20 sessions per policy year when prescribed by a treating physician following an approved inpatient surgery or hospitalization. Routine wellness massage or long-term maintenance therapy without a post-hospitalization care plan is not covered.
Day-Care Procedures: Specified surgeries and treatments requiring less than 24 hours of hospitalization due to medical advances are covered up to the sum insured.`,
  },
  {
    heading: 'Section 5: Exclusions & Non-Covered Services',
    body: `The following services and expenses are excluded from coverage under this policy:
1. Cosmetic or aesthetic procedures, including rhinoplasty, liposuction, or elective skin treatments not required to repair a recent accidental injury.
2. Experimental, investigational, or unapproved medical treatments and clinical trials.
3. Dental care and routine vision refraction/eyeglasses, except emergency dental trauma repair within 72 hours of an accident.
4. Self-inflicted injuries, substance abuse rehabilitation unless mandated by applicable law, and injuries resulting from hazardous or professional sports without a rider.`,
  },
  {
    heading: 'Section 6: Claims Process & Pre-Authorization',
    body: `Planned Hospitalization: Submit a pre-authorization request through an in-network hospital at least 48 hours prior to admission.
Emergency Admission: Notify the insurer or third-party administrator within 24 hours of emergency admission.
Reimbursement Claims: Submit itemized bills, discharge summary, diagnostic reports, and doctor prescriptions within 30 days of discharge. Incomplete submissions may delay settlement until missing documents are received.`,
  },
];

doc.fontSize(18).text('ClearCare Comprehensive Health Policy', { underline: true });
doc.moveDown(0.5);
doc.fontSize(10).fillColor('#555555').text('Sample Document for RAG Chunking & Semantic Search Testing');
doc.fillColor('#000000').moveDown();

for (const sec of sections) {
  doc.fontSize(13).text(sec.heading);
  doc.moveDown(0.3);
  doc.fontSize(10.5).text(sec.body, { lineGap: 3 });
  doc.moveDown(1);
}

doc.end();
console.log('Generated:', outPath);