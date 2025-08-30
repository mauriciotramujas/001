/* eslint-env node */
import express from 'express';
import multer from 'multer';
import BackblazeB2 from 'backblaze-b2';

const app = express();
const upload = multer();
app.use(express.json());

function createB2Client(isEvo) {
  const keyId = isEvo ? process.env.B2_KEY_ID_EVO : process.env.B2_KEY_ID;
  const applicationKey = isEvo
    ? process.env.B2_APPLICATION_KEY_EVO
    : process.env.B2_APPLICATION_KEY;
  if (!keyId || !applicationKey) {
    throw new Error('Missing Backblaze credentials');
  }
  return new BackblazeB2({
    applicationKeyId: keyId,
    applicationKey,
  });
}

async function getBucketId(b2, isEvo) {
  await b2.authorize();
  const envBucketId = isEvo ? process.env.B2_BUCKET_ID_EVO : process.env.B2_BUCKET_ID;
  if (envBucketId) {
    return envBucketId;
  }
  const bucketName = isEvo
    ? process.env.B2_BUCKET_NAME_EVO
    : process.env.B2_BUCKET_NAME || 'advocatech2';
  try {
    const buckets = await b2.listBuckets({ accountId: b2.accountId });
    const bucket = buckets.data.buckets.find((b) => b.bucketName === bucketName);
    if (!bucket) throw new Error('Bucket not found');
    return bucket.bucketId;
  } catch (err) {
    if (err.response?.status === 401) {
      console.error(
        'Backblaze listBuckets request returned 401. Review your key permissions.',
      );
    }
    throw err;
  }
}

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const { workspaceId } = req.body;
    const file = req.file;
    if (!workspaceId || !file) {
      return res.status(400).json({ error: 'Missing workspaceId or file' });
    }
    const isEvo = workspaceId.startsWith('evolution-api/');
    const b2 = createB2Client(isEvo);
    const bucketId = await getBucketId(b2, isEvo);
    const fileName = `${workspaceId}/${file.originalname}`;
    const uploadUrl = await b2.getUploadUrl({ bucketId });
    const result = await b2.uploadFile({
      uploadUrl: uploadUrl.data.uploadUrl,
      uploadAuthToken: uploadUrl.data.authorizationToken,
      fileName,
      data: file.buffer,
      contentLength: file.size,
      mime: file.mimetype,
    });
    res.json({ fileId: result.data.fileId, fileName });
  } catch (err) {
    console.error(err);
    console.error(err.response?.data);
    if (err.response?.status === 401) {
      return res
        .status(401)
        .json({ error: 'Backblaze unauthorized – check credentials or permissions' });
    }
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.post('/api/files', async (req, res) => {
  try {
    const { workspaceId } = req.body;
    const isEvo = workspaceId.startsWith('evolution-api/');
    const b2 = createB2Client(isEvo);
    const bucketId = await getBucketId(b2, isEvo);
    const list = await b2.listFileNames({
      bucketId,
      prefix: `${workspaceId}/`,
    });
    const files = list.data.files.map((f) => ({
      fileName: f.fileName.replace(`${workspaceId}/`, ''),
      fileId: f.fileId,
    }));
    res.json({ files });
  } catch (err) {
    console.error(err);
    console.error(err.response?.data);
    if (err.response?.status === 401) {
      return res
        .status(401)
        .json({ error: 'Backblaze unauthorized – check credentials or permissions' });
    }
    res.status(500).json({ error: 'List failed' });
  }
});

app.post('/api/download', async (req, res) => {
  try {
    const { workspaceId, fileName } = req.body;
    const isEvo = workspaceId.startsWith('evolution-api/');
    const b2 = createB2Client(isEvo);
    const bucketName = isEvo
      ? process.env.B2_BUCKET_NAME_EVO
      : process.env.B2_BUCKET_NAME || 'advocatech2';
    await b2.authorize();
    const download = await b2.downloadFileByName({
      bucketName,
      fileName: `${workspaceId}/${fileName}`,
      responseType: 'stream',
    });
    res.setHeader(
      'Content-Type',
      download.headers['content-type'] || 'application/octet-stream',
    );
    download.data.pipe(res);
  } catch (err) {
    console.error(err);
    console.error(err.response?.data);
    if (err.response?.status === 401) {
      return res
        .status(401)
        .json({ error: 'Backblaze unauthorized – check credentials or permissions' });
    }
    res.status(500).json({ error: 'Download failed' });
  }
});

export default app;

if (!process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

