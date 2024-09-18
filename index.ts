import 'dotenv/config';
import puppeteer from 'puppeteer';
import { AirtopClient, AirtopError } from '@airtop/sdk';

const AIRTOP_API_KEY = process.env.AIRTOP_API_KEY;

async function run() {
  try {
    const client = new AirtopClient({
      airtopToken: AIRTOP_API_KEY,
    });
    const createSessionResponse = await client.sessions.post({
      configuration: {
        timeout: 5, // terminate session after 5 minutes
      },
    });
    let sessionStatus = createSessionResponse.session.status;
    console.log('Created airtop session.  Status:', sessionStatus);


    // Wait for session to start
    if (sessionStatus !== 'running') {
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const updatedSession = await client.sessions.get(createSessionResponse.session.id);
        sessionStatus = updatedSession.session.status;
        if (updatedSession.session.status === 'running') {
          break;
        }
      }
    }

    if (sessionStatus !== 'running') {
      throw new Error('Session did not start');
    }
    if (!createSessionResponse.connectionInfo?.cdpWsUrl) {
      throw new Error('Unable to get cdp url');
    }

    // Connect to the browser
    const cdpUrl = createSessionResponse.connectionInfo?.cdpWsUrl;
    const browser = await puppeteer.connect({
      browserWSEndpoint: cdpUrl,
      headers: {
        'x-airtop-token': AIRTOP_API_KEY || '',
      },
    });
    console.log('Connected to browser');

    // Open a new page
    const page = await browser.newPage();
    
    /**
     * YOUR CODE HERE
     * 
     * Use the browser instance to navigate to a URL, scrape data, and more.
     */

    // Clean up
    await browser.close();
    await client.sessions.delete(createSessionResponse.session.id);
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