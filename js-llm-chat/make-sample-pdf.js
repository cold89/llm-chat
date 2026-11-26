import fs from 'fs';
import PDFDocument from 'pdfkit';

fs.mkdirSync('./docs', { recursive: true });

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('./docs/sample-healthcare-policy.pdf'));

doc.fontSize(18).text('Horizon Health Gold PPO Policy - 2026', { underline: true });
doc.moveDown();

doc.fontSize(12).text('Policy Number: HHG-2026-88412');
doc.text('Plan Type: Preferred Provider Organization (PPO)');
doc.text('Effective Date: January 1, 2026 - December 31, 2026');
doc.moveDown();

doc.fontSize(14).text('1. Annual Deductibles & Out-of-Pocket Maximums');
doc.fontSize(11)
  .text('- In-Network Individual Deductible: $1,500 per calendar year')
  .text('- Out-of-Network Individual Deductible: $4,500 per calendar year')
  .text('- In-Network Out-of-Pocket Maximum: $5,000 per individual')
  .text('- Out-of-Network Out-of-Pocket Maximum: $12,000 per individual');
doc.moveDown();

doc.fontSize(14).text('2. Copays & Coinsurance (In-Network)');
doc.fontSize(11)
  .text('- Preventive Care & Annual Physical: $0 copay (deductible waived)')
  .text('- Primary Care Physician (PCP) Visit: $25 copay')
  .text('- Specialist Visit: $50 copay')
  .text('- Urgent Care Center: $60 copay')
  .text('- Emergency Room Visit: $300 copay (waived if admitted inpatient)')
  .text('- Diagnostic MRI / CT Scan: 20% coinsurance after deductible (Prior Authorization required)');
doc.moveDown();

doc.fontSize(14).text('3. Waiting Periods & Exclusions');
doc.fontSize(11)
  .text('- Maternity & Newborn Care: 9-month waiting period from initial enrollment date.')
  .text('- Pre-existing Conditions: Covered after a 12-month continuous coverage period.')
  .text('- Cosmetic Surgery, Experimental Treatments, and Routine Adult Dental/Vision are excluded.');
doc.moveDown();

doc.fontSize(14).text('4. Claims & Prior Authorization Rules');
doc.fontSize(11)
  .text('- Out-of-network reimbursement claims must be submitted within 90 days of the date of service.')
  .text('- Prior authorization is mandatory at least 5 business days before non-emergency inpatient hospital stays, MRI/CT imaging, and outpatient surgery.');

doc.end();
console.log('Created ./docs/sample-healthcare-policy.pdf');