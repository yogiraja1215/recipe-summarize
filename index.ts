import 'dotenv/config';
import puppeteer, { Browser, Page } from 'puppeteer';
import { AirtopClient, AirtopError } from '@airtop/sdk';

const AIRTOP_API_KEY = process.env.AIRTOP_API_KEY;

async function run() {
  try {
    const client = new AirtopClient({
      apiKey: AIRTOP_API_KEY,
    });
    const createSessionResponse = await client.sessions.create({
      configuration: {
        timeoutMinutes: 5,
      },
    });

    const sessionId = createSessionResponse.data.id;
    console.log('Created airtop session', sessionId);

    if (!createSessionResponse.data.cdpWsUrl) {
      throw new Error('Unable to get cdp url');
    }

    // Connect to the browser
    const cdpUrl = createSessionResponse.data.cdpWsUrl;
    const browser: Browser = await puppeteer.connect({
      browserWSEndpoint: cdpUrl,
      headers: {
        Authorization: `Bearer ${AIRTOP_API_KEY}` || '',
      },
    });
    console.log('Connected to browser');

    // Open a new page
    const page: Page = await browser.newPage();
    
    /**
     * YOUR CODE HERE
     * 
     * Use the browser instance to navigate to a URL, scrape data, and more.
     */

    // Clean up
    await browser.close();
    await client.sessions.terminate(sessionId);
    console.log('Session deleted');
    process.exit(0);
  } catch (err) {
    if (err instanceof AirtopError) {
      console.log(err.statusCode);
      console.log(err.message);
      console.log(err.body);
    } else {
      console.log(err);
    }
    throw err;
  }
}

run().catch((err) => {
  process.exit(1);
});