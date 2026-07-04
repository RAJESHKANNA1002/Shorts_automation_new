import fetch from 'node-fetch';
import { config } from '../config.js';

const GRAPH = 'https://graph.facebook.com/v19.0';

// NOTE: Instagram's Graph API requires a publicly reachable video_url (it fetches
// the file itself) - it does not accept raw file uploads from your machine/CI runner.
// You already use Cloudinary in the parking_system project - reuse that free tier
// here: upload the finished mp4 there first, then pass the resulting URL in.

export async function uploadToInstagramReels({ videoUrl, caption }) {
  // Step 1: create a media container
  const createRes = await fetch(
    `${GRAPH}/${config.meta.igUserId}/media?` +
      new URLSearchParams({
        media_type: 'REELS',
        video_url: videoUrl,
        caption,
        access_token: config.meta.accessToken,
      })
  );
  const createData = await createRes.json();
  if (createData.error) throw new Error(`IG container failed: ${JSON.stringify(createData.error)}`);
  const containerId = createData.id;

  // Step 2: poll until the container has finished processing the video
  let status = 'IN_PROGRESS';
  while (status === 'IN_PROGRESS') {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await fetch(
      `${GRAPH}/${containerId}?fields=status_code&access_token=${config.meta.accessToken}`
    );
    const statusData = await statusRes.json();
    status = statusData.status_code;
  }
  if (status !== 'FINISHED') throw new Error(`IG container ended in status: ${status}`);

  // Step 3: publish
  const publishRes = await fetch(
    `${GRAPH}/${config.meta.igUserId}/media_publish?` +
      new URLSearchParams({ creation_id: containerId, access_token: config.meta.accessToken })
  );
  return publishRes.json();
}

export async function uploadToFacebookReels({ videoUrl, description }) {
  const res = await fetch(
    `${GRAPH}/${config.meta.pageId}/video_reels?` +
      new URLSearchParams({
        upload_phase: 'finish',
        video_url: videoUrl,
        description,
        access_token: config.meta.accessToken,
      })
  );
  return res.json();
}
