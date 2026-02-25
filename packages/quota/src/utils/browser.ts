import open from 'open';

export async function openUrl(url: string): Promise<void> {
  try {
    await open(url);
  } catch (error) {
    console.error(`Failed to open browser: ${error}`);
    console.log(`Please manually open: ${url}`);
  }
}