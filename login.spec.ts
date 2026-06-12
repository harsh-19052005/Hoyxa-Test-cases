import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import fs from 'fs';

test('User signup, setup, and teacher rating flow', async ({ page }) => {

  const firstName    = faker.person.firstName();
  const lastName     = faker.person.lastName();
  const email        = faker.internet.email();
  const phone        = faker.string.numeric(10);
  const pincode      = faker.location.zipCode('######');
  const age          = faker.number.int({ min: 18, max: 25 }).toString();

  const teacherName     = faker.person.fullName();
  const teacherEmail    = faker.internet.email();
  const teacherPhone    = faker.string.numeric(10);
  const teacherLinkedIn = `https://linkedin.com/in/${firstName.toLowerCase()}`;

  const testData = {
    userEmail:    email,
    userPassword: 'Students@12345',
    userOtp:      '123456',
    teacherName:  teacherName,
  };
  fs.writeFileSync('test-data.json', JSON.stringify(testData, null, 2));

  await page.goto('https://sat.meghdo.com/login');
  await page.getByRole('button', { name: 'Accept All' }).click();

  await page.getByRole('button', { name: 'Sign Up' }).click();

  await page.getByRole('radio', { name: 'Learn (Student)' }).check();

  await page.getByRole('combobox').first().selectOption('IN');

  await page.getByRole('combobox').nth(1).selectOption('Kerala');

  await page.getByRole('textbox', { name: 'e.g.' }).last().fill(pincode);

  await page.getByPlaceholder('Enter your age').fill(age);

  await page.locator('label').filter({ hasText: 'I confirm that the' }).click();

  await page.getByRole('button', { name: 'Continue →' }).click();

  await page.getByRole('textbox', { name: 'you@example.com' }).fill(email);
  await page.getByRole('button', { name: 'Send Verification Code' }).click();

  await page.getByRole('textbox', { name: '000000' }).fill('123456');
  await page.getByRole('button', { name: 'Verify Code' }).click();

  await page.getByRole('textbox', { name: 'Jane' }).fill(`${firstName} `);
  await page.getByRole('textbox', { name: 'Jane' }).press('Tab');

  await page.getByRole('textbox', { name: 'Doe' }).fill(`${lastName} `);

  await page.getByRole('textbox', { name: 'e.g. +' }).fill(phone);

  await page.getByRole('textbox', { name: '••••••••' }).first().fill('Students@12345');

  await page.getByText('Confirm Password').click();
  await page.getByRole('textbox', { name: '••••••••' }).nth(1).fill('Students@12345');

  await page.getByRole('button', { name: 'Create Account' }).click();

  await page.waitForSelector('text=Before You Start', { timeout: 10000 });
  await page.waitForTimeout(500);

  await page.getByText('I agree to the Student Service Agreement & Platform Policies').click();
  await page.waitForTimeout(300);

  await page.getByText('I understand sessions are recorded').click();
  await page.waitForTimeout(300);

  await page.getByText('I understand MEGHDO is a marketplace and does not guarantee outcomes').click();
  await page.waitForTimeout(300);

  await page.getByText('I agree to platform conduct rules').click();
  await page.waitForTimeout(300);

  await page.getByText('I consent to personalised recommendations and ads based on my learning interests').click();
  await page.waitForTimeout(300);

  await page.getByText('I consent to anonymised data usage for improving AI and platform features').click();
  await page.waitForTimeout(400);

  const continueButton = page.getByRole('button', { name: 'Continue & Create Account →' });
  await expect(continueButton).toBeEnabled({ timeout: 10000 });
  await continueButton.click();

  await page.getByRole('button', { name: '+ English' }).click();
  await page.getByRole('button', { name: '+ Music' }).click();
  await page.getByRole('button', { name: '+ Economics' }).click();
  await page.getByRole('button', { name: '+ Biology' }).click();
  await page.getByRole('button', { name: '+ Chess' }).click();
  await page.getByRole('button', { name: '+ Drawing' }).click();

  await page.getByRole('textbox', { name: 'Add a custom subject…' }).fill('nursing ');

  await page.getByRole('textbox', { name: 'e.g. Pass JEE, improve spoken' }).fill('pass jee');

  await page.getByRole('button', { name: 'Finish Setup →' }).click();

  await page.goto('https://sat.meghdo.com/dashboard');
  await page.getByRole('link', { name: 'Rate Teacher' }).click();

  await page.getByRole('button', { name: '+ Add Your Teacher' }).click();

  await page.locator('.react-select__input-container').first().click();
  await page.locator('.react-select__input-container input').first().fill('mumbai');
  await page.getByRole('option', { name: 'Mumbai, Maharashtra' }).click();

  await page
    .locator(
      '.institute-select-default > .react-select-container > .react-select__control' +
      ' > .react-select__value-container > .react-select__input-container'
    )
    .click();
  await page
    .locator('.institute-select-default .react-select__input-container input')
    .fill('mumbai');
  await page.getByRole('option', { name: 'University of Mumbai (Mumbai)' }).click();

  await page.getByRole('textbox', { name: 'Teacher name' }).fill(teacherName);

  await page
    .locator(
      'div:nth-child(5) > .relative > .css-b62m3t-container > .css-5serba-control' +
      ' > .css-hlgwow > .css-19bb58m'
    )
    .click();
  await page.getByText('3D Printing & Modelling').click();
  await page.getByRole('option', { name: 'ACT Preparation' }).click();
  await page.getByText('AI in Robotics').click();

  await page.locator('body').click();

  await page.getByRole('textbox', { name: 'Email address' }).fill(teacherEmail);
  await page.getByRole('textbox', { name: 'Email address' }).press('Tab');
  await page.getByRole('textbox', { name: 'LinkedIn profile URL' }).fill(teacherLinkedIn);
  await page.getByRole('textbox', { name: 'Phone number' }).fill(teacherPhone);

  await page.getByRole('button', { name: 'Add teacher to database' }).click();

  const teacherPayload = {
    tutorId:        '89d62b41-6126-453d-820a-5f6dd2524eb4',
    name:           teacherName,
    institute:      'University of Mumbai',
    city:           'Mumbai, Maharashtra',
    subject:        '3D Printing & Modelling, ACT Preparation, AI in Robotics',
    studentCreated: true,
  };
  const encodedTeacherData = encodeURIComponent(JSON.stringify(teacherPayload));
  await page.goto(`https://sat.meghdo.com/rating_form_entry?teacherData=${encodedTeacherData}`);

  await page
    .locator('section')
    .filter({ hasText: '1Overall Approval Rating (' })
    .getByLabel('Rate 5 out of')
    .click();
  await page.getByRole('button', { name: 'Rate 5 out of' }).nth(1).click();
  await page.getByRole('button', { name: 'Rate 5 out of' }).nth(3).click();
  await page.getByRole('button', { name: 'Rate 5 out of' }).nth(2).click();
  await page.getByRole('button', { name: 'Rate 5 out of' }).nth(4).click();
  await page.getByRole('button', { name: 'Rate 5 out of' }).nth(5).click();

  await page
    .locator(
      'div:nth-child(6) > .flex.flex-col.sm\\:flex-row > .flex.flex-col > .flex > button:nth-child(5)'
    )
    .click();

  await page.getByRole('button', { name: 'Submit & Share' }).click();

  await page.getByRole('link', { name: 'Rate Teacher' }).click();
  await page
    .getByLabel("View Mayank Sharma's profile")
    .getByRole('button', { name: 'Rate' })
    .click();

  await page
    .locator('section')
    .filter({ hasText: '1Overall Approval Rating (' })
    .getByLabel('Rate 5 out of')
    .click();
  await page.getByRole('button', { name: 'Rate 5 out of' }).nth(1).click();
  await page.getByRole('button', { name: 'Rate 5 out of' }).nth(2).click();
  await page.getByRole('button', { name: 'Rate 5 out of' }).nth(3).click();
  await page.getByRole('button', { name: 'Rate 5 out of' }).nth(4).click();
  await page.getByRole('button', { name: 'Rate 5 out of' }).nth(5).click();

  await page
    .locator(
      'div:nth-child(6) > .flex.flex-col.sm\\:flex-row > .flex.flex-col > .flex > button:nth-child(5)'
    )
    .click();

  await page.getByRole('button', { name: 'Next — Tags' }).click();
  await page.getByRole('button', { name: 'Encourages Publishing/Research' }).click();
  await page.getByRole('button', { name: 'Accessible During Office Hours' }).click();
  await page.getByRole('button', { name: 'Inspires Academic Interest' }).click();

  await page.getByRole('button', { name: 'Next — Review' }).click();
  await page.getByRole('button', { name: 'Submit Review' }).click();
});