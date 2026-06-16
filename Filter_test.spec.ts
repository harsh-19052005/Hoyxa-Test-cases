import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Helper function to quickly navigate and fill the stars/tags 
// so we land on the "Review" step ready to type.
async function setupRatingForm(page: Page) {
  await page.goto('https://sat.meghdo.com/rating_form_entry?teacherData=%7B%22name%22%3A%22Mayank%20Sharma%22%2C%22institute%22%3A%22%22%2C%22city%22%3A%22Thane%22%2C%22subject%22%3A%22Calligraphy%22%2C%22linkedin_profile%22%3A%22%22%2C%22country%22%3A%22IN%22%7D&tutorId=f65a1afa-04ec-4573-95a4-72dea34e005c');
  
  await page.locator('section').filter({ hasText: '1Overall Approval Rating (' }).getByLabel('Rate 5 out of').click();
  
  for (let i = 1; i <= 5; i++) {
    await page.getByRole('button', { name: 'Rate 5 out of' }).nth(i).click();
  }
  
  // Try/catch for the specific UI star button in case it varies
  try {
    await page.locator('div:nth-child(6) > .bg-white > .flex.flex-col.sm\\:flex-row > .flex.flex-col > .flex > button:nth-child(5)').click({ timeout: 2000 });
  } catch (e) {
    // Ignore if redundant
  }

  await page.getByRole('button', { name: 'Next — Tags' }).click();
  await page.getByRole('button', { name: 'Respects Different Opinions' }).click();
  await page.getByRole('button', { name: 'Tough Grader' }).click();
  await page.getByRole('button', { name: 'Provides Useful References' }).click();
  await page.getByRole('button', { name: 'Next — Review' }).click();
}

test('Automated Language Filter Detection Test', async ({ page }) => {
  // 1. Disable the 30-second test timeout so it can run all 900+ comments
  test.setTimeout(0);
  
  // 2. Initial Login
  await page.goto('https://sat.meghdo.com/login');
  await page.getByRole('button', { name: 'Accept All' }).click();
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('3410@gmail.com');
  await page.getByRole('button', { name: 'Send OTP' }).click();
  await page.getByRole('textbox', { name: 'OTP Code' }).fill('123456');
  await page.getByRole('button', { name: 'Verify OTP' }).click();
  await page.getByRole('button', { name: 'Go to Dashboard' }).click();

  // 3. Read the testRate.txt file
  const filePath = path.join(__dirname, 'testRate.txt'); 
  const rawData = fs.readFileSync(filePath, 'utf-8');
  
  // Clean up the list: split by new lines, remove empty lines, and ignore category headers
  const commentsToTest = rawData
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.match(/^(Good|Bad|Ok|Neutral|Negative|Multilingual)/i));

  console.log(`🚀 Starting automated filter test for ${commentsToTest.length} comments...`);

  // 4. Set up the Output Files
  const resultsPath = path.join(__dirname, 'filter_results.csv');
  const allowedTxtPath = path.join(__dirname, 'allowed_comments.txt');
  
  // Create CSV with \ufeff BOM so Excel reads Marathi/Hindi/Spanish perfectly
  fs.writeFileSync(resultsPath, "\ufeffStatus,FlaggedWord,Comment\n");
  
  // Create/Clear the text file for the allowed comments
  fs.writeFileSync(allowedTxtPath, ""); 
  
  console.log(`📝 Full Results CSV: ${resultsPath}`);
  console.log(`📝 Allowed Text File: ${allowedTxtPath}`);

  // 5. Set up the form for the first time
  await setupRatingForm(page);

  const reviewBox = page.getByRole('textbox', { name: 'Share your experience...' });
  const submitBtn = page.getByRole('button', { name: 'Submit Review' });

  // 6. Loop through every single comment in the text file
  for (let i = 0; i < commentsToTest.length; i++) {
    const comment = commentsToTest[i];
    
    // Safely format the comment so commas or quotes don't break the CSV columns
    const safeComment = comment.replace(/"/g, '""');

    // Fill the text box and submit
    await reviewBox.fill(comment);
    await submitBtn.click();

    try {
      // A. Wait for the popup TITLE to appear (max 1.5 seconds)
      await page.getByText('Inappropriate Language Detected').waitFor({ state: 'visible', timeout: 1500 });
      
      // B. Read the text of the ENTIRE screen 
      const allText = await page.locator('body').innerText();
      let flaggedWord = 'Unknown';

      // C. Split the screen text line-by-line
      const lines = allText.split('\n').map(line => line.trim());
      
      // D. Find the preview sentence containing the '█' blocks
      const previewLine = lines.find(line => line.includes('█') && !line.includes('Flagged:'));

      if (previewLine) {
        // E. THE MAGIC TRICK: Compare original words with the censored preview words
        const originalWords = comment.split(/\s+/);
        const censoredWords = previewLine.split(/\s+/);
        
        // Find which words in the original string align with the blocks in the UI string
        const deducedWords = originalWords.filter((word, index) => 
          censoredWords[index] && censoredWords[index].includes('█')
        );
        
        flaggedWord = deducedWords.length > 0 ? deducedWords.join(', ') : 'Extraction failed';
      }

      console.log(`[${i + 1}/${commentsToTest.length}] 🛑 BLOCKED: "${comment.substring(0, 40)}..."`);
      console.log(`      🚩 Extracted: ${flaggedWord}`);
      
      // Save the blocked result directly to the CSV
      fs.appendFileSync(resultsPath, `"BLOCKED","${flaggedWord}","${safeComment}"\n`);

    } catch (error) {
      // F. If it times out, the popup did NOT appear, meaning the comment passed.
      console.log(`[${i + 1}/${commentsToTest.length}] ✅ ALLOWED: "${comment.substring(0, 40)}..."`);
      
      // Save the allowed result to the CSV
      fs.appendFileSync(resultsPath, `"ALLOWED","None","${safeComment}"\n`);
      
      // NEW: Save the raw comment to the separate text file
      fs.appendFileSync(allowedTxtPath, `${comment}\n`);
    }

    // 7. THE BULLETPROOF RESET 🛡️
    // Force a fresh reload of the form so the next loop always starts from a clean state
    await setupRatingForm(page);
  }

  console.log('🎉 Filter testing complete!');
  console.log('📂 Check "filter_results.csv" and "allowed_comments.txt" for your data.');
});