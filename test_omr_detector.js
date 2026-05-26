import fs from "fs";
import path from "path";
import { detectOMRMarkings } from "./src/utils/omrDetectorEnhanced.js";

async function test() {
  console.log("Testing OMR detector...\n");

  const candidates = [
    "samples/generated/omr_sample_filled.png",
    "samples/omr_sample_filled.png",
    "samples/omr_sample_filled.pdf",
  ];

  const testImagePath = candidates.find((filePath) => fs.existsSync(filePath));

  if (!testImagePath) {
    console.error("No test image found.");
    console.error("Run `npm run omr:sample` first to create a synthetic sheet.");
    process.exit(1);
  }

  console.log(`Using sample: ${path.resolve(testImagePath)}`);

  try {
    const result = await detectOMRMarkings(testImagePath);
    console.log("\nDetection result:");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`Detection failed: ${err.message}`);
    process.exit(1);
  }
}

test();
