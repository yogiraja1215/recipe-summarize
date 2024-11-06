import 'dotenv/config';
import { AirtopClient, AirtopError } from '@airtop/sdk';
import chalk from 'chalk';

const AIRTOP_API_KEY = process.env.AIRTOP_API_KEY;
const TARGET_URL = 'https://en.wikipedia.org/wiki/A.I._Artificial_Intelligence'; // URL to scrape or summarize

async function run() {
  if (!AIRTOP_API_KEY) {
    throw new Error('AIRTOP_API_KEY is not set');
  }
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

    // Create a new window and navigate to the URL
    const windowResponse = await client.windows.create(
      sessionId,
      { url: TARGET_URL }
    );

    const windowInfo = await client.windows.getWindowInfo(sessionId, windowResponse.data.windowId);
    
    console.log('See a live view of the browser window at', chalk.blueBright(windowInfo.data.liveViewUrl));
    const windowId = windowInfo.data.windowId;

    console.log('Summarizing content...');
    const contentSummary = await client.windows.promptContent(sessionId, windowId, { prompt: 'Summarize the content of the page in 1 paragraph' }); // Note that scrapeContent is also available to do a clean scrape of the page content
    console.log('Content summary:\n\n', chalk.green(contentSummary.data.modelResponse));

    // Clean up. Comment out the next two lines if you want to access the live view after the script completes.
    await client.windows.close(sessionId, windowId);
    await client.sessions.terminate(sessionId);
    console.log(chalk.red('\nSession terminated'));
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