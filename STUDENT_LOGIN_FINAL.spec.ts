import { test, Page, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
const DATA_FILE = path.resolve(__dirname, 'test-data.json');
interface StudentCredential {
  type:        'student';
  runId:       string;
  timestamp:   string;
  workerIndex: number;
  firstName:   string;
  lastName:    string;
  email:       string;
  password:    string;
  phone:       string;
  age:         string;
  pincode:     string;
}

interface DataStore {
  tutors:   any[];
  students: StudentCredential[];
}
function loadLatestStudents(): StudentCredential[] {
  if (!fs.existsSync(DATA_FILE)) throw new Error(' test-data.json not found. Run STUDENT_REG_AND_RATING.spec.ts first.');
  const store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as DataStore;
  if (!store.students?.length) throw new Error(' No student credentials found. Run STUDENT_REG_AND_RATING.spec.ts first.');
  const timestamps = store.students.map(c => new Date(c.timestamp).getTime());
  const maxTs      = Math.max(...timestamps);
  const batch      = store.students.filter(c => maxTs - new Date(c.timestamp).getTime() <= 5 * 60 * 1000);
  console.log(`\n Loaded ${batch.length} students from latest batch`);
  batch.forEach((c, i) => console.log(`   [${i+1}] ${c.email}`));
  return batch;
}
async function submitTeacherRating(
  page: Page,
  teacherName: string,
  ratingStar: number,
  tags: string[],
  reviewText: string,
  idx: number,
  cred: StudentCredential
) {
  await page.getByRole('link', { name: 'Rate Teacher' }).click();
  const rateButton = page.getByLabel(`View ${teacherName}'`).getByRole('button', { name: 'Rate' });
  try {
    await rateButton.waitFor({ state: 'visible', timeout: 3000 });
  } catch (error) {
    // 3. If it times out (teacher not found), log it and exit early
    console.log(`[Student ${idx+1}] ⏭️ Teacher '${teacherName}' not found. Skipping.`);
    return; 
  }
  await rateButton.click();
  await page.locator('section')
    .filter({ hasText: '1Overall Approval Rating (' })
    .getByLabel(`Rate ${ratingStar} out of`)
    .click();
  for (let i = 1; i <= 5; i++) {
    await page.getByRole('button', { name: `Rate ${ratingStar} out of` }).nth(i).click();
  }
  try {
    await page.locator(`div:nth-child(6) > .flex.flex-col.sm\\:flex-row > .flex.flex-col > .flex > button:nth-child(${ratingStar})`)
              .click({ timeout: 3000 });
  } catch (error) {
    console.log(`[Student ${idx+1}] ⏭️ Extra star button not found, moving to Tags...`);
  }
  await page.getByRole('button', { name: 'Next — Tags' }).click();
  for (const tag of tags) {
    await page.getByRole('button', { name: tag }).click({ force: true });
  }
  await page.getByRole('button', { name: 'Next — Review' }).click();
  await page.getByRole('textbox', { name: 'Share your experience...' }).fill(reviewText);
  await page.getByRole('button', { name: 'Submit Review' }).click({ force: true });
  await page.locator('div').nth(3).click();
  console.log(`[Student ${idx+1}] ✅ Rating submitted for ${teacherName} (${ratingStar} stars): ${cred.email}`);
}
const rc = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const REVIEW_TEXTS = [
  'Excellent teaching style, very clear explanations.',
  'Really enjoyed the sessions, highly recommended!',
  'Very patient and knowledgeable teacher.',
  'Great experience overall, learned a lot.',
  'Outstanding tutor, goes above and beyond.',
  'Clear, concise and very effective teaching.',
  'Wonderful experience, will book again!',
  'Highly skilled and engaging teacher.',
];
const TAG_SETS = [
  ['Pop Quizzes Keep Students','Lecture Heavy','Group Work Focus'],
  ['Passionate About Teaching★','Research-Oriented','Guidance on Projects'],
  ['Pop Quizzes Keep Students','Research-Oriented'],
  ['Lecture Heavy','Passionate About Teaching★'],
  ['Group Work Focus','Guidance on Projects','Lecture Heavy'],
];
const allStudents = loadLatestStudents();
for (let idx = 0; idx < allStudents.length; idx++) {
  const cred = allStudents[idx];
  test(`Login & rate – student ${idx + 1}: ${cred.email}`, async ({ page, browser }) => {
    test.setTimeout(150_000); 
    const reviewText = rc(REVIEW_TEXTS);
    const tags       = rc(TAG_SETS);
    console.log(`\n[Student ${idx+1}]  Logging in: ${cred.email}`);
    await page.goto('https://pl.meghdo.com/login');
    if (idx === 0) {
      console.log(`[UI Check] 📸 Capturing Login Page UI...`);
      const loginUrl = page.url();
      const mobileLoginCtx = await browser.newContext({ ...devices['iPhone 13'] });
      const mobileLoginPg = await mobileLoginCtx.newPage();
      await mobileLoginPg.goto(loginUrl);
      await mobileLoginPg.screenshot({ path: `screenshots/1-login-mobile.png`, fullPage: true });
      await mobileLoginCtx.close();
      const tabletLoginCtx = await browser.newContext({ ...devices['iPad Pro 11'] });
      const tabletLoginPg = await tabletLoginCtx.newPage();
      await tabletLoginPg.goto(loginUrl);
      await tabletLoginPg.screenshot({ path: `screenshots/1-login-tablet.png`, fullPage: true });
      await tabletLoginCtx.close();
    }
    await page.getByRole('button', { name: 'Customize' }).click();
    await page.getByRole('checkbox', { name: 'Analytics Cookies Help us' }).check();
    await page.getByRole('checkbox', { name: 'Functional Cookies Remember' }).check();
    await page.getByRole('checkbox', { name: 'Marketing Cookies' }).check();
    await page.getByRole('button', { name: 'Save Preferences' }).click();
    await page.getByRole('textbox', { name: 'Email' }).fill(cred.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(cred.password);
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await page.getByRole('textbox', { name: 'Email' }).fill(cred.email);
    await page.getByRole('button', { name: 'Send OTP' }).click();
    await page.getByRole('textbox', { name: 'OTP Code' }).fill('123456'); // Replace with live OTP reader
    await page.getByRole('button', { name: 'Verify OTP' }).click();
    await page.getByRole('link', { name: 'Rate Teacher' }).waitFor({ state: 'visible' });
    if (idx === 0) {
      console.log(`[UI Check] 📸 Capturing Dashboard UI...`);
      const dashboardUrl = page.url();
      const sessionState = await page.context().storageState(); 
      const mobileDashCtx = await browser.newContext({ ...devices['iPhone 13'], storageState: sessionState });
      const mobileDashPg = await mobileDashCtx.newPage();
      await mobileDashPg.goto(dashboardUrl);
      await mobileDashPg.screenshot({ path: `screenshots/2-dashboard-mobile.png`, fullPage: true });
      await mobileDashCtx.close();
      const tabletDashCtx = await browser.newContext({ ...devices['iPad Pro 11'], storageState: sessionState });
      const tabletDashPg = await tabletDashCtx.newPage();
      await tabletDashPg.goto(dashboardUrl);
      await tabletDashPg.screenshot({ path: `screenshots/2-dashboard-tablet.png`, fullPage: true });
      await tabletDashCtx.close();
    }
    if (idx === 0) {
      console.log(`[UI Check] 📸 Navigating to Rate Teacher Page to capture UI...`);
      await page.getByRole('link', { name: 'Rate Teacher' }).click();
      await page.getByRole('button', { name: 'Rate' }).first().waitFor({ state: 'visible' });
      const rateTeacherUrl = page.url();
      const sessionState = await page.context().storageState(); 
      const mobileRateCtx = await browser.newContext({ ...devices['iPhone 13'], storageState: sessionState });
      const mobileRatePg = await mobileRateCtx.newPage();
      await mobileRatePg.goto(rateTeacherUrl);
      await mobileRatePg.screenshot({ path: `screenshots/3-rate-teacher-mobile.png`, fullPage: true });
      await mobileRateCtx.close();
      const tabletRateCtx = await browser.newContext({ ...devices['iPad Pro 11'], storageState: sessionState });
      const tabletRatePg = await tabletRateCtx.newPage();
      await tabletRatePg.goto(rateTeacherUrl);
      await tabletRatePg.screenshot({ path: `screenshots/3-rate-teacher-tablet.png`, fullPage: true });
      await tabletRateCtx.close();
    }
    await submitTeacherRating(page, 'Shraddha akansha Tiwari', 5, tags, reviewText, idx, cred);
    await submitTeacherRating(page, 'Neha Kumari Sharma', 1, tags, reviewText, idx, cred);
    await submitTeacherRating(page, 'Swati Devi Singh', 2, tags, reviewText, idx, cred);
    await submitTeacherRating(page, 'Omkar kadam anil', 4, tags, reviewText, idx, cred);
    await page.goto('https://pl.meghdo.com/tutors');
    await page.getByRole('link', { name: 'Find Expert Tutors' }).click();
    await page.getByRole('button', { name: 'View Omkar kadam anil\'s' }).click();
    const page1Promise = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'View Full Profile' }).click();
    const page1 = await page1Promise;
    await page1.getByRole('button', { name: 'Book a Session Now →' }).click();
    await page1.getByRole('button', { name: 'One instrument technique ₹' }).click();
    await page1.getByText('Jun · 4:30pm – 5pm').click();
    await page1.getByRole('button', { name: 'Book Session', exact: true }).click();
    await page1.getByRole('button', { name: 'REFER20' }).click();
    await page1.getByRole('button', { name: 'Apply' }).click();
    await page1.getByRole('button', { name: /Pay ₹.* securely/i }).click();
    await page1.getByRole('link', { name: 'Net Banking' }).click();
    await page1.getByRole('button', { name: 'State Bank Of India State' }).click();
    await page1.waitForTimeout(1000);
    await page1.getByRole('button', { name: 'Proceed to Pay' }).click();
    await page1.getByText('SUCCESS').click();
    await page1.getByRole('textbox', { name: 'OTP' }).click();
    await page1.getByRole('textbox', { name: 'OTP' }).fill('111000');
    await page1.getByRole('button', { name: 'Submit' }).click();
    await page.goto('https://pl.meghdo.com/dashboard');
      });
}