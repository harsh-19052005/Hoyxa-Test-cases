
import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
const STUDENT_COUNT = 500;
const DATA_FILE     = path.resolve(__dirname, 'test-data.json');
const LOCK_FILE     = path.resolve(__dirname, 'test-data.lock');
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
  lastBatchRun: string | null;
  tutors:       any[];
  students:     StudentCredential[];
}
function acquireLock(timeoutMs = 10_000): void {
  const start = Date.now();
  while (fs.existsSync(LOCK_FILE)) {
    if (Date.now() - start > timeoutMs) { fs.rmSync(LOCK_FILE, { force: true }); break; }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
  }
  fs.writeFileSync(LOCK_FILE, String(process.pid));
}
function releaseLock(): void { fs.rmSync(LOCK_FILE, { force: true }); }

function loadStore(): DataStore {
  if (!fs.existsSync(DATA_FILE)) return { lastBatchRun: null, tutors: [], students: [] };
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as DataStore; }
  catch { return { lastBatchRun: null, tutors: [], students: [] }; }
}

function appendStudent(cred: StudentCredential): void {
  acquireLock();
  try {
    const store = loadStore();
    if (!store.tutors)   store.tutors   = [];
    if (!store.students) store.students = [];
    store.students.push(cred);
    store.lastBatchRun = cred.timestamp;
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } finally { releaseLock(); }
}

const ri = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const rc = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const FIRST_NAMES = ['Rohan','Arjun','Amit','Rahul','Vijay','Kiran','Suresh','Deepak','Manish','Rajesh','Aakash','Nikhil','Saurabh','Varun','Tushar','Ankit','Gaurav','Harsh','Mohit','Sameer'];
const LAST_NAMES  = ['Mane','Patil','Sharma','Verma','Gupta','Joshi','Desai','Nair','Iyer','Mehta','Singh','Rao','Kulkarni','Mishra','Pandey','Dubey','Tripathi','Shukla','Yadav','Chaudhary'];
const MH_PINS     = ['400','401','402','410','411','412','421','422','423','431'];

const REVIEW_TEXTS = [
  'Excellent teaching style, very clear explanations.',
  'Really enjoyed the sessions, highly recommended!',
  'Very patient and knowledgeable teacher.',
  'Great experience overall, learned a lot.',
  'Outstanding tutor, goes above and beyond.',
  'Clear, concise and very effective teaching.',
  'Wonderful experience, will book again!',
  'Highly skilled and engaging teacher.',
  'Nice teaching, very approachable.',
  'Amazing tutor, very helpful and insightful.',
];

const TAG_SETS = [
  ['Passionate About Teaching★','Research-Oriented','Guidance on Projects'],
  ['Pop Quizzes Keep Students','Lecture Heavy','Group Work Focus'],
  ['Research-Oriented','Guidance on Projects'],
  ['Lecture Heavy','Passionate About Teaching★'],
  ['Group Work Focus','Guidance on Projects'],
];

const SUBJECTS = [
  ['+ Mathematics','+ Physics'],
  ['+ Science','+ History'],
  ['+ Mathematics','+ Science','+ History'],
  ['+ Physics','+ History'],
  ['+ Mathematics','+ Physics','+ Science'],
];

function randomPhone(): string {
  return rc(['6','7','8','9']) + Array.from({length: 9}, () => ri(0,9)).join('');
}
function randomPassword(): string {
  const U='ABCDEFGHJKLMNPQRSTUVWXYZ', L='abcdefghjkmnpqrstuvwxyz', D='23456789', S='@#$!%*?&';
  const pick = (s:string,n:number) => Array.from({length:n},()=>s[ri(0,s.length-1)]).join('');
  return (pick(U,2)+pick(L,4)+pick(D,2)+pick(S,2)).split('').sort(()=>Math.random()-0.5).join('');
}
function buildEmail(first:string, last:string, worker:number): string {
  return `${first.toLowerCase()}${rc(['.','_',''])}${last.toLowerCase()}${ri(100,999)}w${worker}@gmail.com`;
}

for (const studentNumber of Array.from({length: STUDENT_COUNT}, (_, i) => i + 1)) {
  test(`Register & rate – student ${studentNumber} of ${STUDENT_COUNT}`, async ({ page }, testInfo) => {
    
    // Extend timeout for heavy multi-step E2E flow
    test.setTimeout(90_000);
    
    const workerIndex = testInfo.workerIndex;
    const firstName  = rc(FIRST_NAMES);
    const lastName   = rc(LAST_NAMES);
    const email      = buildEmail(firstName, lastName, workerIndex);
    const password   = randomPassword();
    const phone      = randomPhone();
    const age        = String(ri(18, 40));
    const pincode    = rc(MH_PINS) + String(ri(0,999)).padStart(3,'0');
    const runId      = `student_${studentNumber}_w${workerIndex}_${Date.now()}`;
    const reviewText = rc(REVIEW_TEXTS);
    const tags       = rc(TAG_SETS);
    const subjects   = rc(SUBJECTS);

    console.log(`\n[Worker ${workerIndex}] 🚀 Student ${studentNumber}: ${email}`);

    await page.goto('https://pl.meghdo.com/login');
    await page.getByRole('button', { name: 'Close' }).click();

    await page.getByRole('button', { name: 'Sign Up' }).click();
    await page.locator('label').filter({ hasText: 'Learn (Student)' }).click();

    await page.getByRole('combobox').first().selectOption('IN');
    await page.getByRole('combobox').nth(1).selectOption('Karnataka');
    await page.getByRole('textbox', { name: 'e.g.' }).fill(pincode);
    await page.getByPlaceholder('Enter your age').fill(age);
    await page.getByRole('checkbox', { name: 'I confirm that the' }).check();
    await page.getByRole('button', { name: 'Continue →' }).click();

    await page.getByRole('textbox', { name: 'you@example.com' }).fill(email);
    await page.getByRole('button', { name: 'Send Verification Code' }).click();
    await page.getByRole('textbox', { name: '000000' }).fill('123456'); // Replace with live OTP reader
    await page.getByRole('button', { name: 'Verify Code' }).click();

    await page.getByRole('textbox', { name: 'Jane' }).fill(firstName);
    await page.getByRole('textbox', { name: 'Jane' }).press('Tab');
    await page.getByRole('textbox', { name: 'Doe' }).fill(lastName);
    await page.getByRole('textbox', { name: 'e.g. +' }).fill(phone);
    await page.getByRole('textbox', { name: '••••••••' }).first().fill(password);
    await page.getByRole('textbox', { name: '••••••••' }).nth(1).fill(password);
    await page.getByRole('button', { name: 'Create Account' }).click();

    await page.locator('label').filter({ hasText: 'I agree to the Student' }).click();
    await page.locator('label').filter({ hasText: 'I understand sessions are' }).click();
    await page.locator('label').filter({ hasText: 'I understand MEGHDO is a' }).click();
    await page.locator('label').filter({ hasText: 'I agree to platform conduct' }).click();
    await page.locator('label').filter({ hasText: 'I consent to personalised' }).click();
    await page.locator('label').filter({ hasText: 'I consent to anonymised data' }).click();
    await page.getByRole('button', { name: 'Continue & Create Account →' }).click();

    for (const subj of subjects) {
      await page.getByRole('button', { name: subj }).click();
    }
    await page.getByRole('button', { name: 'Finish Setup →' }).click();

    await page.getByRole('button', { name: '🔍 Find Tutors' }).click();
    await page.getByRole('button', { name: "View Shraddha akansha Tiwari'" }).click();

    const page1Promise = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'View Full Profile' }).click();
    const page1 = await page1Promise;

    await page1.getByRole('link', { name: 'Rate Teacher' }).click();
    await page1.getByLabel("View Shraddha akansha Tiwari'").getByRole('button', { name: 'Rate' }).click();

    await page1.locator('section').filter({ hasText: '1Overall Approval Rating (' }).getByLabel('Rate 5 out of').click();
    await page1.getByRole('button', { name: 'Rate 5 out of' }).nth(1).click();
    await page1.getByRole('button', { name: 'Rate 5 out of' }).nth(2).click();
    await page1.getByRole('button', { name: 'Rate 5 out of' }).nth(3).click();
    await page1.getByRole('button', { name: 'Rate 5 out of' }).nth(4).click();
    await page1.getByRole('button', { name: 'Rate 5 out of' }).nth(5).click();
    await page1.locator('div:nth-child(6) > .flex.flex-col.sm\\:flex-row > .flex.flex-col > .flex > button:nth-child(5)').click();
    await page1.getByRole('button', { name: 'Next — Tags' }).click();

    for (const tag of tags) {
      await page1.getByRole('button', { name: tag }).click({ force: true });
    }
    await page1.getByRole('button', { name: 'Next — Review' }).click();

    await page1.getByRole('textbox', { name: 'Share your experience...' }).fill(reviewText);
    await page1.getByRole('button', { name: 'Submit Review' }).click({ force: true });

    await page1.getByRole('button', { name: `Profile menu for ${firstName}` }).click();
    await page1.getByRole('menuitem', { name: 'Profile' }).click();

    // Persist credentials
    appendStudent({ type:'student', runId, timestamp: new Date().toISOString(), workerIndex, firstName, lastName, email, password, phone, age, pincode });
    console.log(`[Worker ${workerIndex}] ✅ Student ${studentNumber} saved & rated: ${email}`);
  });
}