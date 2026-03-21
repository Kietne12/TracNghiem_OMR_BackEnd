import { detectOMRMarkings } from './src/utils/omrDetectorEnhanced.js';
import fs from 'fs';
import path from 'path';

async function test() {
  console.log('🧪 Testing OMR Detector...\n');
  
  const testImagePath = 'samples/omr_sample_filled.png';
  
  // First convert PDF to PNG if PNG doesn't exist
  if (!fs.existsSync(testImagePath)) {
    console.log('⚠️  PNG not found, trying PDF...');
    const pdfPath = 'samples/omr_sample_filled.pdf';
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ No test image found');
      process.exit(1);
    }
    console.log('📄 Using PDF:', pdfPath);
    try {
      const result = await detectOMRMarkings(pdfPath);
      console.log('\n✅ Detection Result:');
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('❌ Error:', err.message);
      process.exit(1);
    }
  } else {
    console.log('📸 Using PNG:', testImagePath);
    try {
      const result = await detectOMRMarkings(testImagePath);
      console.log('\n✅ Detection Result:');
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('❌ Error:', err.message);
      process.exit(1);
    }
  }
}

test();
